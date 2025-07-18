import { create } from "zustand";
import { Subspace } from "@subspace-protocol/sdk"
import type {
    ConnectionConfig,
    Profile,
    Server,
    Member,
    AoSigner
} from "@subspace-protocol/sdk"
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

interface CreateServerParams {
    name: string;
    logo?: string;
    description?: string;
}

interface SubspaceState {
    subspace: Subspace | null
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
            updateProfile: (params: { pfp?: string; displayName?: string; bio?: string; banner?: string }) => Promise<boolean>
        }
        servers: {
            get: (serverId: string) => Promise<Server | null>
            create: (data: CreateServerParams) => Promise<Server>
            join: (serverId: string) => Promise<boolean>
            leave: (serverId: string) => Promise<boolean>
            getMembers: (serverId: string, forceRefresh?: boolean) => Promise<any[]>
            refreshMembers: (serverId: string) => Promise<Member[]>
            getMember: (serverId: string, userId: string) => Promise<Member | null>
            updateMember: (serverId: string, params: { userId: string; nickname?: string; roles?: string[] }) => Promise<boolean>
        }
        internal: {
            rehydrateServers: () => void
        }
    }
}

export const useSubspace = create<SubspaceState>()(persist((set, get) => ({
    subspace: getSubspace(null, null),
    profile: null,
    profiles: {},
    servers: {},
    serverData: {},
    actions: {
        init: () => {
            const signer = useWallet.getState().actions.getSigner()
            const owner = useWallet.getState().address

            if (!owner) return

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

                if (!subspace) {
                    console.error("Subspace not initialized")
                    return null
                }

                // Don't run get profile if wallet address doesn't exist and no userId is provided
                if (!userId && !walletAddress) {
                    console.warn("No wallet address available for profile get")
                    return null
                }

                try {
                    let profile: Profile | null = null
                    try {
                        profile = await subspace.user.getProfile(userId || walletAddress)
                    } catch (e) {
                        // create their profile
                        const profileId = await subspace.user.createProfile()
                        profile = await subspace.user.getProfile(profileId)
                    }
                    if (profile) {
                        console.log('profile', profile)
                        const { primaryName, primaryLogo } = await getPrimaryName(profile.userId || userId)
                        if (userId) { // means we are getting the profile for someone elses id
                            set({ profiles: { ...get().profiles, [userId]: { ...profile, primaryName, primaryLogo } as ExtendedProfile } })
                            return profile as ExtendedProfile // read only
                        }
                        set({
                            profile: { ...profile, primaryName, primaryLogo } as ExtendedProfile,
                            profiles: { ...get().profiles, [profile.userId]: { ...profile, primaryName, primaryLogo } as ExtendedProfile }
                        })
                        // fetch users servers and save them to the profile
                        const servers = profile.serversJoined || []
                        for (const server of servers) {
                            // This will use persisted data if available for fast loading
                            const serverId = typeof server === 'string' ? server : (server as any).serverId
                            if (serverId) {
                                const serverObj = await get().actions.servers.get(serverId)
                                // The server will be added to state within the get() method
                            }
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
                        const profileId = await subspace.user.createProfile()
                        if (profileId) {
                            const profile = await subspace.user.getProfile(profileId)
                            if (profile) {
                                const { primaryName, primaryLogo } = await getPrimaryName(profile.userId)
                                set({ profile: { ...profile, primaryName, primaryLogo } as ExtendedProfile })
                                return profile as ExtendedProfile
                            }
                        }
                        return null
                    } else {
                        console.error(e)
                        return null
                    }
                }
            },
            getBulk: async (userIds: string[]) => {
                const subspace = get().subspace
                if (!subspace) {
                    console.error("Subspace not initialized")
                    return []
                }

                const profiles = await subspace.user.getBulkProfiles(userIds) as ExtendedProfile[]
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
            },
            updateProfile: async (params: { pfp?: string; displayName?: string; bio?: string; banner?: string }) => {
                const subspace = get().subspace
                if (!subspace) {
                    console.error("Subspace not initialized")
                    return false
                }

                try {
                    const success = await subspace.user.updateProfile(params)
                    return success
                } catch (error) {
                    console.error("Failed to update profile:", error)
                    return false
                }
            }
        },
        servers: {
            get: async (serverId: string) => {
                const subspace = get().subspace
                if (!subspace) throw new Error("Subspace not initialized")

                // Check if we already have a proper server instance
                const existingServer = get().servers[serverId]
                if (existingServer) {
                    return existingServer
                }

                try {
                    const server = await subspace.server.getServer(serverId)
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
            create: async (data: CreateServerParams) => {
                const subspace = get().subspace
                if (!subspace) throw new Error("Subspace not initialized")

                const serverId = await subspace.server.createServer(data)
                if (!serverId) throw new Error("Failed to create server")

                // Get the created server
                const server = await subspace.server.getServer(serverId)
                if (!server) throw new Error("Failed to retrieve created server")

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

                // join the server and wait for completion
                await get().actions.servers.join(serverId)

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

                const success = await subspace.user.joinServer(serverId)
                if (success) {
                    // After successfully joining, we need to fetch the server details
                    // and add it to our local state
                    const server = await subspace.server.getServer(serverId)

                    if (server) {
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

                const success = await subspace.user.leaveServer(serverId)
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
                if (!forceRefresh && (server as any).members) {
                    console.log(`Using cached members for server ${serverId}`)
                    return (server as any).members || [] as Member[]
                }

                try {
                    const membersData = await subspace.server.getAllMembers(serverId)
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
                    (server as any).members = members;
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
            },
            getMember: async (serverId: string, userId: string) => {
                const subspace = get().subspace
                if (!subspace) {
                    console.error("Subspace not initialized")
                    return null
                }

                try {
                    const member = await subspace.server.getMember(serverId, userId)
                    return member
                } catch (error) {
                    console.error("Failed to get member:", error)
                    return null
                }
            },
            updateMember: async (serverId: string, params: { userId: string; nickname?: string; roles?: string[] }) => {
                const subspace = get().subspace
                if (!subspace) {
                    console.error("Subspace not initialized")
                    return false
                }

                try {
                    const success = await subspace.server.updateMember(serverId, params)
                    return success
                } catch (error) {
                    console.error("Failed to update member:", error)
                    return false
                }
            }
        },
        internal: {
            rehydrateServers: () => {
                const subspace = get().subspace
                if (!subspace) {
                    return
                }

                const serverData = get().serverData
                const servers: Record<string, Server> = {}

                // Recreate server instances from persisted data
                for (const [serverId, data] of Object.entries(serverData)) {
                    try {
                        // Just use the persisted data as server data
                        servers[serverId] = data as Server
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

export function getSubspace(signer: AoSigner | null, owner: string): Subspace {
    const cuUrl = getCuUrl();

    const config: ConnectionConfig = {
        CU_URL: cuUrl,
        GATEWAY_URL: 'https://arweave.net',
        owner: owner || "0x69420", // Ensure we always have a valid owner for dryrun requests
    };

    if (signer) {
        config.signer = signer;
    }

    try {
        return new Subspace(config);
    } catch (error) {
        console.error("Failed to initialize Subspace:", error);

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
}
