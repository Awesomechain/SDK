import type { Address, Hex } from "viem";

/** A decimal string holding a bigint (wei, token units). Parse with BigInt(). */
export type Big = string;

/** 0 Dev Bag · 1 Flywheel · 2 Bull Run · 3 Holder Drip · 4 Squad. */
export type LaunchTypeId = 0 | 1 | 2 | 3 | 4;

/** What a coin is paired with: native, or a kind of pairing token (BNB Chain). */
export type PairKind = "bnb" | "fourmeme" | "flap" | "lockedlp" | "stock" | "coin";

export interface SquadMember {
  wallet: Address;
  /** Share in basis points; a squad's shares add up to 10000. */
  bps: number;
}

/** A coin, as lists return it. Amounts are wei strings; prices are pair-token wei per one whole coin. */
export interface Coin {
  address: Address;
  /** The pair token (0x000…000 = the chain's native coin). */
  host: Address;
  /** "BNB", "ETH", … for native pairs. */
  hostSymbol: string;
  pair: PairKind;
  /** The top of the pair chain. */
  root: Address;
  depth: number;
  /** Who receives the creator share now (FeeVault.creatorOf). */
  creator: Address;
  launcher: Address;
  name: string;
  symbol: string;
  metadataUri: string;
  image: string | null;
  description: string | null;
  links: Record<string, string> | null;
  poolId: string | null;
  hostIsToken0: boolean | null;
  /** Graduation target, pair-token wei. */
  target: Big;
  graduationHost: Big;
  /** Pair tokens raised on the curve so far. */
  hostRaised: Big;
  coinSold: Big;
  /** Progress to graduation, 0..10000. */
  progressBps: number;
  graduated: boolean;
  graduatedAt: string | null;
  priceHost: Big;
  /** Price in native wei per whole coin. */
  priceNative: Big;
  /** USD × 1e18. */
  marketCapUsd: Big;
  volumeHost: Big;
  feesHost: Big;
  tradeCount: number;
  launchedAt: string;
  lastTradeAt: string | null;
  /** 24 h price change as a fraction (0.38 = +38%). */
  change24h?: number | null;
  volume24hHost?: Big;
  athPriceHost?: Big;
  burnedHost?: Big;
  launchType: LaunchTypeId;
  /** The coin's own fee in bps when its creator picked one; null = the platform fee (1%). */
  feeBps?: number | null;
  squad: SquadMember[] | null;
}

export interface Pairing {
  address: Address;
  symbol: string;
  name: string;
  kind: Exclude<PairKind, "bnb">;
  status: "listed" | "paused" | "unlisted" | "unregistered";
  [k: string]: unknown;
}

/** One coin with its detail page's extras. */
export interface CoinDetail extends Coin {
  ancestry: Pairing[];
  burnsByToken: { token: Address; symbol: string; amount: Big }[];
  holdersApprox: number;
  burnCount?: number;
  buys24h?: number;
  sells24h?: number;
  /** Creator share credited on this coin so far, in the pair token. */
  creatorEarned?: Big;
}

export interface Trade {
  txHash: Hex;
  logIndex?: number;
  block: number;
  ts: string;
  coin: Address;
  coinSymbol: string;
  host: Address;
  hostSymbol: string;
  trader: Address;
  isBuy: boolean;
  hostAmount: Big;
  coinAmount: Big;
  fee: Big;
  /** Fee rate in pips (10000 = 1%). */
  feeRate: number;
  priceHost: Big;
}

export interface Burn {
  txHash: Hex;
  block: number;
  ts: string;
  token: Address;
  symbol: string;
  amount: Big;
  viaBurn: boolean;
}

/** Candle seconds. */
export type CandleInterval = 1 | 15 | 60 | 300 | 900 | 3600 | 14400 | 86400;

/** A candle in pair-token wei per whole coin; `t` is unix seconds; `v` is pair-token wei traded. */
export interface Candle {
  t: number;
  o: Big;
  h: Big;
  l: Big;
  c: Big;
  v: Big;
}

export interface Holder {
  address: Address;
  balance: Big;
  /** Share of supply, 0..1. */
  share: number;
}

