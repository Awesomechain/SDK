// Prints launches, trades and graduations on BNB Chain as they happen.
// npx tsx examples/live-events.ts
import { formatEther } from "viem";
import { AwesomeClient } from "../src/index.js";

for await (const ev of new AwesomeClient().events()) {
  if (ev.type === "launch") console.log(`new coin ${ev.coin.symbol} ${ev.coin.address}`);
  if (ev.type === "trade") {
    const t = ev.trade;
    console.log(`${t.isBuy ? "buy " : "sell"} ${t.coinSymbol} ${formatEther(BigInt(t.hostAmount))} ${t.hostSymbol}`);
  }
  if (ev.type === "graduate") console.log(`graduated ${ev.coin}`);
}
