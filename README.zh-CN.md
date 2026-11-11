# Awesome (牛逼) SDK

[English](README.md) · **中文**

[Awesome](https://xn--nib-9na0w.xyz)（niúbī.xyz）的 TypeScript SDK。Awesome 是 牛逼 发射台，覆盖 BNB Chain、八条 Uniswap v4
链以及 Solana。

- **API 客户端**：代币、交易、K 线、持有人、可领取收益、动态（feed）、$牛逼 以及实时事件，全链通用。
- **交易构建器**：通过 API 直接获取可签名的发币、兑换和领取交易。
- **链上工具函数**：发币与兑换调用、报价、代币状态以及 Holder Drip（持有人分红）叶子节点，借助 [viem](https://viem.sh)
  直接读写合约。
- 所有部署的 **ABI 和合约地址**。

支持 Node 18+ 和浏览器。唯一的 peer dependency 是 `viem` 2。

## 安装

```sh
npm install github:Awesomechain/SDK viem
```

```ts
import { AwesomeClient } from "@awesomechain/sdk";
```

## 快速上手

```ts
import { AwesomeClient } from "@awesomechain/sdk";

const awesome = new AwesomeClient();               // https://xn--nib-9na0w.xyz

const top = await awesome.coins({ sort: "mcap", limit: 10 });          // BNB Chain
const onBase = await awesome.chain("base").coins({ sort: "new" });     // 任意 EVM 链
const onSolana = await awesome.solana.coins({ limit: 10 });            // Solana

const coin = await awesome.coin(top[0].address);
const candles = await awesome.candles(coin.address, { interval: 3600 });
const niubi = await awesome.mainToken();                               // $牛逼 价格、供应量、池子
```

### 发币

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
  buyWei: parseEther("0.05"),       // 可选的首笔买入，最多占供应量的 5%
  launchType: "flywheel",           // devBag · flywheel · bullRun · holderDrip · squad
  from: account.address,
});

await wallet.sendTransaction({ to: tx.to, data: tx.data, value: BigInt(tx.value), gas: BigInt(tx.gas!) });
```

在其他链上发币，使用 `awesome.chain("base").buildLaunch(…)`，并搭配该链上的钱包。

### 买入与卖出

```ts
const { approval, tx, quote } = await awesome.buildSwap({
  coin: "0x…",
  side: "buy",                      // 或 "sell"
  amountIn: parseEther("0.1"),      // 支付的数量，单位 wei
  slippageBps: 100,
  from: account.address,
});
if (approval) await wallet.sendTransaction({ to: approval.to, data: approval.data });
await wallet.sendTransaction({ to: tx.to, data: tx.data, value: BigInt(tx.value) });
```

### 领取

```ts
const { claims, txs } = await awesome.claims(account.address);   // Dev Bag（开发者钱包）、Squad（团队分成）和 Holder Drip
for (const tx of txs) await wallet.sendTransaction({ to: tx.to, data: tx.data, gas: BigInt(tx.gas!) });
```

### 实时事件

```ts
for await (const ev of awesome.events()) {
  if (ev.type === "launch") console.log("new coin", ev.coin.symbol);
  if (ev.type === "trade") console.log(ev.trade.isBuy ? "buy" : "sell", ev.trade.coinSymbol);
}
```

### 不经过 API

以上所有操作也都可以直接通过合约完成：

```ts
import { createPublicClient, http, parseEther } from "viem";
import { base } from "viem/chains";
import { NATIVE, launchCall, launchParams, quote, readCoin, readConfigVersion, swapCall, withSlippage } from "@awesomechain/sdk";

const pub = createPublicClient({ chain: base, transport: http() });

// 以 2% 手续费发币（Uniswap v4 链）
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

// 买入
const amounts = await quote(pub, "base", [NATIVE, coin], parseEther("0.01"));
const buy = swapCall("base", { path: [NATIVE, coin], amountIn: parseEther("0.01"), minOut: withSlippage(amounts[1], 100), recipient: account.address });
await wallet.writeContract((await pub.simulateContract({ ...buy, account })).request);

