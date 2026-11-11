// Buys a coin on Base straight from the router, without the API: quote, 1% slippage, swap.
// PRIVATE_KEY=0x… COIN=0x… npx tsx examples/buy-onchain.ts
import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { NATIVE, quote, swapCall, withSlippage } from "../src/index.js";

const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const pub = createPublicClient({ chain: base, transport: http() });
const wallet = createWalletClient({ account, chain: base, transport: http() });
const coin = process.env.COIN as `0x${string}`;

const amountIn = parseEther("0.001");
const path = [NATIVE, coin] as const;
const amounts = await quote(pub, "base", path, amountIn);
const call = swapCall("base", { path, amountIn, minOut: withSlippage(amounts.at(-1)!, 100), recipient: account.address });

const { request } = await pub.simulateContract({ ...call, account });
console.log("bought:", await wallet.writeContract(request));
