import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ANT, AoANTReadable, ARIO } from "@ar.io/sdk"
import { Constants } from "@/lib/constants"
import type { JWKInterface } from "arweave/web/lib/wallet"
import Arweave from "arweave"
import { ArconnectSigner, ArweaveSigner, TurboFactory } from '@ardrive/turbo-sdk/web';
import { dryrun } from "@permaweb/aoconnect"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function shortenAddress(address: string) {
    return address.slice(0, 5) + "..." + address.slice(-5)
}

export async function getPrimaryName(address: string): Promise<{ primaryName: string, primaryLogo: string }> {
    const ario = ARIO.mainnet()
    let primaryName = ""
    let primaryLogo = ""
    try {
        const res = await ario.getPrimaryName({ address })
        if (res.processId) {
            primaryName = res.name
            const ant = ANT.init({ processId: res.processId })
            const logoRes = await ant.getLogo()
            if (logoRes) primaryLogo = logoRes
        }
    } catch (e) {
        console.warn("No primary name found for address:", address)
    }
    return { primaryName, primaryLogo }
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
    console.log("signer", signer)
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

export type WanderTierInfo = {
    balance: string;
    progress: number;
    rank: number;
    snapshotTimestamp: number;
    tier: number;
    totalHolders: number;
}

export async function getWanderTierInfo(walletAddress: string): Promise<WanderTierInfo | null> {
    try {
        const dryrunRes = await dryrun({
            Owner: walletAddress,
            process: "rkAezEIgacJZ_dVuZHOKJR8WKpSDqLGfgPJrs_Es7CA",
            tags: [{ name: "Action", value: "Get-Wallet-Info" }]
        });

        const message = dryrunRes.Messages?.[0];

        if (!message?.Data) {
            console.warn(`No message data returned for wallet: ${walletAddress}`);
            return null;
        }

        let data;
        try {
            data = JSON.parse(message.Data);
        } catch (parseError) {
            console.warn(`Failed to parse tier data for wallet: ${walletAddress}`, parseError);
            return null;
        }

        if (data?.tier === undefined || data?.tier === null) {
            console.warn(`No tier data found for wallet: ${walletAddress}`);
            return null;
        }

        const tierInfo: WanderTierInfo = { ...data };
        return tierInfo;
    } catch (error) {
        console.warn(`Failed to fetch tier info for wallet: ${walletAddress}`, error);
        return null;
    }
}