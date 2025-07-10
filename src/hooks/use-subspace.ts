import { create } from "zustand";
import { Profile, Server, Subspace, SubspaceClient } from "@subspace-protocol/sdk"
import type { AoSigner, createServerParams, Member } from "@subspace-protocol/sdk"
import { createJSONStorage, persist } from "zustand/middleware";
import { createSigner } from "@permaweb/aoconnect";
import { useWallet } from "./use-wallet";
import { useGlobalState } from "./use-global-state";
import { getPrimaryName } from "@/lib/utils";
import { Constants } from "@/lib/constants";


type ExtendedProfile = Profile & { primaryName: string, primaryLogo: string }

interface SubspaceState {
    subspace: SubspaceClient | null
    profile: ExtendedProfile | null
    profiles: Record<string, ExtendedProfile>
    servers: Record<string, Server>
    actions: {
        init: () => void
        profile: {
            get: (userId?: string) => Promise<ExtendedProfile | null>
            getBulk: (userIds: string[]) => Promise<ExtendedProfile[]>
            refresh: () => Promise<ExtendedProfile | null>
        }
        servers: {
            get: (serverId: string) => Promise<Server | null>
            create: (data: createServerParams) => Promise<Server>
            join: (serverId: string) => Promise<boolean>
            leave: (serverId: string) => Promise<boolean>
            getMembers: (serverId: string, forceRefresh?: boolean) => Promise<any[]>
            refreshMembers: (serverId: string) => Promise<Member[]>
        }
        internal: {
            rehydrateServers: () => void
        }
    }
}

