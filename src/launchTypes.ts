import type { LaunchTypeId } from "./types.js";

export const LAUNCH_DEV_BAG = 0;
export const LAUNCH_FLYWHEEL = 1;
export const LAUNCH_BULL_RUN = 2;
export const LAUNCH_HOLDER_DRIP = 3;
export const LAUNCH_SQUAD = 4;

export interface LaunchTypeInfo {
  id: LaunchTypeId;
  key: "devBag" | "flywheel" | "bullRun" | "holderDrip" | "squad";
  name: string;
  nameZh: string;
  /** Where the creator share of every fee goes. */
  summary: string;
  summaryZh: string;
}

/** The five launch types: picked at launch, fixed forever. */
export const LAUNCH_TYPES: readonly LaunchTypeInfo[] = [
  { id: 0, key: "devBag", name: "Dev Bag", nameZh: "开发者钱包", summary: "The creator claims it.", summaryZh: "由创建者领取。" },
  { id: 1, key: "flywheel", name: "Flywheel", nameZh: "飞轮回购", summary: "Buys the coin in its own pool and burns it.", summaryZh: "在本币池中买入本币并销毁。" },
  { id: 2, key: "bullRun", name: "Bull Run", nameZh: "牛市燃烧", summary: "Buys $牛逼 and burns it.", summaryZh: "买入 $牛逼 并销毁。" },
  { id: 3, key: "holderDrip", name: "Holder Drip", nameZh: "持有人分红", summary: "Paid to the coin's holders, pro rata.", summaryZh: "按持仓比例分给持有人。" },
  { id: 4, key: "squad", name: "Squad", nameZh: "团队分成", summary: "Split between 2-5 fixed wallets.", summaryZh: "按固定比例分给 2-5 个钱包。" },
];

export const launchType = (idOrKey: number | string): LaunchTypeInfo | undefined =>
  LAUNCH_TYPES.find((t) => t.id === Number(idOrKey) || t.key === idOrKey || t.name.toLowerCase() === String(idOrKey).toLowerCase());

/** How every trading fee is shared (percent of the fee). */
export const FEE_SPLIT = {
  /** Routed by the coin's launch type. */
  launchType: 60,
  platform: 10,
  staking: 10,
  /** Buys back $牛逼 and burns it. */
  buybackBurn: 20,
} as const;
