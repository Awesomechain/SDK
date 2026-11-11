// Pays out everything a wallet is owed on BNB Chain (Dev Bag fees, Squad shares, Holder Drip).
// PRIVATE_KEY=0x… npx tsx examples/claim.ts
import { createWalletClient, formatEther, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc } from "viem/chains";
import { AwesomeClient } from "../src/index.js";

const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const wallet = createWalletClient({ account, chain: bsc, transport: http() });
const awesome = new AwesomeClient();

const { claims, totalOwedNative, txs } = await awesome.claims(account.address);
console.log(`${claims.length} claims, worth ${formatEther(BigInt(totalOwedNative))} BNB`);
for (const tx of txs) {
  const hash = await wallet.sendTransaction({
    to: tx.to,
    data: tx.data,
    value: BigInt(tx.value),
    gas: tx.gas ? BigInt(tx.gas) : undefined,
  });
  console.log(tx.description, hash);
}
