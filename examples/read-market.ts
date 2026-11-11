// Top coins on BNB Chain and Base, $牛逼's price, and the latest trades of the biggest coin.
// npx tsx examples/read-market.ts
import { formatEther } from "viem";
import { AwesomeClient } from "../src/index.js";

const awesome = new AwesomeClient();

const main = await awesome.mainToken();
console.log(`$牛逼 $${main.priceUsd} · market cap $${Math.round(main.marketCapUsd ?? 0).toLocaleString()}`);

for (const chain of ["bsc", "base"] as const) {
  const coins = await awesome.chain(chain).coins({ sort: "mcap", limit: 5 });
  console.log(`\n${chain}:`);
  for (const c of coins) {
    const mcap = (Number(c.marketCapUsd) / 1e18).toFixed(0);
    console.log(`  ${c.symbol.padEnd(10)} $${mcap.padStart(8)}  ${(c.progressBps / 100).toFixed(1)}% to graduation`);
  }
}

const [top] = await awesome.coins({ sort: "mcap", limit: 1 });
if (top) {
  for (const t of await awesome.trades(top.address, { limit: 5 })) {
    console.log(`${t.isBuy ? "buy " : "sell"} ${formatEther(BigInt(t.hostAmount))} ${t.hostSymbol} by ${t.trader}`);
  }
}
