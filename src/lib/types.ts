

export type TierType = "Prime" | "Edge" | "Reserve" | "Select" | "Core";


export interface IWanderTier {
    tier: number;
    tierString: TierType;
    balance: string;
    rank: "" | number;
    progress: number;
    snapshotTimestamp: number;
    totalHolders: number;
}

export const TIER_ID_TO_NAME = {
    1: "Prime",
    2: "Edge",
    3: "Reserve",
    4: "Select",
    5: "Core",
} as const;