export const useSubspace = create<SubspaceState>()(persist((set, get) => ({
    subspace: getSubspace(useWallet.getState().actions.getSigner()),
    profile: null,
    profiles: {},
    servers: {},
    actions: {
        init: () => {
            const signer = useWallet.getState().actions.getSigner()
            const owner = useWallet.getState().address
            set({ subspace: getSubspace(signer, owner) })

            // Preload servers if we have persisted data
            const servers = get().servers
            if (Object.keys(servers).length > 0) {
                console.log("Preloading servers from persisted data")
                // Start loading servers in the background
                setTimeout(() => {
                    for (const serverId of Object.keys(servers)) {
                        get().actions.servers.get(serverId).catch(console.error)
                    }
                }, 100)
            }
        },
        profile: {
            get: async (userId?: string) => {
                const subspace = get().subspace
                const walletAddress = useWallet.getState().address

                try {
                    const profile = await subspace.getProfile(userId || walletAddress)
                    if (profile) {
                        const { primaryName, primaryLogo } = await getPrimaryName(profile.userId)
                        if (userId) { // means we are getting the profile for someone elses id
                            set({ profiles: { ...get().profiles, [userId]: { ...profile, primaryName, primaryLogo } as ExtendedProfile } })
                            return profile as ExtendedProfile // read only
                        }
                        set({
                            profile: { ...profile, primaryName, primaryLogo } as ExtendedProfile,
                            profiles: { ...get().profiles, [profile.userId]: { ...profile, primaryName, primaryLogo } as ExtendedProfile }
                        })
                        // fetch users servers and save them to the profile
                        const servers = profile.serversJoined
                        for (const server of servers) {
                            // This will use persisted data if available for fast loading
                            const serverObj = await get().actions.servers.get(server.serverId)
                            // The server will be added to state within the get() method
                        }
                        return profile as ExtendedProfile
                    } else {
                        console.error("Failed to get profile")
                        set({ profile: null })
                    }
                } catch (e) {
                    console.error(e)
                    // create their profile
                    if (!userId) {
                        const profile = await subspace.createProfile()
                        const { primaryName, primaryLogo } = await getPrimaryName(profile.userId)
                        set({ profile: { ...profile, primaryName, primaryLogo } as ExtendedProfile })
                        return profile as ExtendedProfile
                    } else {
                        console.error(e)
                        return null
                    }
                }
            },
            getBulk: async (userIds: string[]) => {
                const subspace = get().subspace
                const profiles = await subspace.getBulkProfiles(userIds) as ExtendedProfile[]
                set({
                    profiles: profiles.reduce((acc, profile) => {
                        acc[profile.userId] = { ...profile, primaryName: "", primaryLogo: "" } as ExtendedProfile
                        return acc
                    }, {} as Record<string, ExtendedProfile>)
                })
                // get everyones primary name one by one with a small delay between each request
                for (const profile of profiles) {
                    const { primaryName, primaryLogo } = await getPrimaryName(profile.userId)
                    profile.primaryName = primaryName
                    profile.primaryLogo = primaryLogo
                    set({ profiles: { ...get().profiles, [profile.userId]: profile } })
                    await new Promise(resolve => setTimeout(resolve, 100))
                }

                // TODO: check if the profiles have primary name and logo when returned
                return profiles
            },
            refresh: async () => {
                // Force refresh the current user's profile
                const walletAddress = useWallet.getState().address
                if (!walletAddress) {
                    console.warn("No wallet address available for profile refresh")
                    return null
                }

                try {
                    console.log("Refreshing user profile...")
                    const refreshedProfile = await get().actions.profile.get()
                    return refreshedProfile
                } catch (error) {
                    console.error("Failed to refresh profile:", error)
                    return null
                }
            }
        },
        servers: {
            get: async (serverId: string) => {
                const subspace = get().subspace

                // Check if we already have the server instance
                const existingServer = get().servers[serverId]
                if (existingServer) {
                    return existingServer
                }

                // Check if we have persisted data to show immediately
                const persistedData = get().servers[serverId]
                if (persistedData) {
                    console.log(`Using persisted data for server ${serverId}`)
                    // Create a temporary server instance for immediate UI
                    // We'll still fetch fresh data in the background
                }

                try {
                    const server = await subspace.getServer(serverId)
                    if (server) {
                        set({
                            servers: { ...get().servers, [serverId]: server },
                        })
                    }
                    return server
                } catch (e) {
                    console.error("Failed to get servers:", e)
                    // If we have persisted data, try to return a basic server object
                    if (persistedData) {
                        console.log(`Falling back to persisted data for server ${serverId}`)
                        // We can't create a proper Server instance without the AO instance
                        // So we'll fetch it fresh when the subspace is available
                        return null
                    }
                    return null
                }
            },
            create: async (data: createServerParams) => {
                const subspace = get().subspace
                if (!subspace) throw new Error("Subspace not initialized")

                const server = await subspace.createServer(data)

                // Initialize member properties on the server instance
                // (server as any).members =[];
                // (server as any).membersLoaded = false;
                // (server as any).membersLoading = false;

                set({
                    servers: { ...get().servers, [server.serverId]: server },
                })

                // join the server and wait for completion
                await get().actions.servers.join(server.serverId)

                // Refresh profile to update the joined servers list
                try {
                    await get().actions.profile.refresh()
                } catch (error) {
                    console.warn("Failed to refresh profile after creating server:", error)
                }

                return server
            },
            join: async (serverId: string) => {
                const subspace = get().subspace
                if (!subspace) throw new Error("Subspace not initialized")

                const profile = await subspace.getProfile() as Profile
                if (!profile) {
                    throw new Error("Profile not initialized or missing joinServer method")
                }

                const success = await profile.joinServer({ serverId })
                if (success) {
                    // After successfully joining, we need to fetch the server details
                    // and add it to our local state
                    const server = await subspace.getServer(serverId)

                    if (server) {
                        set({
                            servers: { ...get().servers, [server.serverId]: server },
                        })

                        // Refresh profile to update the joined servers list
                        try {
                            await get().actions.profile.refresh()
                        } catch (error) {
                            console.warn("Failed to refresh profile after joining server:", error)
                        }
                    }
                }
                return success
            },
            leave: async (serverId: string) => {
                const subspace = get().subspace
                if (!subspace) throw new Error("Subspace not initialized")

                const profile = await subspace.getProfile() as Profile
                if (!profile) {
                    throw new Error("Profile not initialized or missing leaveServer method")
                }

                const success = await profile.leaveServer({ serverId })
                if (success) {
                    // Remove the server from local state
                    const { [serverId]: removedServer, ...remainingServers } = get().servers
                    set({ servers: remainingServers })

                    // Clear active server/channel if user was viewing the left server
                    const globalState = useGlobalState.getState()
                    if (globalState.activeServerId === serverId) {
                        globalState.actions.setActiveServerId("")
                        globalState.actions.setActiveChannelId("")
                    }

                    // Refresh profile to update the joined servers list
                    try {
                        await get().actions.profile.refresh()
                    } catch (error) {
                        console.warn("Failed to refresh profile after leaving server:", error)
                    }
                }
                return success
            },
            getMembers: async (serverId: string, forceRefresh: boolean = false) => {
                const subspace = get().subspace
                if (!subspace) throw new Error("Subspace not initialized")

                // Check if we already have cached members and don't need to refresh
                const existingServer = get().servers[serverId]
                if (!forceRefresh && existingServer?.members) {
                    console.log(`Using cached members for server ${serverId}`)
                    return existingServer.members || [] as Member[]
                }

                // Mark as loading
                if (existingServer) {
                    set({
                        servers: { ...get().servers, [serverId]: existingServer }
                    })
                }

                try {
                    const server = await subspace.getServer(serverId)
                    if (server) {
                        const membersData = await server.getAllMembers()
                        console.log("Raw members data:", membersData)

                        // Check if the result is an object (members by userId) or an array
                        let members: Member[] = []
                        if (Array.isArray(membersData)) {
                            members = membersData
                        } else if (typeof membersData === 'object' && membersData !== null) {
                            // Convert object to array of member objects
                            members = Object.entries(membersData).map(([userId, memberData]) => ({
                                userId,
                                ...(memberData as any)
                            }))
                        }

                        // Cache the members in both server instance and persistent data
                        const currentServer = get().servers[serverId]
                        if (currentServer) {
                            // Update the server instance directly to preserve methods
                            (currentServer as any).members = members;
                            (currentServer as any).membersLoaded = true;
                            (currentServer as any).membersLoading = false;

                            set({
                                servers: { ...get().servers, [serverId]: currentServer },
                            })
                        }

                        return members
                    }
                    return []
                } catch (e) {
                    console.error("Failed to get members:", e)

                    // Mark loading as false on error
                    const currentServer = get().servers[serverId]
                    if (currentServer) {
                        (currentServer as any).membersLoading = false
                        set({
                            servers: { ...get().servers, [serverId]: currentServer }
                        })
                    }

                    return []
                }
            },
            refreshMembers: async (serverId: string) => {
                console.log(`Force refreshing members for server ${serverId}`)
                return get().actions.servers.getMembers(serverId, true)
            }
        },
        internal: {
            rehydrateServers: () => {
                const subspace = get().subspace
                if (!subspace) return

                const servers = get().servers

                // Recreate Server instances from persisted data
                for (const [serverId, data] of Object.entries(servers)) {
                    try {
                        // Since we can't directly access the AO instance, we need to get a fresh server
                        // This is a compromise - we'll check if we already have the server instance
                        const existingServer = get().servers[serverId]
                        if (existingServer) {
                            servers[serverId] = existingServer
                        } else {
                            // We'll lazy-load the server when needed
                            console.log(`Server ${serverId} will be rehydrated on next access`)
                        }
                    } catch (e) {
                        console.error(`Failed to rehydrate server ${serverId}:`, e)
                    }
                }

                set({ servers })
            }
        }
    }
}), {
    name: "subspace",
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
        // Persist server data but not the server instances (they need to be recreated)
        servers: state.servers,
        profile: state.profile,
        profiles: state.profiles,
    })
}))





// ------------------------------------------------------------

export function getSubspace(signer: AoSigner, owner?: string): SubspaceClient {
    let subspace: SubspaceClient | null = null

    if (signer) {
        subspace = Subspace.init({ signer, Owner: owner || "", CU_URL: Constants.CuEndpoints.Randao })
    } else {
        subspace = Subspace.init({ Owner: owner || "", CU_URL: Constants.CuEndpoints.Randao })
    }
    if (!subspace) {
        throw new Error('Signer is required')
    }


    return subspace
}