export interface Stats {
  hosts: number;
  coins: number;
  graduated: number;
  trades24h: number;
  volume24hNative: Big;
  burnedUsd: Big;
  burnEvents24h: number;
}

/** GET /config: the chain, its deployment and the live launch settings. */
export interface ChainConfig {
  network: string;
  chainId: number;
  rpcUrl: string;
  rpcUrls: string[];
  explorerUrl: string | null;
  deployed: boolean;
  deployment: Record<string, unknown>;
  factoryConfig: {
    targetNative: Big;
    feeBps: number;
    sniperFeeBps: number;
    sniperWindow: number;
    sniperMaxBuyBps: number;
    launchesPaused: boolean;
    configVersion: number;
    [k: string]: unknown;
  } | null;
  registryParams: { minMarketCapUsd: Big; [k: string]: unknown } | null;
  /** Native/USD. */
  nativeUsd: number | null;
  indexedBlock: number;
  headBlock: number;
  [k: string]: unknown;
}

/** GET /api/c: every chain the server runs. */
export interface ChainStatus {
  key: string;
  name: string;
  symbol: string;
  live: boolean;
  id?: number;
  factory?: Address;
  router?: Address;
  vault?: Address;
  indexedBlock?: number;
  headBlock?: number;
  problem: string | null;
  [k: string]: unknown;
}

export interface SearchResult {
  coins: Coin[];
  hosts: Pairing[];
}

/** A transaction for a wallet to sign and send as is. */
export interface UnsignedTx {
  to: Address;
  data: Hex;
  /** Wei, decimal string. */
  value: Big;
  chainId: number;
  description?: string;
  /** Send with at least this gas limit (some calls use try/catch, so estimates can be low). */
  gas?: Big;
}

export interface SwapQuote {
  path: Address[];
  amountIn: Big;
  amounts: Big[];
  expectedOut: Big;
  minOut: Big;
  slippageBps: number;
}

export interface SwapTx {
  quote: SwapQuote;
  /** An ERC-20 approval to send first (null when paying in native or already approved). */
  approval: UnsignedTx | null;
  tx: UnsignedTx;
}

export interface LaunchTx {
  tx: UnsignedTx;
  launchType: LaunchTypeId;
  buyWei: Big;
  pathToHost: Address[];
  minHostOut: Big;
  configVersion: number;
}

export interface Claim {
  coin: Address;
  symbol: string;
  host: Address;
  hostSymbol: string;
  vault: Address;
  owed: Big;
  claimed: Big;
  recipient: Address;
  /** creator: Dev Bag · squad: a Squad share · drip: Holder Drip leaves. */
  via: "creator" | "squad" | "drip";
  launchType: LaunchTypeId;
  /** `owed` valued in native wei. */
  owedNative: Big;
}

export interface Claims {
  address: Address;
  claims: Claim[];
  totalOwedNative: Big;
  /** Ready transactions that pay everything owed. Anyone may send them; they pay the rightful wallet. */
  txs: UnsignedTx[];
}

export interface SquadInfo {
  coin: Address;
  /** The pair token the shares are paid in. */
  host: Address;
  /** Live from the vault: owed = squadClaimable, claimed = squadPaid (null when unreadable). */
  members: { wallet: Address; bps: number; owed: Big | null; claimed: Big | null; claimTx: UnsignedTx }[];
}

export interface DripEpoch {
  coin: Address;
  epoch: number;
  root: Hex;
  total: Big;
  holders: number;
  snapshotBlock: number;
  status: "pending" | "posted" | "failed";
  postedTx: Hex | null;
  createdAt: string;
}

export interface DripProof {
  coin: Address;
  account: Address;
  /** Every posted epoch the account is in, with a ready claimDrip transaction (anyone may send it). */
  claims: { epoch: number; root: Hex; amount: Big; index: number; proof: Hex[]; claimed: boolean | null; tx: UnsignedTx }[];
}

export interface MetadataInput {
  name: string;
  symbol: string;
  description?: string;
  /** website, x, telegram, … */
  links?: Record<string, string>;
  /** The image as a data URL (data:image/png;base64,…). */
  image?: string;
}

export interface MetadataResult {
  id: string;
  cid?: string | null;
  /** Pass as `metadataUri` when launching. */
  uri: string;
}

