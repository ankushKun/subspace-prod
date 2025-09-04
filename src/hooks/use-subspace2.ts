import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import { SubspaceProfiles, SubspaceServers, Utils } from "@subspace-protocol/sdk"
import type { IProfile, IServer } from "@subspace-protocol/sdk/types"
import { WriteError } from "@subspace-protocol/sdk/types"

interface SubspaceState {
    profiles: Record<string, IProfile>
    servers: Record<string, IServer>
    actions: SubspaceActions
}

interface SubspaceActions {
    servers: {
        get: (serverId: string) => Promise<IServer | null>
        create: (data: { serverName: string, serverDescription?: string, serverPfp?: string, serverBanner?: string }) => Promise<IServer | null>
        join: (serverId: string) => Promise<boolean>
    },
    profiles: {
        get: (profileId: string) => Promise<IProfile | null>
        create: ({ pfp, banner, bio }: { pfp?: string, banner?: string, bio?: string }) => Promise<IProfile | null>
    }
}

export const useSubspace2 = create<SubspaceState>()(persist((set, get) => ({
    profiles: {},
    servers: {},
    actions: {
        profiles: {
            get: async (profileId: string) => {
                Utils.log({ type: "debug", label: "Getting Profile", data: profileId })
                const { result, duration } = await Utils.withDuration(() => SubspaceProfiles.getProfile(profileId))
                Utils.log({ type: result ? "success" : "error", label: "Got Profile", data: result, duration })
                result && set((state) => ({ profiles: { ...state.profiles, [profileId]: result } }))
                return result
            },
            create: async ({ pfp, banner, bio }: { pfp?: string, banner?: string, bio?: string }) => {
                Utils.log({ type: "debug", label: "Creating Profile", data: { pfp, banner, bio } })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceProfiles.createProfile({ pfp, banner, bio }))
                    Utils.log({ type: result ? "success" : "error", label: "Created Profile", data: result, duration })
                    result && set((state) => ({ profiles: { ...state.profiles, [result.id]: result } }))
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Creating Profile", data: e })
                    return null
                }
            }
        },
        servers: {
            get: async (serverId: string) => {
                Utils.log({ type: "debug", label: "Getting Server", data: serverId })
                const { result, duration } = await Utils.withDuration(() => SubspaceServers.getServer(serverId))
                Utils.log({ type: result ? "success" : "error", label: "Got Server", data: result, duration })
                result && set((state) => ({ servers: { ...state.servers, [serverId]: result } }))
                return result
            },
            create: async (data: { serverName: string, serverDescription?: string, serverPfp?: string, serverBanner?: string }) => {
                Utils.log({ type: "debug", label: "Creating Server", data: data })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceServers.createServer({ serverName: data.serverName, serverDescription: data.serverDescription, serverPfp: data.serverPfp, serverBanner: data.serverBanner }))
                    Utils.log({ type: "success", label: "Created Server", data: result, duration })
                    result && set((state) => ({ servers: { ...state.servers, [result.id]: result } }))
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Creating Server", data: e })
                    return null
                }
            },
            join: async (serverId: string) => {
                Utils.log({ type: "debug", label: "Joining Server", data: serverId })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceServers.joinServer(serverId))
                    Utils.log({ type: "success", label: "Joined Server", data: { result }, duration })
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Joining Server", data: e })
                    return false
                }
            }
        },

    },
}), {
    name: "subspace2-dev",
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
        profiles: state.profiles,
        servers: state.servers,
    })
}))

// Helper fns to access data from state

export function useProfiles(): Record<string, IProfile>
export function useProfiles(userId: string): IProfile | undefined
export function useProfiles(userId?: string): Record<string, IProfile> | IProfile | undefined {
    if (userId) {
        return useSubspace2((state) => state.profiles[userId])
    }
    return useSubspace2((state) => state.profiles)
}

export function useServers(): Record<string, IServer>
export function useServers(serverId: string): IServer | undefined
export function useServers(serverId?: string): Record<string, IServer> | IServer | undefined {
    if (serverId) {
        return useSubspace2((state) => state.servers[serverId])
    }
    return useSubspace2((state) => state.servers)
}