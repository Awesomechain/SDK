import type { Address } from "viem";

/** Keys of the EVM chains Awesome runs on. */
export type EvmChainKey = "bsc" | "base" | "arbitrum" | "hyperevm" | "monad" | "xlayer" | "elysium" | "robinhood" | "arc";
/** Every chain, Solana included. */
export type ChainKey = EvmChainKey | "solana";

export interface AwesomeContracts {
  factory: Address;
  /** AwesomeRouter on BNB Chain, AwesomeUniRouter elsewhere (same API). */
  router: Address;
  feeVault: Address;
  locker: Address;
  hook: Address;
  pairRegistry: Address;
  /** PancakeSwap Infinity CLPoolManager on BNB Chain, Uniswap v4 PoolManager elsewhere. */
  poolManager: Address;
  /** PancakeSwap Infinity Vault (BNB Chain only). */
  vault?: Address;
  wrappedNative: Address;
}

export interface AwesomeChain {
  key: EvmChainKey;
  name: string;
  chainId: number;
  nativeSymbol: string;
  explorer: string;
  venue: "pancakeswap-infinity" | "uniswap-v4";
  /** Path prefix of this chain's API on the Awesome server. */
  apiPath: string;
  /** Start indexing here. */
  deployedAtBlock: number;
  /** Native raised by a coin's curve at graduation (native pairs). */
  graduationTarget: bigint;
  /** Whether the factory has launchWithFee (a creator-picked fee, 0.25%-5%). */
  launchWithFee: boolean;
  contracts: AwesomeContracts;
}

