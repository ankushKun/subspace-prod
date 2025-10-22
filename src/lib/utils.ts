import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ANT, AoANTReadable, ARIO } from "@ar.io/sdk"
import { Constants } from "@/lib/constants"
import type { JWKInterface } from "arweave/web/lib/wallet"
import Arweave from "arweave"
import { ArconnectSigner, ArweaveSigner, TurboFactory } from '@ardrive/turbo-sdk/web';
import { TIER_ID_TO_NAME, type IWanderTier } from "./types"


export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function getRelativeTimeString(timestamp: number) {
    const now = new Date()
    // Convert timestamp to milliseconds if it's in seconds
    const timestampMs = timestamp > 1e12 ? timestamp : timestamp * 1000
    const messageDate = new Date(timestampMs)
    const diff = now.getTime() - timestampMs
    const diffInSeconds = Math.floor(diff / 1000)

    // Handle future timestamps or very recent messages (within 5 seconds)
    if (diffInSeconds < -5) {
        return new Date(timestampMs).toLocaleString()
    }

    // Treat messages within 5 seconds (past or future) as "now"
    if (diffInSeconds <= 5) {
        return "now"
    }

    // Check if message is from today
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Reset time to start of day for comparison
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const yesterdayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
    const messageDateStart = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate())

    if (messageDateStart.getTime() === todayStart.getTime()) {
        // Same day - show relative time
        if (diffInSeconds < 60) {
            return "now"
        } else if (diffInSeconds < 3600) {
            return `${Math.floor(diffInSeconds / 60)}m`
        } else {
            return `${Math.floor(diffInSeconds / 3600)}h`
        }
    } else if (messageDateStart.getTime() === yesterdayStart.getTime()) {
        // Yesterday
        return "Yesterday"
    } else {
        // Different date - show absolute date
        return messageDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }
}

export function getDateKey(timestamp: number): string {
    // Convert timestamp to milliseconds if it's in seconds
    const timestampMs = timestamp > 1e12 ? timestamp : timestamp * 1000
    const date = new Date(timestampMs)

    // Return date in YYYY-MM-DD format for grouping
    return date.toISOString().split('T')[0]
}

export function getDateLabel(timestamp: number): string {
    // Convert timestamp to milliseconds if it's in seconds
    const timestampMs = timestamp > 1e12 ? timestamp : timestamp * 1000
    const messageDate = new Date(timestampMs)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Reset time to start of day for comparison
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const yesterdayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
    const messageDateStart = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate())

    if (messageDateStart.getTime() === todayStart.getTime()) {
        return "Today"
    } else if (messageDateStart.getTime() === yesterdayStart.getTime()) {
        return "Yesterday"
    } else {
        // Format as "Month Day, Year" (e.g., "January 15, 2024")
        return messageDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }
}


export function shortenAddress(address?: string | null) {
    if (!address || typeof address !== "string") return "";
    const safe = String(address);
    if (safe.length <= 10) return safe;
    return safe.slice(0, 5) + "..." + safe.slice(-5);
}

export async function runGQLQuery(query: string) {
    const response = await fetch("https://arnode.asia/graphql", {
        "headers": {
            "accept": "*/*",
            "content-type": "application/json",
        },
        "body": JSON.stringify({ query }),
        "method": "POST",
    });
    return response.json()
}

export function fileToUint8Array(file: File): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(new Uint8Array(reader.result as ArrayBuffer));
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
    });
}


export async function uploadFileAR(file: File, jwk?: JWKInterface) {
    const ar = Arweave.init({
        host: "arweave.net",
        port: 443,
        protocol: "https",
    });

    const data = await fileToUint8Array(file);
    const tx = await ar.createTransaction({ data }, jwk ?? "use_wallet");

    tx.addTag("Content-Type", file.type);
    tx.addTag("Name", file.name);
    tx.addTag(Constants.TagNames.AppName, Constants.TagValues.AppName);
    tx.addTag(Constants.TagNames.AppVersion, Constants.TagValues.AppVersion);
    tx.addTag(Constants.TagNames.SubspaceFunction, Constants.TagValues.UploadFileAR);

    await ar.transactions.sign(tx, jwk ? jwk : "use_wallet");
    const res = await ar.transactions.post(tx);

    if (res.status == 200) {
        return tx.id;
    } else {
        console.error("Failed to upload file to AR:", res)
        return undefined
    }
}

export async function uploadFileTurbo(file: File, jwk?: JWKInterface, customSigner?: any) {
    const signer = customSigner ? customSigner : jwk ? new ArweaveSigner(jwk) : new ArconnectSigner(window.arweaveWallet)
    try {
        const turbo = TurboFactory.authenticated({ signer })
        const res = await turbo.uploadFile({
            fileStreamFactory: () => file.stream(),
            fileSizeFactory: () => file.size,
            dataItemOpts: {
                tags: [
                    { name: Constants.TagNames.AppName, value: Constants.TagValues.AppName },
                    { name: Constants.TagNames.AppVersion, value: Constants.TagValues.AppVersion },
                    { name: Constants.TagNames.SubspaceFunction, value: Constants.TagValues.UploadFileTurbo },
                    { name: "Content-Type", value: file.type ?? "application/octet-stream" },
                    { name: "Name", value: file.name ?? "unknown" },
                ],
            }
        })
        return res.id;
    } catch (error) {
        console.error("Failed to upload file to Turbo:", error)
        return undefined
    }
}

export async function getPrimaryName(address: string) {
    const ario = ARIO.mainnet({
        // @ts-expect-error
        dryRun: false,
        cu: "https://cu.ardrive.io"
    })
    try {
        const { name } = await ario.getPrimaryName({ address })
        return name
    } catch (error) {
        console.error("No primary name found:", error)
        return null
    }
}

export async function getWanderTier(address: string): Promise<IWanderTier> {
    const url = `https://cache.wander.app/api/tier-info?address=${address}`
    const response = await fetch(url)
    const data = await response.json()
    const tier: IWanderTier = {
        balance: data.balance,
        rank: data.rank,
        tier: data.tier,
        progress: data.progress,
        snapshotTimestamp: data.snapshotTimestamp,
        totalHolders: data.totalHolders,
        tierString: TIER_ID_TO_NAME[data.tier as keyof typeof TIER_ID_TO_NAME],
    }
    return tier
}