// 状态
const state = await readCoin(pub, "base", coin);   // 是否毕业、当前费率、奖池、发射类型、供应量…
```

### Solana

```ts
const prepared = await awesome.solana.prepareLaunch({
  venue: "pump",                    // 或 "raydium"（LaunchLab），档位 t100…t500
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

## 参考

### `AwesomeClient`

`new AwesomeClient({ baseUrl?, fetch?, headers?, timeoutMs? })`。以下方法默认作用于 BNB Chain，也可以通过
`awesome.chain(key)` 在任意 EVM 链上调用：

| 方法 | 路由 | 返回 |
|---|---|---|
| `config()` | `GET /config` | 链、部署信息、当前发币设置、索引器进度 |
| `stats()` | `GET /stats` | 代币数、毕业数、24 小时交易笔数与交易量、已销毁价值 |
| `coins(query)` | `GET /coins` | `Coin[]`；`sort` 可选 new · trending · mcap · graduating · burned，另有 `pair`、`host`、`creator`、`launchType`、`q`、`limit`、`offset` |
| `coin(address)` | `GET /coins/:address` | `CoinDetail` |
| `trades(coin, { limit })` | `GET /coins/:address/trades` | `Trade[]`，按时间倒序 |
| `candles(coin, { interval })` | `GET /coins/:address/candles` | `Candle[]`；interval 可选 1、15、60、300、900、3600、14400、86400 |
| `holders(coin)`、`burns(coin)` | `GET /coins/:address/holders`、`…/burns` | 头部持有人、销毁记录 |
| `recentTrades()`、`recentBurns()` | `GET /trades/recent`、`/burns/recent` | 覆盖全部代币 |
| `search(q)` | `GET /search` | 代币和配对代币 |
| `pairings(query)`、`pairing(address)` | `GET /hosts`、`/hosts/:address` | 配对代币（BNB Chain） |
| `claims(address)` | `GET /claims/:address` | 钱包可领取的收益，附带可直接发送的交易 |
| `creator(address)`、`portfolio(address)` | `GET /creators/:address`、`/portfolio/:address` | 创建的代币；持仓与盈亏 |
| `squad(coin)` | `GET /coins/:address/squad` | Squad 成员、应得与已领取金额 |
| `dripEpochs(coin)`、`dripProof(coin, account)` | `GET /drip/:coin/epochs`、`/drip/:coin/proof/:account` | Holder Drip 周期与证明 |
| `buildLaunch(input)` | `POST /tx/launch` | `LaunchTx` |
| `quoteSwap(input)`、`buildSwap(input)` | `POST /tx/quote`、`/tx/swap` | `SwapQuote`、`SwapTx` |
| `buildClaims(address)` | `POST /tx/claim` | 附带交易的 `Claims` |
| `events(signal?)` | `GET /events`（SSE） | `LiveEvent` 的异步迭代器 |

仅限 BNB Chain（全站级）：

| 方法 | 路由 |
|---|---|
| `chain(key)` | 在 `base`、`arbitrum`、`hyperevm`、`monad`、`xlayer`、`elysium`、`robinhood`、`arc` 上使用同一套 API |
| `chainsStatus()` | `GET /api/c`：所有链及其是否已上线 |
| `site()` | `GET /api/site`：各链上的 $牛逼 |
| `uploadMetadata(input)` | `POST /api/metadata`：图片（data URL）、简介、链接 → `uri` |
| `mainToken(chain?)`、`mainTokenCandles(q)`、`mainTokenTrades(q)` | BNB Chain 或 Solana 上的 $牛逼 |
| `feed(q)` | `GET /api/feed`：新发币、毕业、大额买入、帖子、X 推文 |

`awesome.solana`：`config`、`stats`、`coins`、`coin`、`trades`、`candles`、`holders`、`escrow`、`balances`、
`prepareLaunch`、`confirmLaunch`、`quoteSwap`、`buildSwap`、`send`、`status`。

数量均为 wei（或 lamports）的字符串。代币价格表示为每一整枚代币对应的计价代币 wei 数；代币上带 `Usd` 后缀的美元数值为
USD × 10¹⁸。出错时抛出 `AwesomeApiError`（`status`、`message`、`code`）。

### 链与合约

```ts
import { CHAINS, getChain, NATIVE, MAIN_TOKEN } from "@awesomechain/sdk";

CHAINS.bsc.contracts.factory     // 0x82BcF05C1b7f49eC6e0Ba07d83eC15538F2CC569
getChain(8453).contracts.router  // Base
```

| Key | 链 | Id | 交易场所 |
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

ABI：`awesomeFactoryAbi`、`awesomeRouterAbi`、`awesomeUniRouterAbi`、`awesomeTokenAbi`、`feeVaultAbi`、`hookAbi`、
`lockerAbi`、`pairRegistryAbi`（也可从 `@awesomechain/sdk/abis` 导入）。

### 链上工具函数

| 函数 | 作用 |
|---|---|
| `launchParams(p)` | 构建并校验工厂合约的 `LaunchParams` |
| `launchCall(chain, params, feeBps?)` | 生成供 viem 使用的 `launch` / `launchWithFee` 调用 |
| `readConfigVersion(client, chain)` | 工厂合约的设置版本 |
| `quote(client, chain, path, amountIn)` | 路由报价（模拟调用） |
| `swapCall(chain, { path, amountIn, minOut, recipient, deadline? })` | 生成 `swapExactIn` 调用 |
| `readCoin(client, chain, coin)` | 一次 multicall 读取代币的链上状态 |
| `dripLeaf(coin, epoch, account, amount)` | Holder Drip 的 merkle 叶子节点 |
| `checkSquad(squad)`、`withSlippage(amount, bps)`、`deadlineIn(seconds)` | 小工具函数 |
| `LAUNCH_TYPES`、`FEE_SPLIT` | 发射类型（中英文名称）及手续费分配 |

## 手续费

每笔交易按原生币一侧收取 1% 手续费（若创建者在 Uniswap v4 链上自选费率，则为 0.25%-5%）：60% 归代币的发射类型，10% 归
Awesome 平台，10% 归 牛逼 质押，20% 用于回购并销毁 $牛逼。

## 开发

```sh
npm install
npm test                 # 单元测试
npm run test:live        # 针对线上站点和公共 RPC 测试
npm run build
npm run abis             # 从已构建的 ../Contracts 仓库重新生成 src/abis.ts
```

更多：[文档](https://github.com/Awesomechain/Docs) · [合约](https://github.com/Awesomechain/Contracts)

## 许可证

[MIT](LICENSE)
