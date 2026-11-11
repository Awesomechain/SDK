import type { Address } from "viem";
import { CHAINS, DEFAULT_BASE_URL, type EvmChainKey } from "./chains.js";
import { readSse } from "./sse.js";
import type {
  Burn,
  Candle,
  CandleInterval,
  ChainConfig,
  ChainStatus,
  Claims,
  Coin,
  CoinDetail,
  DripEpoch,
  DripProof,
  FeedPage,
  FeedTab,
  Holder,
  LaunchInput,
  LaunchTx,
  LaunchTypeId,
  LiveEvent,
  MainCandles,
  MainToken,
  MetadataInput,
  MetadataResult,
  Pairing,
  SearchResult,
  SolanaCoin,
  SolanaLaunchInput,
  SolanaLaunchPrepared,
  SolanaSwapQuote,
  SquadInfo,
  Stats,
  SwapInput,
  SwapQuote,
  SwapTx,
  Trade,
} from "./types.js";

/** An error the Awesome API answered with (status 4xx/5xx, body `{ error, code? }`). */
export class AwesomeApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "AwesomeApiError";
  }
}

export interface AwesomeClientOptions {
  /** The Awesome server (default https://xn--nib-9na0w.xyz, niúbī.xyz). */
  baseUrl?: string;
  /** A fetch implementation (default globalThis.fetch). */
  fetch?: typeof fetch;
  /** Extra headers on every request. */
  headers?: Record<string, string>;
  /** Request timeout in ms (default 20000). */
  timeoutMs?: number;
}

type Query = Record<string, string | number | boolean | bigint | undefined | null>;

const qs = (q?: Query) => {
  if (!q) return "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
};

/** bigints → decimal strings, for JSON bodies. */
const plain = (v: unknown): unknown =>
  JSON.parse(JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x)));

class Http {
  constructor(private o: Required<Omit<AwesomeClientOptions, "headers">> & { headers: Record<string, string> }) {}

  async req<T>(method: "GET" | "POST" | "DELETE", path: string, body?: unknown): Promise<T> {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), this.o.timeoutMs);
    try {
      const res = await this.o.fetch(`${this.o.baseUrl}${path}`, {
        method,
        headers: { accept: "application/json", ...(body !== undefined ? { "content-type": "application/json" } : {}), ...this.o.headers },
        body: body !== undefined ? JSON.stringify(plain(body)) : undefined,
        signal: ctl.signal,
      });
      const text = await res.text();
      let data: unknown = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }
      if (!res.ok) {
        const e = (data ?? {}) as { error?: unknown; message?: unknown; code?: unknown };
        const msg = typeof e.error === "string" ? e.error : typeof e.message === "string" ? e.message : `HTTP ${res.status}`;
        throw new AwesomeApiError(res.status, msg, typeof e.code === "string" ? e.code : undefined, data);
      }
      return data as T;
    } finally {
      clearTimeout(timer);
    }
  }

  stream(path: string, signal?: AbortSignal) {
    return this.o.fetch(`${this.o.baseUrl}${path}`, { headers: { accept: "text/event-stream", ...this.o.headers }, signal });
  }
}

export interface ListCoinsQuery {
  sort?: "new" | "trending" | "mcap" | "graduating" | "burned";
  pair?: "bnb" | "fourmeme" | "flap" | "lockedlp" | "stock" | "coin";
  host?: Address;
  creator?: Address;
  launchType?: LaunchTypeId;
  /** Name, symbol or address. */
  q?: string;
  /** 1-200 (default 50). */
  limit?: number;
  offset?: number;
}

/**
 * The Awesome API on one EVM chain. `AwesomeClient` is BNB Chain; `client.chain("base")` returns the same API for
 * another chain. Every method maps to one HTTP route (see docs/en/api.md).
 */
export class ChainApi {
  constructor(
    protected http: Http,
    /** e.g. "/api" (BNB Chain) or "/api/c/base". */
    readonly prefix: string,
  ) {}

  private get<T>(path: string, q?: Query) {
    return this.http.req<T>("GET", `${this.prefix}${path}${qs(q)}`);
  }
  private post<T>(path: string, body: unknown) {
    return this.http.req<T>("POST", `${this.prefix}${path}`, body);
  }

  // ---- chain ----------------------------------------------------------------------------------------------------

  /** The chain, its deployment, the live launch settings and the indexer's progress. */
  config() {
    return this.get<ChainConfig>("/config");
  }
  /** Coins, graduations, 24 h trades and volume, value burned. */
  stats() {
    return this.get<Stats>("/stats");
  }

  // ---- coins ----------------------------------------------------------------------------------------------------

