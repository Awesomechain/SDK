// Runs against the live site and public RPCs: AWESOME_LIVE=1 npx vitest run test/live.test.ts
import { describe, expect, it } from "vitest";
import { createPublicClient, http } from "viem";
import { bsc } from "viem/chains";
import { AwesomeClient, CHAINS, NATIVE, dripLeaf, feeVaultAbi, quote, readCoin, readConfigVersion } from "../src/index.js";

const live = !!process.env.AWESOME_LIVE;
const awesome = new AwesomeClient();
const pub = createPublicClient({ chain: bsc, transport: http(process.env.BSC_RPC_URL ?? "https://bsc-rpc.publicnode.com") });

describe.skipIf(!live)("live API and chain", () => {
  it("reads coins, config and chains", async () => {
    const coins = await awesome.coins({ sort: "mcap", limit: 3 });
    expect(coins.length).toBeGreaterThan(0);
    const cfg = await awesome.config();
    expect(cfg.chainId).toBe(56);
    expect(cfg.deployment).toBeTruthy();
    const chains = await awesome.chainsStatus();
    expect(chains.map((c) => c.key)).toContain("base");
    const main = await awesome.mainToken();
    expect(main.address).toBe("0x9665f094d862f4d5c221843e019b463d3c607777");
  }, 60_000);

  it("quotes through the API and on chain alike", async () => {
    const [coin] = await awesome.coins({ sort: "mcap", limit: 1, pair: "bnb" });
    const q = await awesome.quoteSwap({ coin: coin!.address, amountIn: 10n ** 15n });
    const onchain = await quote(pub, "bsc", [NATIVE, coin!.address], 10n ** 15n);
    expect(BigInt(q.expectedOut)).toBeGreaterThan(0n);
    expect(onchain[1]).toBeGreaterThan(0n);
    const state = await readCoin(pub, "bsc", coin!.address);
    expect(state.totalSupply).toBeLessThanOrEqual(10n ** 27n);
    expect(state.symbol).toBe(coin!.symbol);
    expect(await readConfigVersion(pub, "bsc")).toBeGreaterThan(0n);
  }, 60_000);

  it("matches the vault's dripLeaf", async () => {
    const a = "0x1111111111111111111111111111111111111111" as const;
    const onchain = await pub.readContract({ address: CHAINS.bsc.contracts.feeVault, abi: feeVaultAbi, functionName: "dripLeaf", args: [a, 3n, a, 77n] });
    expect(dripLeaf(a, 3n, a, 77n)).toBe(onchain);
  }, 60_000);

  it("reads Base and Solana", async () => {
    expect(Array.isArray(await awesome.chain("base").coins({ limit: 2 }))).toBe(true);
    expect(Array.isArray(await awesome.solana.coins({ limit: 2 }))).toBe(true);
  }, 60_000);
});