export interface LaunchInput {
  name: string;
  symbol: string;
  metadataUri?: string;
  /** Pair token; default native. */
  host?: Address;
  /** Native wei for the first buy (default 0). */
  buyWei?: bigint | string;
  minCoinOut?: bigint | string;
  creator?: Address;
  recipient?: Address;
  /** The sender, to check approvals. */
  from?: Address;
  /** 0-4, or devBag / flywheel / bullRun / holderDrip / squad. */
  launchType?: LaunchTypeId | "devBag" | "flywheel" | "bullRun" | "holderDrip" | "squad";
  squad?: SquadMember[];
  slippageBps?: number;
  deadlineSec?: number;
}

export interface SwapInput {
  coin: Address;
  side?: "buy" | "sell";
  /** Wei of what you pay (native or pair token on a buy, the coin on a sell). */
  amountIn: bigint | string;
  /** Pay or receive native (default) or the coin's pair token. */
  payWith?: "bnb" | "host";
  recipient?: Address;
  from?: Address;
  slippageBps?: number;
  deadlineSec?: number;
}

/** $牛逼's page data (GET /main-token). */
export interface MainToken {
  chain: "bsc" | "solana";
  address: string;
  name: string;
  symbol: string;
  imageUrl: string | null;
  priceUsd: number | null;
  priceNative?: number | null;
  nativeSymbol?: string;
  priceChange24h: number | null;
  marketCapUsd: number | null;
  fdvUsd: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  totalSupply: Big | null;
  circulatingSupply: Big | null;
  burnedSupply?: Big | null;
  links: Record<string, string | undefined>;
  [k: string]: unknown;
}

export interface MainCandles {
  /** USD candles: t unix seconds, o h l c USD per token, v USD. */
  candles: { t: number; o: number; h: number; l: number; c: number; v: number }[];
  supply: number;
  [k: string]: unknown;
}

export type FeedTab = "all" | "launches" | "posts" | "x" | "trades";

export interface FeedPage {
  tab: FeedTab;
  items: ({ kind: string; id: string; at: number } & Record<string, unknown>)[];
  next: string | null;
  [k: string]: unknown;
}

/** Live events on GET /events (Server-Sent Events). */
export type LiveEvent =
  | { type: "launch"; coin: Coin }
  | { type: "trade"; trade: Trade }
  | { type: "burn"; burn: Burn }
  | { type: "graduate"; coin: Address; txHash: Hex }
  | { type: "host"; host: Pairing }
  | { type: "block"; indexedBlock: number; headBlock: number }
  | { type: "main_trade"; trade: Record<string, unknown> }
  | { type: "main_xpost"; post: Record<string, unknown> };

// ---- Solana ----------------------------------------------------------------------------------------------------

export interface SolanaCoin {
  /** The mint (base58, case-sensitive). */
  address: string;
  name: string;
  symbol: string;
  image: string | null;
  launchType: LaunchTypeId;
  marketCapUsd: Big;
  [k: string]: unknown;
}

export interface SolanaLaunchInput {
  /** Pump.fun or Raydium LaunchLab. */
  venue: "pump" | "raydium";
  /** LaunchLab trading fee tier: t100 = 1% … t500 = 5%. */
  tier?: "t100" | "t200" | "t300" | "t400" | "t500";
  /** The launcher's wallet (pays and signs). */
  launcher: string;
  name: string;
  /** Up to 10 characters. */
  symbol: string;
  /** From uploadMetadata (https). */
  metadataUri: string;
  firstBuyLamports?: bigint | string;
  launchType?: LaunchTypeId;
  squad?: { wallet: string; bps: number }[];
}

export interface SolanaLaunchPrepared {
  mint: string;
  escrow: string;
  /** Base64 v0 transaction: sign with the launcher's wallet, send, then call confirmLaunch. */
  transaction: string;
  lastValidBlockHeight: number;
  firstBuyTokens: string;
  totalFeeBps: number;
}

export interface SolanaSwapQuote {
  side: "buy" | "sell";
  amountIn: string;
  amountOut: string;
  minAmountOut: string;
  feeLamports: string;
  feeBps: number;
  venue: "curve" | "jupiter";
}
