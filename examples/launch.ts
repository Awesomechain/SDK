// Launches a coin on BNB Chain: uploads the metadata, asks the API for the transaction, signs and sends it.
// PRIVATE_KEY=0x… npx tsx examples/launch.ts
import { readFileSync } from "node:fs";
import { createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc } from "viem/chains";
import { AwesomeClient } from "../src/index.js";

const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const wallet = createWalletClient({ account, chain: bsc, transport: http() });
const awesome = new AwesomeClient();

const image = `data:image/png;base64,${readFileSync("logo.png").toString("base64")}`;
const meta = await awesome.uploadMetadata({
  name: "My Coin",
  symbol: "MINE",
  description: "The best coin on Awesome.",
  links: { x: "https://x.com/mycoin", telegram: "https://t.me/mycoin" },
  image,
});

const { tx } = await awesome.buildLaunch({
  name: "My Coin",
  symbol: "MINE",
  metadataUri: meta.uri,
  buyWei: parseEther("0.05"), // first buy (max 5% of supply)
  launchType: "flywheel", // the creator share buys back and burns the coin
  from: account.address,
});

const hash = await wallet.sendTransaction({
  to: tx.to,
  data: tx.data,
  value: BigInt(tx.value),
  gas: tx.gas ? BigInt(tx.gas) : undefined,
});
console.log("launched:", `https://bscscan.com/tx/${hash}`);
