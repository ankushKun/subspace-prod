import { create } from "zustand";
import { Subspace } from "@subspace-protocol/sdk"
import type {
    ConnectionConfig,
    Profile,
    Server,
    Member,
    AoSigner,
    Message
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
    return storedUrl || WebConstants.CuEndpoints.ArnodeAsia; // Default to ArnodeAsia
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
    messages: Record<string, Record<string, Record<string, any>>>  // serverId -> channelId -> messageId -> message
    isCreatingProfile: boolean
    isLoadingProfile: boolean
    actions: {
        init: () => void
        profile: {
            get: (userId?: string) => Promise<ExtendedProfile | null>
            getBulk: (userIds: string[]) => Promise<ExtendedProfile[]>
            refresh: (silent?: boolean) => Promise<ExtendedProfile | null>
            updateProfile: (params: { pfp?: string; displayName?: string; bio?: string; banner?: string }) => Promise<boolean>
        }
        servers: {
            get: (serverId: string, forceRefresh?: boolean) => Promise<Server | null>
            create: (data: CreateServerParams) => Promise<Server>
            createCategory: (serverId: string, params: { name: string; orderId?: number }) => Promise<boolean>
            createChannel: (serverId: string, params: { name: string; categoryId?: string; orderId?: number; type?: 'text' | 'voice' }) => Promise<boolean>
            join: (serverId: string) => Promise<boolean>
            leave: (serverId: string) => Promise<boolean>
            getMembers: (serverId: string, forceRefresh?: boolean) => Promise<any[]>
            refreshMembers: (serverId: string) => Promise<Member[]>
            getMember: (serverId: string, userId: string) => Promise<Member | null>
            updateMember: (serverId: string, params: { userId: string; nickname?: string; roles?: string[] }) => Promise<boolean>
            getMessages: (serverId: string, channelId: string, limit?: number) => Promise<any[]>
            getMessage: (serverId: string, channelId: string, messageId: string) => Promise<any | null>
            sendMessage: (serverId: string, params: { channelId: string; content: string; replyTo?: string; attachments?: string }) => Promise<boolean>
            editMessage: (serverId: string, channelId: string, messageId: string, content: string) => Promise<boolean>
            deleteMessage: (serverId: string, channelId: string, messageId: string) => Promise<boolean>
            getCachedMessages: (serverId: string, channelId: string) => any[]
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
    messages: {},
    isCreatingProfile: false,
    isLoadingProfile: false,
    actions: {
        init: () => {
            const signer = useWallet.getState().actions.getSigner()
            let owner = useWallet.getState().address

            if (!owner) {
                owner = "0x69420"
                console.log("no owner, using default")
                return
            }

            const subspace = getSubspace(signer, owner)
            set({ subspace })

            // set state from profiles cache and then get the latest profile
            const cachedProfile = get().profiles[owner]
            if (cachedProfile) {
                set({ profile: cachedProfile as ExtendedProfile })
                // Still refresh in background but don't show loading state
                get().actions.profile.refresh(true)
            } else {
                set({ profile: null })
                get().actions.profile.get()
            }

            // Delay rehydration slightly to ensure subspace is ready
            setTimeout(() => {
                // Rehydrate servers from persisted data
                get().actions.internal.rehydrateServers()

                // Preload servers if we have persisted data
                const servers = get().servers
                if (Object.keys(servers).length > 0) {
                    // Start loading servers in the background
                    setTimeout(() => {
                        for (const serverId of Object.keys(servers)) {
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

                if (!subspace) return null

                // Don't run get profile if wallet address doesn't exist and no userId is provided
                if (!userId && !walletAddress) {
                    console.warn("No wallet address available for profile get")
                    return null
                }

                try {
                    let profile: Profile | null = null
                    set({ isLoadingProfile: true })

                    try {
                        profile = await subspace.user.getProfile(userId || walletAddress)
                    } catch (e) {
                        // Only show creating profile dialog if this is our own profile
                        // and we don't already have a profile in the store
                        if (!userId && !get().profile) {
                            // For WAuth connections, make sure the wallet is properly loaded before creating profile
                            const walletState = useWallet.getState()
                            if (walletState.connectionStrategy === 'wauth') {
                                try {
                                    // Check if WAuth wallet is loaded by trying to get it
                                    const wallet = await walletState.wauthInstance?.getWallet()
                                    if (!wallet) {
                                        console.log("WAuth wallet not loaded yet, skipping profile creation")
                                        return null
                                    }
                                } catch (walletError) {
                                    console.log("WAuth wallet not ready yet, skipping profile creation:", walletError)
                                    return null
                                }
                            }
                            
                            set({ isCreatingProfile: true })

                            try {
                                // create their profile
                                const profileId = await subspace.user.createProfile()
                                profile = await subspace.user.getProfile(profileId)

                                // If profile was created successfully, refresh the page
                                if (profile) {
                                    window.location.reload()
                                }
                            } catch (error) {
                                console.error("Failed to create profile:", error)
                                throw error
                            } finally {
                                set({ isCreatingProfile: false })
                            }
                        } else {
                            // For other users' profiles, just throw the error
                            throw e
                        }
                    }

                    if (profile) {
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
                } catch (error) {
                    console.error("Error in profile.get:", error)
                    throw error
                } finally {
                    set({ isLoadingProfile: false })
                }
            },
            getBulk: async (userIds: string[]) => {
                const subspace = get().subspace
                if (!subspace) return []

                // const profiles = await subspace.user.getBulkProfiles(userIds) as ExtendedProfile[]
                const profiles = []
                // set({
                //     profiles: profiles.reduce((acc, profile) => {
                //         acc[profile.userId] = { ...profile, primaryName: "", primaryLogo: "" } as ExtendedProfile
                //         return acc
                //     }, {} as Record<string, ExtendedProfile>)
                // })

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
            refresh: async (silent: boolean = false) => {
                // Force refresh the current user's profile
                const walletAddress = useWallet.getState().address
                if (!walletAddress) {
                    console.error("No wallet address available for profile refresh")
                    return null
                }

                try {
                    // If silent refresh, don't show loading states
                    if (!silent) {
                        set({ isLoadingProfile: true })
                    }
                    const refreshedProfile = await get().actions.profile.get()
                    return refreshedProfile
                } catch (error) {
                    console.error("Failed to refresh profile:", error)
                    return null
                } finally {
                    if (!silent) {
                        set({ isLoadingProfile: false })
                    }
                }
            },
            updateProfile: async (params: { pfp?: string; displayName?: string; bio?: string; banner?: string }) => {
                const subspace = get().subspace
                if (!subspace) return false

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
            get: async (serverId: string, forceRefresh: boolean = false) => {
                const subspace = get().subspace
                if (!subspace) return null

                // Check if we already have a proper server instance
                const existingServer = get().servers[serverId]
                if (existingServer && !forceRefresh) {
                    return existingServer
                }

                try {
                    const server = await subspace.server.getServer(serverId)
                    if (server) {
                        // Preserve existing members data if it exists
                        const preservedData: any = {}
                        if (existingServer) {
                            // Preserve members-related fields
                            if ((existingServer as any).members) {
                                preservedData.members = (existingServer as any).members
                            }
                            if ((existingServer as any).membersLoaded) {
                                preservedData.membersLoaded = (existingServer as any).membersLoaded
                            }
                            if ((existingServer as any).membersLoading) {
                                preservedData.membersLoading = (existingServer as any).membersLoading
                            }
                        }

                        // Merge server data with preserved data
                        const mergedServer = { ...server, ...preservedData }

                        // Store the merged server data
                        set({
                            servers: { ...get().servers, [serverId]: mergedServer },
                        })
                        return mergedServer
                    }
                    return server
                } catch (e) {
                    console.error("Failed to get server:", e)
                    return null
                }
            },
            create: async (data: CreateServerParams) => {
                const subspace = get().subspace
                if (!subspace) return

                const serverId = await subspace.server.createServer(data)
                if (!serverId) throw new Error("Failed to create server")

                // Get the created server
                const server = await subspace.server.getServer(serverId)
                if (!server) throw new Error("Failed to retrieve created server")

                set({
                    servers: { ...get().servers, [serverId]: server },
                })

                // join the server and wait for completion
                await get().actions.servers.join(serverId)

                // Refresh profile to update the joined servers list
                try {
                    await get().actions.profile.refresh()
                } catch (error) {
                    console.error("Failed to refresh profile after creating server:", error)
                }

                return server
            },
            createCategory: async (serverId: string, params: { name: string; orderId?: number }) => {
                const subspace = get().subspace
                if (!subspace) return false

                try {
                    const success = await subspace.server.createCategory(serverId, params)
                    if (success) {
                        // Wait a moment for the server to process the change
                        await new Promise(resolve => setTimeout(resolve, 200))

                        // Force refresh the server to get updated categories while preserving members
                        try {
                            const updatedServer = await get().actions.servers.get(serverId, true)
                            if (updatedServer) {
                                console.log("✅ Server refreshed successfully after category creation")
                            } else {
                                console.warn("⚠️ Server refresh returned null after category creation")
                            }
                        } catch (refreshError) {
                            console.error("❌ Failed to refresh server after category creation:", refreshError)
                            // Don't fail the operation just because refresh failed
                        }
                    }
                    return success
                } catch (error) {
                    console.error("Failed to create category:", error)
                    return false
                }
            },
            createChannel: async (serverId: string, params: { name: string; categoryId?: string; orderId?: number; type?: 'text' | 'voice' }) => {
                const subspace = get().subspace
                if (!subspace) return false

                try {
                    const success = await subspace.server.createChannel(serverId, params)
                    if (success) {
                        // Wait a moment for the server to process the change
                        await new Promise(resolve => setTimeout(resolve, 200))

                        // Force refresh the server to get updated channels while preserving members
                        try {
                            const updatedServer = await get().actions.servers.get(serverId, true)
                            if (updatedServer) {
                                console.log("✅ Server refreshed successfully after channel creation")
                            } else {
                                console.warn("⚠️ Server refresh returned null after channel creation")
                            }
                        } catch (refreshError) {
                            console.error("❌ Failed to refresh server after channel creation:", refreshError)
                            // Don't fail the operation just because refresh failed
                        }
                    }
                    return success
                } catch (error) {
                    console.error("Failed to create channel:", error)
                    return false
                }
            },
            join: async (serverId: string) => {
                const subspace = get().subspace
                if (!subspace) return false

                try {
                    const success = await subspace.user.joinServer(serverId)
                    if (success) {
                        // After successfully joining, we need to fetch the server details
                        // and add it to our local state
                        try {
                            const server = await subspace.server.getServer(serverId)
                            if (server) {
                                set({
                                    servers: { ...get().servers, [serverId]: server },
                                })
                            } else {
                                console.error(`Successfully joined server ${serverId} but failed to fetch server details`)
                            }
                        } catch (error) {
                            console.error(`Successfully joined server ${serverId} but failed to fetch server details:`, error)
                        }

                        // Refresh profile to update the joined servers list
                        try {
                            await get().actions.profile.refresh()
                        } catch (error) {
                            console.error("Failed to refresh profile after joining server:", error)
                        }
                    }
                    return success
                } catch (error) {
                    console.error("Failed to join server:", error)
                    return false
                }
            },
            leave: async (serverId: string) => {
                const subspace = get().subspace
                if (!subspace) return false

                try {
                    const success = await subspace.user.leaveServer(serverId)
                    if (success) {
                        // Remove the server from local state
                        const { [serverId]: removedServer, ...remainingServers } = get().servers
                        set({
                            servers: remainingServers,
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
                            console.error("Failed to refresh profile after leaving server:", error)
                        }
                    }
                    return success
                } catch (error) {
                    console.error("Failed to leave server:", error)
                    return false
                }
            },
            getMembers: async (serverId: string, forceRefresh: boolean = false): Promise<any[]> => {
                const subspace = get().subspace
                if (!subspace) return []

                // Get the proper server instance
                const server = await get().actions.servers.get(serverId)
                if (!server) {
                    console.error("Server not found for getMembers")
                    return []
                }

                // Check if we already have cached members and don't need to refresh
                if (!forceRefresh && (server as any).members && (server as any).membersLoaded) {
                    return (server as any).members || [] as Member[]
                }

                // Check if already loading to prevent duplicate requests
                if ((server as any).membersLoading) {
                    return (server as any).members || [] as Member[]
                }

                try {
                    // Set loading state
                    (server as any).membersLoading = true;
                    set({
                        servers: { ...get().servers, [serverId]: server }
                    })

                    const membersData = await subspace.server.getAllMembers(serverId)

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
                    console.error("Failed to get members:", e);
                    // Clear loading state on error
                    (server as any).membersLoading = false
                    set({
                        servers: { ...get().servers, [serverId]: server }
                    })
                    return []
                }
            },
            refreshMembers: async (serverId: string) => {
                return get().actions.servers.getMembers(serverId, true)
            },
            getMember: async (serverId: string, userId: string) => {
                const subspace = get().subspace
                if (!subspace) return

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
                if (!subspace) return

                try {
                    const success = await subspace.server.updateMember(serverId, params)
                    return success
                } catch (error) {
                    console.error("Failed to update member:", error)
                    return false
                }
            },
            getMessages: async (serverId: string, channelId: string, limit: number = 50) => {
                const subspace = get().subspace
                if (!subspace) return []

                try {
                    const response = await subspace.server.getMessages(serverId, {
                        channelId: channelId,
                        limit
                    })

                    if (response?.messages) {
                        // Process messages to ensure proper data types and sort by timestamp (oldest first)
                        const processedMessages = response.messages
                            .map((rawMessage: any) => ({
                                messageId: rawMessage.messageId,
                                content: rawMessage.content,
                                authorId: rawMessage.authorId,
                                timestamp: Number(rawMessage.timestamp),
                                edited: Boolean(rawMessage.edited),
                                attachments: rawMessage.attachments || "[]",
                                replyTo: rawMessage.replyTo,
                                messageTxId: rawMessage.messageTxId,
                                replyToMessage: rawMessage.replyToMessage
                            } as any))
                            .sort((a: any, b: any) => a.timestamp - b.timestamp)

                        // Cache the messages
                        const currentMessages = get().messages
                        const serverMessages = currentMessages[serverId] || {}
                        const channelMessages = serverMessages[channelId] || {}

                        // Convert array to messageId-keyed object for caching
                        const messageMap = processedMessages.reduce((acc: Record<string, any>, message: any) => {
                            acc[message.messageId] = message
                            return acc
                        }, {})

                        set({
                            messages: {
                                ...currentMessages,
                                [serverId]: {
                                    ...serverMessages,
                                    [channelId]: { ...channelMessages, ...messageMap }
                                }
                            }
                        })

                        return processedMessages
                    }
                    return []
                } catch (error) {
                    console.error("Failed to get messages:", error)
                    return []
                }
            },
            getMessage: async (serverId: string, channelId: string, messageId: string) => {
                // First check cache
                const cachedMessage = get().messages[serverId]?.[channelId]?.[messageId]
                if (cachedMessage) {
                    return cachedMessage
                }

                const subspace = get().subspace
                if (!subspace) return null

                try {
                    const message = await subspace.server.getMessage(serverId, messageId)
                    if (message) {
                        // Cache the message
                        const currentMessages = get().messages
                        const serverMessages = currentMessages[serverId] || {}
                        const channelMessages = serverMessages[channelId] || {}

                        set({
                            messages: {
                                ...currentMessages,
                                [serverId]: {
                                    ...serverMessages,
                                    [channelId]: {
                                        ...channelMessages,
                                        [messageId]: message
                                    }
                                }
                            }
                        })
                    }
                    return message
                } catch (error) {
                    console.error("Failed to get message:", error)
                    return null
                }
            },
            sendMessage: async (serverId: string, params: { channelId: string; content: string; replyTo?: string; attachments?: string }) => {
                const subspace = get().subspace
                if (!subspace) return false

                try {
                    const success = await subspace.server.sendMessage(serverId, params)
                    if (success) {
                        // Refresh messages for this channel after sending
                        setTimeout(() => {
                            get().actions.servers.getMessages(serverId, params.channelId)
                        }, 500)
                    }
                    return success
                } catch (error) {
                    console.error("Failed to send message:", error)
                    return false
                }
            },
            editMessage: async (serverId: string, channelId: string, messageId: string, content: string) => {
                const subspace = get().subspace
                if (!subspace) return false

                try {
                    const success = await subspace.server.editMessage(serverId, {
                        messageId,
                        content
                    })

                    if (success) {
                        // Update the cached message
                        const currentMessages = get().messages
                        const cachedMessage = currentMessages[serverId]?.[channelId]?.[messageId]

                        if (cachedMessage) {
                            const updatedMessage = {
                                ...cachedMessage,
                                content,
                                edited: true
                            }

                            set({
                                messages: {
                                    ...currentMessages,
                                    [serverId]: {
                                        ...currentMessages[serverId],
                                        [channelId]: {
                                            ...currentMessages[serverId][channelId],
                                            [messageId]: updatedMessage
                                        }
                                    }
                                }
                            })
                        }

                        // Also refresh messages to get the latest state
                        setTimeout(() => {
                            get().actions.servers.getMessages(serverId, channelId)
                        }, 500)
                    }
                    return success
                } catch (error) {
                    console.error("Failed to edit message:", error)
                    return false
                }
            },
            deleteMessage: async (serverId: string, channelId: string, messageId: string) => {
                const subspace = get().subspace
                if (!subspace) return false

                try {
                    const success = await subspace.server.deleteMessage(serverId, messageId)

                    if (success) {
                        // Remove message from cache
                        const currentMessages = get().messages
                        const serverMessages = currentMessages[serverId]
                        const channelMessages = serverMessages?.[channelId]

                        if (channelMessages && channelMessages[messageId]) {
                            const { [messageId]: removedMessage, ...remainingMessages } = channelMessages

                            set({
                                messages: {
                                    ...currentMessages,
                                    [serverId]: {
                                        ...serverMessages,
                                        [channelId]: remainingMessages
                                    }
                                }
                            })
                        }
                    }
                    return success
                } catch (error) {
                    console.error("Failed to delete message:", error)
                    return false
                }
            },
            getCachedMessages: (serverId: string, channelId: string) => {
                const cachedChannelMessages = get().messages[serverId]?.[channelId]
                if (!cachedChannelMessages) return []

                // Convert the messageId-keyed object back to a sorted array
                return Object.values(cachedChannelMessages)
                    .sort((a: any, b: any) => a.timestamp - b.timestamp)
            },
        },
        internal: {
            rehydrateServers: () => {
                const subspace = get().subspace
                if (!subspace) return

                const persistedServers = get().servers
                const rehydratedServers: Record<string, Server> = {}

                // Recreate server instances from persisted data
                for (const [serverId, data] of Object.entries(persistedServers)) {
                    try {
                        // Just use the persisted data as server data
                        rehydratedServers[serverId] = data as Server
                    } catch (e) {
                        console.error(`Failed to rehydrate server ${serverId}:`, e)
                    }
                }

                if (Object.keys(rehydratedServers).length > 0) {
                }
                set({ servers: rehydratedServers })
            }
        }
    }
}), {
    name: "subspace",
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
        servers: state.servers,
        messages: state.messages,
        profile: state.profile,
        profiles: state.profiles,
    })
}))

// ------------------------------------------------------------

export function getSubspace(signer: AoSigner | null, owner: string): Subspace {
    if (!owner) return null

    const cuUrl = getCuUrl();

    const config: ConnectionConfig = {
        CU_URL: cuUrl,
        GATEWAY_URL: 'https://arweave.net',
        owner: owner
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
