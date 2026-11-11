import { describe, expect, it } from "vitest";
import { keccak256, encodeAbiParameters, getAddress } from "viem";
import {
  AwesomeApiError,
  AwesomeClient,
  CHAINS,
  EVM_CHAIN_KEYS,
  FEE_SPLIT,
  LAUNCH_TYPES,
  NATIVE,
  checkSquad,
  dripLeaf,
  getChain,
  launchCall,
  launchParams,
  readSse,
  swapCall,
  withSlippage,
} from "../src/index.js";

const A = "0x1111111111111111111111111111111111111111" as const;
const B = "0x2222222222222222222222222222222222222222" as const;

function mockFetch(handler: (url: string, init: RequestInit) => { status?: number; body: unknown }) {
  const calls: { url: string; init: RequestInit }[] = [];
  const f = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const r = handler(url, init);
    return new Response(JSON.stringify(r.body), { status: r.status ?? 200, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
  return { f, calls };
}

describe("chains", () => {
  it("has nine EVM deployments with checksummed addresses", () => {
    expect(EVM_CHAIN_KEYS).toHaveLength(9);
    for (const c of Object.values(CHAINS)) {
      for (const a of Object.values(c.contracts)) expect(getAddress(a!)).toBe(a);
      expect(getChain(c.chainId).key).toBe(c.key);
    }
    expect(CHAINS.bsc.launchWithFee).toBe(false);
    expect(CHAINS.base.apiPath).toBe("/api/c/base");
    expect(() => getChain(1)).toThrow();
  });
  it("splits every fee 60 / 10 / 10 / 20", () => {
    expect(Object.values(FEE_SPLIT).reduce((a, b) => a + b, 0)).toBe(100);
    expect(LAUNCH_TYPES.map((t) => t.key)).toEqual(["devBag", "flywheel", "bullRun", "holderDrip", "squad"]);
  });
});

describe("client", () => {
  it("builds query strings, chain prefixes and JSON bodies with bigints", async () => {
    const { f, calls } = mockFetch(() => ({ body: [] }));
    const c = new AwesomeClient({ fetch: f, baseUrl: "https://example.test/" });
    await c.coins({ sort: "mcap", limit: 5, q: undefined });
    await c.chain("base").trades(A, { limit: 10 });
    await c.solana.coin("So11111111111111111111111111111111111111112");
    await c.buildSwap({ coin: A, amountIn: 10n ** 16n, from: B });
    expect(calls.map((x) => x.url)).toEqual([
      "https://example.test/api/coins?sort=mcap&limit=5",
      `https://example.test/api/c/base/coins/${A}/trades?limit=10`,
      "https://example.test/api/c/solana/coins/So11111111111111111111111111111111111111112",
      "https://example.test/api/tx/swap",
    ]);
    expect(JSON.parse(String(calls[3]!.init.body))).toEqual({ coin: A, amountIn: "10000000000000000", from: B });
    expect(c.chain("bsc")).toBe(c);
  });
  it("throws AwesomeApiError with the server's message", async () => {
    const { f } = mockFetch(() => ({ status: 404, body: { error: "coin not found" } }));
    const err = await new AwesomeClient({ fetch: f }).coin(A).catch((e) => e);
    expect(err).toBeInstanceOf(AwesomeApiError);
    expect(err.status).toBe(404);
    expect(err.message).toBe("coin not found");
  });
});

describe("on-chain helpers", () => {
  it("builds launch params with defaults and checks them", () => {
    const p = launchParams({ name: "My Coin", symbol: "MINE", configVersion: 3n, firstBuy: 5n });
    expect(p).toMatchObject({ host: NATIVE, creator: NATIVE, recipient: NATIVE, hostIn: 5n, launchType: 0, squad: [] });
    expect(() => launchParams({ name: "x".repeat(33), symbol: "A", configVersion: 1n })).toThrow(/name/);
    expect(() => launchParams({ name: "A", symbol: "A", configVersion: 1n, launchType: 2, host: A })).toThrow(/Bull Run/);
    expect(() => launchParams({ name: "A", symbol: "A", configVersion: 1n, squad: [{ wallet: A, bps: 10_000 }] })).toThrow(/squad/);
    expect(() => checkSquad([{ wallet: A, bps: 5_000 }, { wallet: B, bps: 4_000 }])).toThrow(/10000/);
    checkSquad([{ wallet: A, bps: 6_000 }, { wallet: B, bps: 4_000 }]);
  });
  it("picks launch / launchWithFee and pays native first buys as value", () => {
    const p = launchParams({ name: "A", symbol: "A", configVersion: 1n, firstBuy: 7n });
    expect(launchCall("bsc", p)).toMatchObject({ functionName: "launch", value: 7n, address: CHAINS.bsc.contracts.factory });
    expect(launchCall("base", p, 300)).toMatchObject({ functionName: "launchWithFee", args: [p, 300] });
    expect(() => launchCall("bsc", p, 300)).toThrow(/launchWithFee/);
    expect(() => launchCall("base", p, 1000)).toThrow(/25-500/);
  });
  it("builds swaps and slippage", () => {
    expect(swapCall("bsc", { path: [NATIVE, A], amountIn: 9n, minOut: 1n, recipient: B }).value).toBe(9n);
    expect(swapCall("base", { path: [A, NATIVE], amountIn: 9n, minOut: 1n, recipient: B }).value).toBe(0n);
    expect(withSlippage(10_000n, 100)).toBe(9_900n);
    expect(withSlippage(1n, 100)).toBe(1n);
  });
  it("hashes drip leaves like OpenZeppelin's StandardMerkleTree", () => {
    const enc = encodeAbiParameters([{ type: "address" }, { type: "uint256" }, { type: "address" }, { type: "uint256" }], [A, 1n, B, 5n]);
    expect(dripLeaf(A, 1n, B, 5n)).toBe(keccak256(keccak256(enc)));
  });
});

describe("sse", () => {
  it("parses events split across chunks", async () => {
    const text = 'event: trade\ndata: {"a":1}\n\n: keep-alive\n\nevent: block\ndata: {"indexedBlock":5}\r\n\r\n';
    const enc = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(enc.encode(text.slice(0, 17)));
        c.enqueue(enc.encode(text.slice(17)));
        c.close();
      },
    });
    const out = [];
    for await (const m of readSse(body)) out.push(m);
    expect(out).toEqual([
      { event: "trade", data: '{"a":1}', id: undefined },
      { event: "block", data: '{"indexedBlock":5}', id: undefined },
    ]);
  });
});
