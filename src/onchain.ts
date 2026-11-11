import { encodeAbiParameters, keccak256, concat, type Address, type Hex } from "viem";
import { awesomeFactoryAbi, awesomeRouterAbi, awesomeTokenAbi, awesomeUniRouterAbi, feeVaultAbi, hookAbi } from "./abis.js";
import { getChain, NATIVE, type EvmChainKey } from "./chains.js";
import type { LaunchTypeId, SquadMember } from "./types.js";

/**
 * Any viem public client (createPublicClient), on any chain. Typed structurally so chain-specific clients (OP-stack
 * chains such as Base) fit too.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyArgs = any;
export interface ReadClient {
  readContract(args: AnyArgs): Promise<unknown>;
  simulateContract(args: AnyArgs): Promise<{ result: unknown }>;
  multicall(args: AnyArgs): Promise<unknown[]>;
}

/** The factory's LaunchParams struct. */
export interface LaunchParams {
  name: string;
  symbol: string;
  metadataURI: string;
  host: Address;
  creator: Address;
  recipient: Address;
  hostIn: bigint;
  minCoinOut: bigint;
  configVersion: bigint;
  deadline: bigint;
  launchType: number;
  squad: readonly { wallet: Address; bps: number }[];
}

/** `amount` less `bps` basis points (at least 1 when `amount` > 0). */
export function withSlippage(amount: bigint, bps: number): bigint {
  const out = (amount * BigInt(10_000 - bps)) / 10_000n;
  return out === 0n && amount > 0n ? 1n : out;
}

/** A unix deadline `seconds` from now. */
export const deadlineIn = (seconds = 900): bigint => BigInt(Math.floor(Date.now() / 1000) + seconds);

/** The factory's current settings version: put it in LaunchParams.configVersion. */
export async function readConfigVersion(client: ReadClient, chain: EvmChainKey): Promise<bigint> {
  const c = getChain(chain);
  return client.readContract({ address: c.contracts.factory, abi: awesomeFactoryAbi, functionName: "configVersion" }) as Promise<bigint>;
}

/** Checks a squad the way the vault does: 2-5 distinct non-zero wallets, each bps > 0, adding up to 10000. */
export function checkSquad(squad: readonly SquadMember[]): void {
  if (squad.length < 2 || squad.length > 5) throw new Error("a Squad has 2 to 5 wallets");
  if (new Set(squad.map((m) => m.wallet.toLowerCase())).size !== squad.length) throw new Error("Squad wallets must be different");
  if (squad.some((m) => m.wallet.toLowerCase() === NATIVE)) throw new Error("a Squad wallet can't be the zero address");
  if (squad.some((m) => !Number.isInteger(m.bps) || m.bps <= 0)) throw new Error("every Squad share must be a positive whole number of bps");
  if (squad.reduce((s, m) => s + m.bps, 0) !== 10_000) throw new Error("Squad shares (bps) must add up to 10000");
}

/**
 * LaunchParams with sensible defaults: native pair, Dev Bag, caller as creator and recipient, no first buy,
 * a 15-minute deadline.
 */
export function launchParams(p: {
  name: string;
  symbol: string;
  configVersion: bigint;
  metadataURI?: string;
  host?: Address;
  creator?: Address;
  recipient?: Address;
  firstBuy?: bigint;
  minCoinOut?: bigint;
  deadline?: bigint;
  launchType?: LaunchTypeId;
  squad?: readonly SquadMember[];
}): LaunchParams {
  const enc = new TextEncoder();
  const name = p.name.trim();
  const symbol = p.symbol.trim();
  if (!name || enc.encode(name).length > 32) throw new Error("name must be 1-32 bytes");
  if (!symbol || enc.encode(symbol).length > 16) throw new Error("symbol must be 1-16 bytes");
  if (p.metadataURI && enc.encode(p.metadataURI).length > 512) throw new Error("metadataURI must be at most 512 bytes");
  const launchType = p.launchType ?? 0;
  const squad = p.squad ?? [];
  if (launchType === 4) checkSquad(squad);
  else if (squad.length) throw new Error("squad is only for launch type 4 (Squad)");
  if (launchType === 2 && p.host && p.host !== NATIVE) throw new Error("Bull Run needs a native pair");
  return {
    name,
    symbol,
    metadataURI: p.metadataURI ?? "",
    host: p.host ?? NATIVE,
    creator: p.creator ?? NATIVE,
    recipient: p.recipient ?? NATIVE,
    hostIn: p.firstBuy ?? 0n,
    minCoinOut: p.minCoinOut ?? 0n,
    configVersion: p.configVersion,
    deadline: p.deadline ?? deadlineIn(900),
    launchType,
    squad: squad.map((m) => ({ wallet: m.wallet, bps: m.bps })),
  };
}

