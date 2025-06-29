import { Subspace, SubspaceClient, SubspaceClientReadOnly, type AoSigner } from "@subspace-protocol/sdk"

export function getSubspace(signer?: AoSigner): SubspaceClient {
    let subspace: SubspaceClient | null = null

    if (signer) {
        subspace = Subspace.init({ signer }) as SubspaceClient
    } else {
        if (!subspace) {
            throw new Error('Signer is required')
        }
    }

    return subspace
}

export function getSubspaceReadOnly(): SubspaceClientReadOnly {
    let subspace: SubspaceClientReadOnly | null = null

    if (!subspace) {
        subspace = Subspace.init({}) as SubspaceClientReadOnly
    }

    return subspace
}