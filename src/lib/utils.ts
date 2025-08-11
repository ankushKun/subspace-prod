import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ANT, AoANTReadable, ARIO } from "@ar.io/sdk"
import { Constants } from "@/lib/constants"
import type { JWKInterface } from "arweave/web/lib/wallet"
import Arweave from "arweave"
import { ArconnectSigner, ArweaveSigner, TurboFactory } from '@ardrive/turbo-sdk/web';
import { dryrun } from "@permaweb/aoconnect"
import { ConnectionStrategies, useWallet } from "@/hooks/use-wallet"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
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