  coins(q: ListCoinsQuery = {}) {
    return this.get<Coin[]>("/coins", q as Query);
  }
  coin(address: Address) {
    return this.get<CoinDetail>(`/coins/${address}`);
  }
  /** Newest first. `limit` 1-500 (50). */
  trades(coin: Address, q: { limit?: number } = {}) {
    return this.get<Trade[]>(`/coins/${coin}/trades`, q);
  }
  /** Oldest first, pair-token wei per whole coin. */
  candles(coin: Address, q: { interval?: CandleInterval } = {}) {
    return this.get<Candle[]>(`/coins/${coin}/candles`, q);
  }
  holders(coin: Address, q: { limit?: number } = {}) {
    return this.get<Holder[]>(`/coins/${coin}/holders`, q);
  }
  burns(coin: Address, q: { limit?: number } = {}) {
    return this.get<Burn[]>(`/coins/${coin}/burns`, q);
  }
  /** Latest trades across every coin. */
  recentTrades(q: { limit?: number } = {}) {
    return this.get<Trade[]>("/trades/recent", q);
  }
  recentBurns(q: { limit?: number } = {}) {
    return this.get<Burn[]>("/burns/recent", q);
  }
  search(q: string) {
    return this.get<SearchResult>("/search", { q });
  }

  // ---- pairings (BNB Chain) -------------------------------------------------------------------------------------

  pairings(q: { sort?: "mcap" | "burned" | "burnedUsd" | "new"; status?: "all" | "registered" | "candidates"; q?: string; limit?: number; offset?: number } = {}) {
    return this.get<Pairing[]>("/hosts", q);
  }
  pairing(address: Address) {
    return this.get<{ host: Pairing; coins: Coin[]; burns: Burn[]; readings: unknown[] }>(`/hosts/${address}`);
  }

  // ---- wallets --------------------------------------------------------------------------------------------------

  /** Everything `address` can collect (Dev Bag, Squad, Holder Drip), with ready transactions. */
  claims(address: Address) {
    return this.get<Claims>(`/claims/${address}`);
  }
  /** Coins `address` created, with their creator share owed and claimed. */
  creator(address: Address) {
    return this.get<{ address: Address; coins: unknown[] }>(`/creators/${address}`);
  }
  portfolio(address: Address) {
    return this.get<Record<string, unknown>>(`/portfolio/${address}`);
  }
  squad(coin: Address) {
    return this.get<SquadInfo>(`/coins/${coin}/squad`);
  }
  dripEpochs(coin: Address) {
    return this.get<DripEpoch[]>(`/drip/${coin}/epochs`);
  }
  dripProof(coin: Address, account: Address) {
    return this.get<DripProof>(`/drip/${coin}/proof/${account}`);
  }

  // ---- transactions ---------------------------------------------------------------------------------------------

  /** A ready launch transaction (factory.launch, or router.launchWithNative for a pairing token bought with native). */
  buildLaunch(input: LaunchInput) {
    return this.post<LaunchTx>("/tx/launch", input);
  }
  /** A quote along the router path the server picks. */
  quoteSwap(input: SwapInput) {
    return this.post<SwapQuote>("/tx/quote", input);
  }
  /** A ready swap transaction (and the approval to send first, if any). */
  buildSwap(input: SwapInput) {
    return this.post<SwapTx>("/tx/swap", input);
  }
  /** Ready transactions that pay everything `address` is owed. */
  buildClaims(address: Address) {
    return this.post<Claims>("/tx/claim", { address });
  }

  // ---- live -----------------------------------------------------------------------------------------------------

  /**
   * Live launches, trades, burns, graduations and indexer blocks (Server-Sent Events). Iterate it; abort the signal
   * to stop.
   *
   *   for await (const ev of client.events()) if (ev.type === "trade") console.log(ev.trade)
   */
  async *events(signal?: AbortSignal): AsyncGenerator<LiveEvent> {
    const res = await this.http.stream(`${this.prefix}/events`, signal);
    if (!res.ok || !res.body) throw new AwesomeApiError(res.status, `events: HTTP ${res.status}`);
    for await (const m of readSse(res.body)) {
      try {
        const data = JSON.parse(m.data) as Record<string, unknown>;
        yield { type: m.event, ...data } as LiveEvent;
      } catch {
        // not JSON (a comment or keep-alive)
      }
    }
  }
}

/** The Solana API (Pump.fun and Raydium LaunchLab launches, SOL pairs). */
export class SolanaApi {
  constructor(private http: Http) {}
  private get<T>(path: string, q?: Query) {
    return this.http.req<T>("GET", `/api/c/solana${path}${qs(q)}`);
  }
  private post<T>(path: string, body: unknown) {
    return this.http.req<T>("POST", `/api/c/solana${path}`, body);
  }

  config() {
    return this.get<Record<string, unknown>>("/config");
  }
  stats() {
    return this.get<{ coins: number; trades: number; volumeNative: string }>("/stats");
  }
  coins(q: { sort?: string; q?: string; limit?: number; offset?: number; launchType?: LaunchTypeId; creator?: string } = {}) {
    return this.get<SolanaCoin[]>("/coins", q as Query);
  }
  /** Mints are case-sensitive base58. */
  coin(mint: string) {
    return this.get<SolanaCoin>(`/coins/${mint}`);
  }
  trades(mint: string, q: { limit?: number } = {}) {
    return this.get<Record<string, unknown>[]>(`/coins/${mint}/trades`, q);
  }
  candles(mint: string, q: { interval?: CandleInterval } = {}) {
    return this.get<Candle[]>(`/coins/${mint}/candles`, q);
  }
  holders(mint: string, q: { limit?: number } = {}) {
    return this.get<Holder[]>(`/coins/${mint}/holders`, q);
  }
  /** The coin's fee escrow and every payout made from it. */
  escrow(mint: string) {
    return this.get<{ escrow: string; balanceLamports: string; payouts: Record<string, unknown>[] }>(`/coins/${mint}/escrow`);
  }
  balances(owner: string, mint: string) {
    return this.get<{ lamports: string; tokens: string }>(`/balances/${owner}/${mint}`);
  }