/** Every EVM deployment of Awesome (https://github.com/Awesomechain/Contracts/tree/main/deployments). */
export const CHAINS: Record<EvmChainKey, AwesomeChain> = {
  bsc: {
    key: "bsc",
    name: "BNB Chain",
    chainId: 56,
    nativeSymbol: "BNB",
    explorer: "https://bscscan.com",
    venue: "pancakeswap-infinity",
    apiPath: "/api",
    deployedAtBlock: 132531633,
    graduationTarget: 16000000000000000000n,
    launchWithFee: false,
    contracts: {
      factory: "0x82BcF05C1b7f49eC6e0Ba07d83eC15538F2CC569",
      router: "0x868dcB84422910BF93C6d517a853f931a2943F97",
      feeVault: "0x07f46cf4E7864bf61D80e0AB684C0122Ce01Fddb",
      locker: "0xc768562b1E9b943Aa9eb39767Bf1126aD5a6cf40",
      hook: "0xDd21fAD629cB7e3A73c4dBE695990aa3d159168d",
      pairRegistry: "0x36d2AE336d23A89671068281D8957AC379de7f9b",
      poolManager: "0xa0FfB9c1CE1Fe56963B0321B32E7A0302114058b",
      vault: "0x238a358808379702088667322f80aC48bAd5e6c4",
      wrappedNative: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    },
  },
  base: {
    key: "base",
    name: "Base",
    chainId: 8453,
    nativeSymbol: "ETH",
    explorer: "https://basescan.org",
    venue: "uniswap-v4",
    apiPath: "/api/c/base",
    deployedAtBlock: 55608504,
    graduationTarget: 5250000000000000000n,
    launchWithFee: true,
    contracts: {
      factory: "0xBd7677dE392022aFE248146480AdbD31D6Ac14cA",
      router: "0x17781bd269DAbeE24fAF5C23e6c14FA84E328047",
      feeVault: "0x4192E04B59F97327E36236a7A97AA538543e190A",
      locker: "0x1FbA689e17Cb43098b74D05E574FeFB7a1161108",
      hook: "0xE802ae1D6E52E5b21332Be64B3E962a35970f8eC",
      pairRegistry: "0xBd83232907ABFD36de2B1E2b193CDf60d74Fc17B",
      poolManager: "0x498581fF718922c3f8e6A244956aF099B2652b2b",
      wrappedNative: "0x4200000000000000000000000000000000000006",
    },
  },
  arbitrum: {
    key: "arbitrum",
    name: "Arbitrum",
    chainId: 42161,
    nativeSymbol: "ETH",
    explorer: "https://arbiscan.io",
    venue: "uniswap-v4",
    apiPath: "/api/c/arbitrum",
    deployedAtBlock: 522971240,
    graduationTarget: 5250000000000000000n,
    launchWithFee: true,
    contracts: {
      factory: "0xBd7677dE392022aFE248146480AdbD31D6Ac14cA",
      router: "0x17781bd269DAbeE24fAF5C23e6c14FA84E328047",
      feeVault: "0x4192E04B59F97327E36236a7A97AA538543e190A",
      locker: "0x1FbA689e17Cb43098b74D05E574FeFB7a1161108",
      hook: "0x7f8E20905C05E19f756BACb082a28dd3a6b578Ec",
      pairRegistry: "0xBd83232907ABFD36de2B1E2b193CDf60d74Fc17B",
      poolManager: "0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32",
      wrappedNative: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    },
  },
  hyperevm: {
    key: "hyperevm",
    name: "HyperEVM",
    chainId: 999,
    nativeSymbol: "HYPE",
    explorer: "https://hyperevmscan.io",
    venue: "uniswap-v4",
    apiPath: "/api/c/hyperevm",
    deployedAtBlock: 50890083,
    graduationTarget: 150000000000000000000n,
    launchWithFee: true,
    contracts: {
      factory: "0x17781bd269DAbeE24fAF5C23e6c14FA84E328047",
      router: "0xcBD6C0Caa5Ccce16cF86C8C2ee52bC15d9b70300",
      feeVault: "0x1FbA689e17Cb43098b74D05E574FeFB7a1161108",
      locker: "0xBd7677dE392022aFE248146480AdbD31D6Ac14cA",
      hook: "0x88c80569B9309DEE8737B4d844Ea311A794838ec",
      pairRegistry: "0x4192E04B59F97327E36236a7A97AA538543e190A",
      poolManager: "0x12D4Fd9C5DeDd00ab8a0bCe2CF0167bbf94b6B1F",
      wrappedNative: "0x5555555555555555555555555555555555555555",
    },
  },
  monad: {
    key: "monad",
    name: "Monad",
    chainId: 143,
    nativeSymbol: "MON",
    explorer: "https://monadscan.com",
    venue: "uniswap-v4",
    apiPath: "/api/c/monad",
    deployedAtBlock: 121032045,
    graduationTarget: 660000000000000000000000n,
    launchWithFee: true,
    contracts: {
      factory: "0xBd7677dE392022aFE248146480AdbD31D6Ac14cA",
      router: "0x17781bd269DAbeE24fAF5C23e6c14FA84E328047",
      feeVault: "0x4192E04B59F97327E36236a7A97AA538543e190A",
      locker: "0x1FbA689e17Cb43098b74D05E574FeFB7a1161108",
      hook: "0x3D800fE713b87b1F191D76f4F63A60543Bcc78Ec",
      pairRegistry: "0xBd83232907ABFD36de2B1E2b193CDf60d74Fc17B",
      poolManager: "0x188d586Ddcf52439676Ca21A244753fA19F9Ea8e",
      wrappedNative: "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A",
    },
  },
  xlayer: {
    key: "xlayer",
    name: "X Layer",
    chainId: 196,
    nativeSymbol: "OKB",
    explorer: "https://www.oklink.com/xlayer",
    venue: "uniswap-v4",
    apiPath: "/api/c/xlayer",
    deployedAtBlock: 75543823,
    graduationTarget: 114000000000000000000n,
    launchWithFee: true,
    contracts: {
      factory: "0xBd7677dE392022aFE248146480AdbD31D6Ac14cA",
      router: "0x17781bd269DAbeE24fAF5C23e6c14FA84E328047",
      feeVault: "0x4192E04B59F97327E36236a7A97AA538543e190A",
      locker: "0x1FbA689e17Cb43098b74D05E574FeFB7a1161108",
      hook: "0x7f8E20905C05E19f756BACb082a28dd3a6b578Ec",
      pairRegistry: "0xBd83232907ABFD36de2B1E2b193CDf60d74Fc17B",
      poolManager: "0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32",
      wrappedNative: "0xe538905cf8410324e03A5A23C1c177a474D59b2b",
    },
  },
  elysium: {
    key: "elysium",
    name: "Elysium",
    chainId: 99901,
    nativeSymbol: "HYPE",
    explorer: "https://elysium.kinetiq.xyz/explorer",
    venue: "uniswap-v4",
    apiPath: "/api/c/elysium",
    deployedAtBlock: 3995603,
    graduationTarget: 150000000000000000000n,
    launchWithFee: true,
    contracts: {
      factory: "0xBd7677dE392022aFE248146480AdbD31D6Ac14cA",
      router: "0x17781bd269DAbeE24fAF5C23e6c14FA84E328047",
      feeVault: "0x4192E04B59F97327E36236a7A97AA538543e190A",
      locker: "0x1FbA689e17Cb43098b74D05E574FeFB7a1161108",
      hook: "0x13F55fBc0a2dfCd0AA99C990cf2cE7e9f190f8eC",
      pairRegistry: "0xBd83232907ABFD36de2B1E2b193CDf60d74Fc17B",
      poolManager: "0xE2e105d3F7209A9DA11f83cCf3E7398a753823F1",
      wrappedNative: "0xbA876237B0F021A6c6D852d6c26E107997cC5E81",
    },
  },
  robinhood: {
    key: "robinhood",
    name: "Robinhood Chain",
    chainId: 4663,
    nativeSymbol: "ETH",
    explorer: "https://robinhoodchain.blockscout.com",
    venue: "uniswap-v4",
    apiPath: "/api/c/robinhood",
    deployedAtBlock: 110872847,
    graduationTarget: 5250000000000000000n,
    launchWithFee: true,
    contracts: {
      factory: "0xBd7677dE392022aFE248146480AdbD31D6Ac14cA",
      router: "0x17781bd269DAbeE24fAF5C23e6c14FA84E328047",
      feeVault: "0x4192E04B59F97327E36236a7A97AA538543e190A",
      locker: "0x1FbA689e17Cb43098b74D05E574FeFB7a1161108",
      hook: "0x50D9e09dCF76239034556e7e08e71F0410bD78Ec",
      pairRegistry: "0xBd83232907ABFD36de2B1E2b193CDf60d74Fc17B",
      poolManager: "0x8366a39CC670B4001A1121B8F6A443A643e40951",
      wrappedNative: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
    },
  },
  arc: {
    key: "arc",
    name: "Arc",
    chainId: 5042,
    nativeSymbol: "USDC",
    explorer: "https://explorer.arc.io",
    venue: "uniswap-v4",
    apiPath: "/api/c/arc",
    deployedAtBlock: 30517680,
    graduationTarget: 11000000000000000000000n,
    launchWithFee: true,
    contracts: {
      factory: "0xBd7677dE392022aFE248146480AdbD31D6Ac14cA",
      router: "0x17781bd269DAbeE24fAF5C23e6c14FA84E328047",
      feeVault: "0x4192E04B59F97327E36236a7A97AA538543e190A",
      locker: "0x1FbA689e17Cb43098b74D05E574FeFB7a1161108",
      hook: "0x50D9e09dCF76239034556e7e08e71F0410bD78Ec",
      pairRegistry: "0xBd83232907ABFD36de2B1E2b193CDf60d74Fc17B",
      poolManager: "0x8366a39CC670B4001A1121B8F6A443A643e40951",
      wrappedNative: "0x8bcEaA40B9AcdfAedF85AdF4FF01F5Ad6517937f",
    },
  },
};

export const EVM_CHAIN_KEYS = Object.keys(CHAINS) as EvmChainKey[];

/** A chain by key or chain id. Throws on an unknown one. */
export function getChain(keyOrId: EvmChainKey | number): AwesomeChain {
  const c = typeof keyOrId === "number" ? Object.values(CHAINS).find((x) => x.chainId === keyOrId) : CHAINS[keyOrId];
  if (!c) throw new Error(`Awesome isn't deployed on chain ${String(keyOrId)}`);
  return c;
}

/** The native coin in router paths and as a pair token. */
export const NATIVE: Address = "0x0000000000000000000000000000000000000000";
/** Where Bull Run sends $牛逼. */
export const DEAD: Address = "0x000000000000000000000000000000000000dEaD";

/** $牛逼, the main token. */
export const MAIN_TOKEN = {
  symbol: "牛逼",
  name: "牛逼",
  decimals: 18,
  bsc: "0x9665f094d862f4d5c221843e019b463d3c607777" as Address,
} as const;

/** The public Awesome site and API. */
export const DEFAULT_BASE_URL = "https://xn--nib-9na0w.xyz";
