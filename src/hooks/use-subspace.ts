import { create } from "zustand";
import { Profile, Server, Subspace, SubspaceClient } from "@subspace-protocol/sdk"
import type { AoSigner, createServerParams, Member } from "@subspace-protocol/sdk"
import { createJSONStorage, persist } from "zustand/middleware";
import { createSigner } from "@permaweb/aoconnect";
import { useWallet } from "./use-wallet";
import { useGlobalState } from "./use-global-state";
import { getPrimaryName } from "@/lib/utils";
import { Constants as WebConstants } from "@/lib/constants";

// Helper function to get CU URL from localStorage
function getCuUrl(): string {
    const storedUrl = localStorage.getItem('subspace-cu-url');
    return storedUrl || WebConstants.CuEndpoints.Randao; // Default to Randao
}

// Helper function to set CU URL in localStorage
export function setCuUrl(url: string): void {
    localStorage.setItem('subspace-cu-url', url);
}


type ExtendedProfile = Profile & { primaryName: string, primaryLogo: string }

interface SubspaceState {
    subspace: SubspaceClient | null
    profile: ExtendedProfile | null
    profiles: Record<string, ExtendedProfile>
    servers: Record<string, Server>
    serverData: Record<string, any> // For persistence only
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
    serverData: {},
    actions: {
        init: () => {
            const signer = useWallet.getState().actions.getSigner()
            const owner = useWallet.getState().address
            const subspace = getSubspace(signer, owner)
            set({ subspace })

            // Delay rehydration slightly to ensure subspace is ready
            setTimeout(() => {
                // Rehydrate servers from persisted data
                get().actions.internal.rehydrateServers()

                // Preload servers if we have persisted data
                const serverData = get().serverData
                if (Object.keys(serverData).length > 0) {
                    console.log("Preloading servers from persisted data")
                    // Start loading servers in the background
                    setTimeout(() => {
                        for (const serverId of Object.keys(serverData)) {
                            get().actions.servers.get(serverId).catch(console.error)
                        }
                    }, 100)
                }
            }, 50)
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
                if (!subspace) throw new Error("Subspace not initialized")

                // Check if we already have a proper server instance
                const existingServer = get().servers[serverId]
                if (existingServer && typeof existingServer.getMessages === 'function') {
                    return existingServer
                }

                try {
                    const server = await subspace.getServer(serverId)
                    if (server) {
                        // Store both the server instance and raw data for persistence
                        set({
                            servers: { ...get().servers, [serverId]: server },
                            serverData: {
                                ...get().serverData,
                                [serverId]: {
                                    serverId: server.serverId,
                                    name: server.name,
                                    ownerId: server.ownerId,
                                    logo: server.logo,
                                    memberCount: server.memberCount,
                                    channels: server.channels,
                                    categories: server.categories,
                                    roles: server.roles
                                }
                            }
                        })
                    }
                    return server
                } catch (e) {
                    console.error("Failed to get server:", e)
                    return null
                }
            },
            create: async (data: createServerParams) => {
                const subspace = get().subspace
                if (!subspace) throw new Error("Subspace not initialized")

                const server = await subspace.createServer(data)

                set({
                    servers: { ...get().servers, [server.serverId]: server },
                    serverData: {
                        ...get().serverData,
                        [server.serverId]: {
                            serverId: server.serverId,
                            name: server.name,
                            ownerId: server.ownerId,
                            logo: server.logo,
                            memberCount: server.memberCount,
                            channels: server.channels,
                            categories: server.categories,
                            roles: server.roles
                        }
                    }
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
                            serverData: {
                                ...get().serverData,
                                [server.serverId]: {
                                    serverId: server.serverId,
                                    name: server.name,
                                    ownerId: server.ownerId,
                                    logo: server.logo,
                                    memberCount: server.memberCount,
                                    channels: server.channels,
                                    categories: server.categories,
                                    roles: server.roles
                                }
                            }
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
                    const { [serverId]: removedServerData, ...remainingServerData } = get().serverData
                    set({
                        servers: remainingServers,
                        serverData: remainingServerData
                    })

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

                // Get the proper server instance
                const server = await get().actions.servers.get(serverId)
                if (!server) {
                    console.error("Server not found for getMembers")
                    return []
                }

                // Check if we already have cached members and don't need to refresh
                if (!forceRefresh && server.members) {
                    console.log(`Using cached members for server ${serverId}`)
                    return server.members || [] as Member[]
                }

                try {
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

                    // Cache the members in the server instance
                    server.members = members;
                    (server as any).membersLoaded = true;
                    (server as any).membersLoading = false;

                    // Update the server in state
                    set({
                        servers: { ...get().servers, [serverId]: server }
                    })

                    return members
                } catch (e) {
                    console.error("Failed to get members:", e)
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
                if (!subspace || !subspace.ao) {
                    return
                }

                const serverData = get().serverData
                const servers: Record<string, Server> = {}

                // Recreate Server instances from persisted data
                for (const [serverId, data] of Object.entries(serverData)) {
                    try {
                        // Create a new Server instance with the persisted data and current AO instance
                        const server = new Server(data, subspace.ao)
                        servers[serverId] = server
                    } catch (e) {
                        console.error(`Failed to rehydrate server ${serverId}:`, e)
                    }
                }

                if (Object.keys(servers).length > 0) {
                    console.log(`Rehydrated ${Object.keys(servers).length} servers`)
                }
                set({ servers })
            }
        }
    }
}), {
    name: "subspace",
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
        // Only persist the raw server data, not the server instances (they need to be recreated)
        serverData: state.serverData,
        profile: state.profile,
        profiles: state.profiles,
    })
}))





// ------------------------------------------------------------

export function getSubspace(signer: AoSigner | null, owner?: string): SubspaceClient {
    let subspace: SubspaceClient | null = null

    const cuUrl = getCuUrl();

    if (signer) {
        subspace = Subspace.init({ signer, Owner: owner || "", CU_URL: cuUrl })
    } else {
        // Try to initialize without signer for read-only operations
        subspace = Subspace.init({ Owner: owner || "", CU_URL: cuUrl })
    }

    if (!subspace) {
        const walletState = useWallet.getState();
        const strategy = walletState.connectionStrategy;

        if (strategy === 'wauth') {
            throw new Error('WAuth integration is not fully implemented yet. Please use ArWallet or WanderConnect for full functionality.');
        } else if (strategy === 'guest_user') {
            throw new Error('Guest user mode has limited functionality. Please connect a wallet for full features.');
        } else {
            throw new Error('Failed to initialize Subspace client. Please check your connection and try again.');
        }
    }

    return subspace
}
