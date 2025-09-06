import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ANT, AoANTReadable, ARIO } from "@ar.io/sdk"
import { Constants } from "@/lib/constants"
import type { JWKInterface } from "arweave/web/lib/wallet"
import Arweave from "arweave"
import { ArconnectSigner, ArweaveSigner, TurboFactory } from '@ardrive/turbo-sdk/web';
import type { IMember, IRole } from "@subspace-protocol/sdk/types"
import { EPermissions } from "@subspace-protocol/sdk"
import { TIER_ID_TO_NAME, type IWanderTier } from "./types"


export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function getRelativeTimeString(timestamp: number) {
    const now = new Date()
    // Convert timestamp to milliseconds if it's in seconds
    const timestampMs = timestamp > 1e12 ? timestamp : timestamp * 1000
    const diff = now.getTime() - timestampMs
    const diffInSeconds = Math.floor(diff / 1000)

    // Handle future timestamps
    if (diffInSeconds < 0) {
        return new Date(timestampMs).toLocaleString()
    }

    if (diffInSeconds < 60) {
        return "now"
    } else if (diffInSeconds < 3600) {
        return `${Math.floor(diffInSeconds / 60)}m`
    } else if (diffInSeconds < 86400) {
        return `${Math.floor(diffInSeconds / 3600)}h`
    } else if (diffInSeconds < 604800) {
        return `${Math.floor(diffInSeconds / 86400)}d`
    } else {
        // local datetime string
        return new Date(timestampMs).toLocaleString()
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

// Validate that a permissions bitfield contains only known bits
export function isPermissionValid(permission: number): boolean {
    console.log('\nDebug - Validating permission:', permission)

    if (!permission || permission <= 0) {
        console.log('Debug - Invalid permission: zero or negative')
        return false
    }

    // Calculate max valid permission value
    const validPermissions = Object.values(EPermissions).filter(val => typeof val === 'number')
    console.log('Debug - Valid permission values:', validPermissions)

    const maxValidPermission = validPermissions.reduce((acc, val) => acc | (val as number), 0)
    console.log('Debug - Max valid permission:', maxValidPermission)

    // Check if permission only contains valid bits
    const isValid = (permission & maxValidPermission) === permission
    console.log('Debug - Permission validation result:', isValid)

    return isValid
}

// Check if a role has a specific permission
export function roleHasPermission(role: IRole, permission: number): boolean {
    if (!role || !isPermissionValid(role.permissions) || !isPermissionValid(permission)) {
        return false
    }

    return (role.permissions & permission) === permission
}

// Check if a member has a specific permission
export function memberHasPermission(member: IMember, permission: number, server: { roles: Record<string, IRole>, ownerId: string }): boolean {
    console.log('\nDebug - memberHasPermission check:')
    console.log('Debug - Member:', member)
    console.log('Debug - Permission requested:', permission)
    console.log('Debug - Server:', { ownerId: server.ownerId, roles: server.roles })

    if (!member || !isPermissionValid(permission)) {
        console.log('Debug - Invalid member or permission')
        return false
    }

    // Server owner has all permissions
    if (member.id === server.ownerId) {
        console.log('Debug - Is server owner, granting all permissions')
        return true
    }

    if (!member.roles || Object.keys(member.roles).length === 0) {
        console.log('Debug - No roles found')
        return false
    }

    console.log('Debug - Checking roles:', member.roles)
    let totalPermissions = 0
    for (const roleId of Object.keys(member.roles)) {
        const role = server.roles[roleId]
        console.log('Debug - Checking role:', { roleId, role })

        if (role && isPermissionValid(role.permissions)) {
            console.log('Debug - Role permissions:', role.permissions)
            // Accumulate permissions from all roles
            totalPermissions = totalPermissions | role.permissions

            // Administrator permission overrides all other permissions
            if ((role.permissions & EPermissions.ADMINISTRATOR) === EPermissions.ADMINISTRATOR) {
                console.log('Debug - Found ADMINISTRATOR permission')
                return true
            }
        } else {
            console.log('Debug - Invalid role or permissions:', { roleId, role })
        }
    }

    console.log('Debug - Total accumulated permissions:', totalPermissions)
    console.log('Debug - Permission check result:', (totalPermissions & permission) === permission)

    // Check if accumulated permissions include the requested permission
    return (totalPermissions & permission) === permission
}

// Get all permissions a member has
export function getMemberPermissions(member: IMember, server: { roles: Record<string, IRole>, ownerId: string }): number {
    if (!member) return 0

    // Server owner has all permissions
    if (member.id === server.ownerId) {
        // Calculate all permissions by combining all enum values
        return Object.values(EPermissions)
            .filter(val => typeof val === 'number')
            .reduce((acc, val) => acc | (val as number), 0)
    }

    if (!member.roles || Object.keys(member.roles).length === 0) {
        return 0
    }

    let totalPermissions = 0
    for (const roleId of Object.keys(member.roles)) {
        const role = server.roles[roleId]
        if (role && isPermissionValid(role.permissions)) {
            totalPermissions = totalPermissions | role.permissions
            if ((role.permissions & EPermissions.ADMINISTRATOR) === EPermissions.ADMINISTRATOR) {
                // Return all permissions for administrator
                return Object.values(EPermissions)
                    .filter(val => typeof val === 'number')
                    .reduce((acc, val) => acc | (val as number), 0)
            }
        }
    }

    return totalPermissions
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
    const ario = ARIO.init({})
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