/**
 * A launch call for viem's simulateContract / writeContract. Native pairs pay the first buy as value. With
 * `feeBps` (25-500) it calls launchWithFee (every chain but BNB Chain).
 */
export function launchCall(chain: EvmChainKey, params: LaunchParams, feeBps?: number) {
  const c = getChain(chain);
  const value = params.host === NATIVE ? params.hostIn : 0n;
  if (feeBps !== undefined) {
    if (!c.launchWithFee) throw new Error(`${c.name}'s factory has no launchWithFee`);
    if (!Number.isInteger(feeBps) || feeBps < 25 || feeBps > 500) throw new Error("feeBps must be 25-500");
    return { address: c.contracts.factory, abi: awesomeFactoryAbi, functionName: "launchWithFee", args: [params, feeBps], value } as const;
  }
  return { address: c.contracts.factory, abi: awesomeFactoryAbi, functionName: "launch", args: [params], value } as const;
}

const routerAbiOf = (chain: EvmChainKey) => (getChain(chain).venue === "pancakeswap-infinity" ? awesomeRouterAbi : awesomeUniRouterAbi);

/** Quotes a router path (simulated, nothing is sent). Returns the amount after each token of the path. */
export async function quote(client: ReadClient, chain: EvmChainKey, path: readonly Address[], amountIn: bigint): Promise<bigint[]> {
  const { result } = await client.simulateContract({
    address: getChain(chain).contracts.router,
    abi: routerAbiOf(chain),
    functionName: "quoteExactIn",
    args: [path, amountIn],
  });
  return [...(result as readonly bigint[])];
}

/** A swap call for simulateContract / writeContract. Paths start or end with NATIVE for native trades. */
export function swapCall(
  chain: EvmChainKey,
  p: { path: readonly Address[]; amountIn: bigint; minOut: bigint; recipient: Address; deadline?: bigint },
) {
  if (p.path.length < 2) throw new Error("a path has at least two tokens");
  return {
    address: getChain(chain).contracts.router,
    abi: routerAbiOf(chain),
    functionName: "swapExactIn",
    args: [p.path, p.amountIn, p.minOut, p.recipient, p.deadline ?? deadlineIn(600)],
    value: p.path[0] === NATIVE ? p.amountIn : 0n,
  } as const;
}

/** A coin's on-chain state in one multicall. */
export async function readCoin(client: ReadClient, chain: EvmChainKey, coin: Address) {
  const c = getChain(chain).contracts;
  const [info, graduated, feePips, sniperEnd, pot, name, symbol, supply, metadataURI] = await client.multicall({
    allowFailure: false,
    contracts: [
      { address: c.factory, abi: awesomeFactoryAbi, functionName: "getCoin", args: [coin] },
      { address: c.hook, abi: hookAbi, functionName: "graduated", args: [coin] },
      { address: c.hook, abi: hookAbi, functionName: "currentFee", args: [coin] },
      { address: c.hook, abi: hookAbi, functionName: "sniperWindowEnd", args: [coin] },
      { address: c.feeVault, abi: feeVaultAbi, functionName: "creatorOwed", args: [coin] },
      { address: coin, abi: awesomeTokenAbi, functionName: "name" },
      { address: coin, abi: awesomeTokenAbi, functionName: "symbol" },
      { address: coin, abi: awesomeTokenAbi, functionName: "totalSupply" },
      { address: coin, abi: awesomeTokenAbi, functionName: "metadataURI" },
    ],
  });
  const i = info as { host: Address; depth: number; launchType: number; creator: Address; launcher: Address; launchedAt: number };
  return {
    coin,
    name: name as string,
    symbol: symbol as string,
    metadataURI: metadataURI as string,
    totalSupply: supply as bigint,
    host: i.host,
    depth: i.depth,
    launchType: i.launchType as LaunchTypeId,
    creator: i.creator,
    launcher: i.launcher,
    launchedAt: i.launchedAt,
    graduated: graduated as boolean,
    /** Pips: 10000 = 1%. */
    currentFeePips: Number(feePips),
    sniperWindowEnd: Number(sniperEnd),
    /** The creator share waiting in the vault, pair-token wei. */
    pot: pot as bigint,
  };
}

/** A Holder Drip leaf, exactly as FeeVault.dripLeaf computes it (OpenZeppelin StandardMerkleTree layout). */
export function dripLeaf(coin: Address, epoch: bigint, account: Address, amount: bigint): Hex {
  const inner = keccak256(
    encodeAbiParameters([{ type: "address" }, { type: "uint256" }, { type: "address" }, { type: "uint256" }], [coin, epoch, account, amount]),
  );
  return keccak256(concat([inner]));
}