  /** Step 1 of a launch: a transaction for the launcher to sign. Then send it (`send`) and call `confirmLaunch`. */
  prepareLaunch(input: SolanaLaunchInput) {
    return this.post<SolanaLaunchPrepared>("/launch/prepare", { launchType: 0, firstBuyLamports: "0", ...input });
  }
  /** Step 3: tells the server the launch was sent, so it lists the coin once it lands. */
  confirmLaunch(mint: string, signature: string) {
    return this.post<{ ok: boolean; status: string }>("/launch/confirm", { mint, signature });
  }
  quoteSwap(input: { mint: string; side: "buy" | "sell"; amountIn: bigint | string; slippageBps?: number }) {
    return this.post<SolanaSwapQuote>("/swap/quote", input);
  }
  /** A swap transaction (base64 v0) for `owner` to sign. */
  buildSwap(input: { mint: string; owner: string; side: "buy" | "sell"; amountIn: bigint | string; slippageBps?: number }) {
    return this.post<{ transaction: string; quote: SolanaSwapQuote; lastValidBlockHeight: number }>("/swap/tx", input);
  }
  /** Sends a signed transaction (base64) this API built. */
  send(transaction: string) {
    return this.post<{ signature: string }>("/tx/send", { transaction });
  }
  status(signature: string) {
    return this.get<{ status: string; err: unknown }>(`/tx/${signature}`);
  }
}

/**
 * The Awesome API client.
 *
 *   const awesome = new AwesomeClient()
 *   const top = await awesome.coins({ sort: "mcap", limit: 10 })   // BNB Chain
 *   const base = await awesome.chain("base").coins()               // Base
 *   const sol = await awesome.solana.coins()                       // Solana
 */
export class AwesomeClient extends ChainApi {
  readonly solana: SolanaApi;
  private chains = new Map<string, ChainApi>();

  constructor(opts: AwesomeClientOptions = {}) {
    const f = opts.fetch ?? globalThis.fetch;
    if (!f) throw new Error("No fetch available: pass one in AwesomeClientOptions.fetch");
    const http = new Http({
      baseUrl: (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, ""),
      fetch: f.bind(globalThis),
      headers: opts.headers ?? {},
      timeoutMs: opts.timeoutMs ?? 20_000,
    });
    super(http, "/api");
    this.solana = new SolanaApi(http);
  }

  /** The same API on another EVM chain ("bsc" is this client itself). */
  chain(key: EvmChainKey): ChainApi {
    if (key === "bsc") return this;
    if (!CHAINS[key]) throw new Error(`unknown chain ${key}`);
    let c = this.chains.get(key);
    if (!c) this.chains.set(key, (c = new ChainApi(this.http, CHAINS[key].apiPath)));
    return c;
  }

  /** Every chain the server runs, live or not. */
  chainsStatus() {
    return this.http.req<ChainStatus[]>("GET", "/api/c");
  }
  /** Site info: whether it's live, and $牛逼 on each chain. */
  site() {
    return this.http.req<{ comingSoon: boolean; token: unknown; tokens: { chain: string; address: string; symbol: string; buyUrl: string; explorerUrl: string; isDefault: boolean }[] }>("GET", "/api/site");
  }
  /** Uploads a coin's image and details; pass the returned `uri` as `metadataUri` when launching. */
  uploadMetadata(input: MetadataInput) {
    return this.http.req<MetadataResult>("POST", "/api/metadata", input);
  }
  /** $牛逼's price, supply, pools and links on BNB Chain or Solana. */
  mainToken(chain: "bsc" | "solana" = "bsc") {
    return this.http.req<MainToken>("GET", chain === "bsc" ? "/api/main-token" : "/api/main-token/solana");
  }
  mainTokenCandles(q: { interval?: 60 | 300 | 900 | 3600 | 14400 | 86400; chain?: "bsc" | "solana" } = {}) {
    const path = q.chain === "solana" ? "/api/main-token/solana/candles" : "/api/main-token/candles";
    return this.http.req<MainCandles>("GET", `${path}${qs({ interval: q.interval })}`);
  }
  mainTokenTrades(q: { before?: string; limit?: number; trader?: Address } = {}) {
    return this.http.req<{ items: Record<string, unknown>[]; next: string | null; keepDays: number }>("GET", `/api/main-token/trades${qs(q)}`);
  }
  /** The home feed: launches, graduations, big buys, posts and X posts. */
  feed(q: { tab?: FeedTab; before?: string; limit?: number } = {}) {
    return this.http.req<FeedPage>("GET", `/api/feed${qs(q)}`);
  }
}
