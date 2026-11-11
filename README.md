# Awesome (牛逼) SDK

**English** · [中文](README.zh-CN.md)

TypeScript SDK for [Awesome](https://xn--nib-9na0w.xyz) (niúbī.xyz), the 牛逼 launchpad on BNB Chain, eight Uniswap v4
chains and Solana.

- **API client**: coins, trades, candles, holders, claims, the feed, $牛逼 and live events, on every chain.
- **Transaction builders**: ready-to-sign launch, swap and claim transactions from the API.
- **On-chain helpers**: launch and swap calls, quotes, coin state and Holder Drip leaves, straight from the
  contracts with [viem](https://viem.sh).
- **ABIs and addresses** of every deployment.

Works in Node 18+ and browsers. The only peer dependency is `viem` 2.

## Install

```sh
npm install github:Awesomechain/SDK viem
```

```ts
import { AwesomeClient } from "@awesomechain/sdk";
```

## Quick start

```ts
import { AwesomeClient } from "@awesomechain/sdk";

const awesome = new AwesomeClient();               // https://xn--nib-9na0w.xyz

const top = await awesome.coins({ sort: "mcap", limit: 10 });          // BNB Chain
const onBase = await awesome.chain("base").coins({ sort: "new" });     // any EVM chain
const onSolana = await awesome.solana.coins({ limit: 10 });            // Solana

const coin = await awesome.coin(top[0].address);
const candles = await awesome.candles(coin.address, { interval: 3600 });
const niubi = await awesome.mainToken();                               // $牛逼 price, supply, pools
```

### Launch a coin

```ts
import { createWalletClient, http, parseEther } from "viem";
import { bsc } from "viem/chains";

const meta = await awesome.uploadMetadata({
  name: "My Coin",
  symbol: "MINE",
  description: "…",
  links: { x: "https://x.com/mycoin" },
  image: "data:image/png;base64,…",
});

const { tx } = await awesome.buildLaunch({
  name: "My Coin",
  symbol: "MINE",
  metadataUri: meta.uri,
  buyWei: parseEther("0.05"),       // optional first buy, at most 5% of supply
  launchType: "flywheel",           // devBag · flywheel · bullRun · holderDrip · squad
  from: account.address,
});

await wallet.sendTransaction({ to: tx.to, data: tx.data, value: BigInt(tx.value), gas: BigInt(tx.gas!) });
```

On another chain, use `awesome.chain("base").buildLaunch(…)` with a wallet on that chain.

### Buy and sell

```ts
const { approval, tx, quote } = await awesome.buildSwap({
  coin: "0x…",
  side: "buy",                      // or "sell"
  amountIn: parseEther("0.1"),      // what you pay, in wei
  slippageBps: 100,
  from: account.address,
});
if (approval) await wallet.sendTransaction({ to: approval.to, data: approval.data });
await wallet.sendTransaction({ to: tx.to, data: tx.data, value: BigInt(tx.value) });
```

### Claim

```ts
const { claims, txs } = await awesome.claims(account.address);   // Dev Bag, Squad and Holder Drip
for (const tx of txs) await wallet.sendTransaction({ to: tx.to, data: tx.data, gas: BigInt(tx.gas!) });
```

### Live events

```ts
for await (const ev of awesome.events()) {
  if (ev.type === "launch") console.log("new coin", ev.coin.symbol);
  if (ev.type === "trade") console.log(ev.trade.isBuy ? "buy" : "sell", ev.trade.coinSymbol);
}
```

### Without the API

Everything above can also be done straight from the contracts:

```ts
import { createPublicClient, http, parseEther } from "viem";
import { base } from "viem/chains";
import { NATIVE, launchCall, launchParams, quote, readCoin, readConfigVersion, swapCall, withSlippage } from "@awesomechain/sdk";

const pub = createPublicClient({ chain: base, transport: http() });

// launch with a 2% fee (Uniswap v4 chains)
const params = launchParams({
  name: "My Coin",
  symbol: "MINE",
  metadataURI: "ipfs://…",
  configVersion: await readConfigVersion(pub, "base"),
  firstBuy: parseEther("0.01"),
  launchType: 0,
});
const { request, result: [coin] } = await pub.simulateContract({ ...launchCall("base", params, 200), account });
await wallet.writeContract(request);

// buy
const amounts = await quote(pub, "base", [NATIVE, coin], parseEther("0.01"));
const buy = swapCall("base", { path: [NATIVE, coin], amountIn: parseEther("0.01"), minOut: withSlippage(amounts[1], 100), recipient: account.address });
await wallet.writeContract((await pub.simulateContract({ ...buy, account })).request);

// state
const state = await readCoin(pub, "base", coin);   // graduated, current fee, pot, launch type, supply…
```

### Solana

```ts
const prepared = await awesome.solana.prepareLaunch({
  venue: "pump",                    // or "raydium" (LaunchLab) with tier t100…t500
  launcher: wallet.publicKey.toBase58(),
  name: "My Coin",
  symbol: "MINE",
  metadataUri: meta.uri,
  firstBuyLamports: 100_000_000n,
  launchType: 0,
});
const tx = VersionedTransaction.deserialize(Buffer.from(prepared.transaction, "base64"));
const signed = await wallet.signTransaction(tx);
const { signature } = await awesome.solana.send(Buffer.from(signed.serialize()).toString("base64"));
await awesome.solana.confirmLaunch(prepared.mint, signature);
```

## Reference

### `AwesomeClient`

`new AwesomeClient({ baseUrl?, fetch?, headers?, timeoutMs? })`. Methods on BNB Chain, and on any EVM chain through
`awesome.chain(key)`:

| Method | Route | Returns |
|---|---|---|
| `config()` | `GET /config` | chain, deployment, live launch settings, indexer progress |
| `stats()` | `GET /stats` | coins, graduations, 24 h trades and volume, value burned |
| `coins(query)` | `GET /coins` | `Coin[]`; `sort` new · trending · mcap · graduating · burned, `pair`, `host`, `creator`, `launchType`, `q`, `limit`, `offset` |
| `coin(address)` | `GET /coins/:address` | `CoinDetail` |
| `trades(coin, { limit })` | `GET /coins/:address/trades` | `Trade[]`, newest first |
| `candles(coin, { interval })` | `GET /coins/:address/candles` | `Candle[]`; interval 1, 15, 60, 300, 900, 3600, 14400, 86400 |
| `holders(coin)`, `burns(coin)` | `GET /coins/:address/holders`, `…/burns` | top holders, burns |
| `recentTrades()`, `recentBurns()` | `GET /trades/recent`, `/burns/recent` | across every coin |
| `search(q)` | `GET /search` | coins and pairing tokens |
| `pairings(query)`, `pairing(address)` | `GET /hosts`, `/hosts/:address` | pairing tokens (BNB Chain) |
| `claims(address)` | `GET /claims/:address` | what a wallet can collect, with ready transactions |
| `creator(address)`, `portfolio(address)` | `GET /creators/:address`, `/portfolio/:address` | coins created; positions and PnL |
| `squad(coin)` | `GET /coins/:address/squad` | Squad members, owed and claimed |
| `dripEpochs(coin)`, `dripProof(coin, account)` | `GET /drip/:coin/epochs`, `/drip/:coin/proof/:account` | Holder Drip epochs and proofs |
| `buildLaunch(input)` | `POST /tx/launch` | `LaunchTx` |
| `quoteSwap(input)`, `buildSwap(input)` | `POST /tx/quote`, `/tx/swap` | `SwapQuote`, `SwapTx` |
| `buildClaims(address)` | `POST /tx/claim` | `Claims` with transactions |
| `events(signal?)` | `GET /events` (SSE) | async iterator of `LiveEvent` |

BNB Chain only (site-wide):

| Method | Route |
|---|---|
| `chain(key)` | the same API on `base`, `arbitrum`, `hyperevm`, `monad`, `xlayer`, `elysium`, `robinhood`, `arc` |
| `chainsStatus()` | `GET /api/c`: every chain and whether it is live |
| `site()` | `GET /api/site`: $牛逼 on each chain |
| `uploadMetadata(input)` | `POST /api/metadata`: image (data URL), description, links → `uri` |
| `mainToken(chain?)`, `mainTokenCandles(q)`, `mainTokenTrades(q)` | $牛逼 on BNB Chain or Solana |
| `feed(q)` | `GET /api/feed`: launches, graduations, big buys, posts, X posts |

`awesome.solana`: `config`, `stats`, `coins`, `coin`, `trades`, `candles`, `holders`, `escrow`, `balances`,
`prepareLaunch`, `confirmLaunch`, `quoteSwap`, `buildSwap`, `send`, `status`.

Amounts are strings of wei (or lamports). Prices of coins are pair-token wei per one whole coin; USD values with a
`Usd` suffix on coins are USD × 10¹⁸. Errors throw `AwesomeApiError` (`status`, `message`, `code`).

### Chains and contracts

```ts
import { CHAINS, getChain, NATIVE, MAIN_TOKEN } from "@awesomechain/sdk";

CHAINS.bsc.contracts.factory     // 0x82BcF05C1b7f49eC6e0Ba07d83eC15538F2CC569
getChain(8453).contracts.router  // Base
```

| Key | Chain | Id | Venue |
|---|---|---|---|
| `bsc` | BNB Chain | 56 | PancakeSwap Infinity |
| `base` | Base | 8453 | Uniswap v4 |
| `arbitrum` | Arbitrum | 42161 | Uniswap v4 |
| `hyperevm` | HyperEVM | 999 | Uniswap v4 |
| `monad` | Monad | 143 | Uniswap v4 |
| `xlayer` | X Layer | 196 | Uniswap v4 |
| `elysium` | Elysium | 99901 | Uniswap v4 |
| `robinhood` | Robinhood Chain | 4663 | Uniswap v4 |
| `arc` | Arc | 5042 | Uniswap v4 |

ABIs: `awesomeFactoryAbi`, `awesomeRouterAbi`, `awesomeUniRouterAbi`, `awesomeTokenAbi`, `feeVaultAbi`, `hookAbi`,
`lockerAbi`, `pairRegistryAbi` (also from `@awesomechain/sdk/abis`).

### On-chain helpers

| Function | Does |
|---|---|
| `launchParams(p)` | builds and checks the factory's `LaunchParams` |
| `launchCall(chain, params, feeBps?)` | a `launch` / `launchWithFee` call for viem |
| `readConfigVersion(client, chain)` | the factory's settings version |
| `quote(client, chain, path, amountIn)` | router quote (simulated) |
| `swapCall(chain, { path, amountIn, minOut, recipient, deadline? })` | a `swapExactIn` call |
| `readCoin(client, chain, coin)` | a coin's on-chain state in one multicall |
| `dripLeaf(coin, epoch, account, amount)` | a Holder Drip merkle leaf |
| `checkSquad(squad)`, `withSlippage(amount, bps)`, `deadlineIn(seconds)` | small helpers |
| `LAUNCH_TYPES`, `FEE_SPLIT` | launch types (English and Chinese names) and the fee split |

## Fees

Every trade pays 1% of the native side (0.25%-5% when the creator picked a fee on a Uniswap v4 chain): 60% goes to
the coin's launch type, 10% to the Awesome platform, 10% to 牛逼 staking and 20% buys back $牛逼 and burns it.

## Development

```sh
npm install
npm test                 # unit tests
npm run test:live        # against the live site and public RPCs
npm run build
npm run abis             # regenerate src/abis.ts from a built ../Contracts checkout
```

More: [Docs](https://github.com/Awesomechain/Docs) · [Contracts](https://github.com/Awesomechain/Contracts)

## License

[MIT](LICENSE)
