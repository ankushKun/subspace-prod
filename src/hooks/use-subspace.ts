import { create } from "zustand";
import { Subspace } from "@subspace-protocol/sdk"
import type {
    ConnectionConfig,
    Profile,
    Server,
    Member,
    AoSigner,
    Message,
    Friend,
    DMMessage,
    DMResponse
} from "@subspace-protocol/sdk"
import { createJSONStorage, persist } from "zustand/middleware";
import { createSigner } from "@permaweb/aoconnect";
import { useWallet } from "./use-wallet";
import { useGlobalState } from "./use-global-state";
import { getPrimaryName, getWanderTierInfo, type WanderTierInfo } from "@/lib/utils";
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

type ExtendedProfile = Profile & { primaryName: string, primaryLogo: string, wndrTier?: WanderTierInfo }

interface CreateServerParams {
    name: string;
    logo?: string;
    description?: string;
}

export interface ExtendedFriend extends Friend {
    profile?: ExtendedProfile;
    lastMessageTime?: number;
    unreadCount?: number;
}

interface DMConversation {
    friendId: string;
    dmProcessId: string;
    messages: Record<string, DMMessage>;
    lastMessageTime?: number;
    unreadCount?: number;
}

interface SubspaceState {
    subspace: Subspace | null
    profile: ExtendedProfile | null
    profiles: Record<string, ExtendedProfile>
    servers: Record<string, Server>
    messages: Record<string, Record<string, Record<string, any>>>  // serverId -> channelId -> messageId -> message
    // Friends and DMs state
    friends: Record<string, ExtendedFriend>  // userId -> friend info
    dmConversations: Record<string, DMConversation>  // friendId -> conversation
    isCreatingProfile: boolean
    isLoadingProfile: boolean
    // ✅ ADDED: Loading guards to prevent duplicate calls
    loadingProfiles: Set<string>  // userIds currently being loaded
    loadingServers: Set<string>   // serverIds currently being loaded
    loadingFriends: Set<string>   // friendIds currently being loaded
    loadingDMs: Set<string>       // friendIds with DMs currently being loaded
    // Track current wallet address to detect changes
    currentAddress: string
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
            update: (serverId: string, params: { name?: string; logo?: string; description?: string }) => Promise<boolean>
            createCategory: (serverId: string, params: { name: string; orderId?: number }) => Promise<boolean>
            createChannel: (serverId: string, params: { name: string; categoryId?: string; orderId?: number; type?: 'text' | 'voice' }) => Promise<boolean>
            updateChannel: (serverId: string, params: { channelId: string; name?: string; categoryId?: string | null; orderId?: number; allowMessaging?: 0 | 1; allowAttachments?: 0 | 1 }) => Promise<boolean>
            deleteChannel: (serverId: string, channelId: string) => Promise<boolean>
            updateCategory: (serverId: string, params: { categoryId: string; name?: string; orderId?: number }) => Promise<boolean>
            deleteCategory: (serverId: string, categoryId: string) => Promise<boolean>
            join: (serverId: string) => Promise<boolean>
            leave: (serverId: string) => Promise<boolean>
            getMembers: (serverId: string, forceRefresh?: boolean) => Promise<any[]>
            refreshMembers: (serverId: string) => Promise<Member[]>
            getMember: (serverId: string, userId: string) => Promise<Member | null>
            updateMember: (serverId: string, params: { userId: string; nickname?: string; roles?: string[] }) => Promise<boolean>
            createRole: (serverId: string, params: { name: string; color?: string; permissions?: number | string; position?: number }) => Promise<boolean>
            updateRole: (serverId: string, params: { roleId: string; name?: string; color?: string; permissions?: number | string; position?: number; orderId?: number }) => Promise<boolean>
            reorderRole: (serverId: string, roleId: string, newOrderId: number) => Promise<boolean>
            moveRoleAbove: (serverId: string, roleId: string, targetRoleId: string) => Promise<boolean>
            moveRoleBelow: (serverId: string, roleId: string, targetRoleId: string) => Promise<boolean>
            deleteRole: (serverId: string, roleId: string) => Promise<boolean>
            assignRole: (serverId: string, params: { userId: string; roleId: string }) => Promise<boolean>
            unassignRole: (serverId: string, params: { userId: string; roleId: string }) => Promise<boolean>
            getMessages: (serverId: string, channelId: string, limit?: number) => Promise<any[]>
            getMessage: (serverId: string, channelId: string, messageId: string) => Promise<any | null>
            sendMessage: (serverId: string, params: { channelId: string; content: string; replyTo?: string; attachments?: string }) => Promise<boolean>
            editMessage: (serverId: string, channelId: string, messageId: string, content: string) => Promise<boolean>
            deleteMessage: (serverId: string, channelId: string, messageId: string) => Promise<boolean>
            getCachedMessages: (serverId: string, channelId: string) => any[]
        }
        friends: {
            getFriends: () => Promise<ExtendedFriend[]>
            sendFriendRequest: (userId: string) => Promise<boolean>
            acceptFriendRequest: (userId: string) => Promise<boolean>
            rejectFriendRequest: (userId: string) => Promise<boolean>
            removeFriend: (userId: string) => Promise<boolean>
            refreshFriends: () => Promise<void>
        }
        dms: {
            getConversation: (friendId: string) => Promise<DMConversation | null>
            getMessages: (friendId: string, limit?: number) => Promise<DMMessage[]>
            sendMessage: (friendId: string, params: { content: string; attachments?: string; replyTo?: number }) => Promise<boolean>
            editMessage: (friendId: string, messageId: string, content: string) => Promise<boolean>
            deleteMessage: (friendId: string, messageId: string) => Promise<boolean>
            getCachedMessages: (friendId: string) => DMMessage[]
            markAsRead: (friendId: string) => void
        }
        internal: {
            rehydrateServers: () => void
            loadUserServersSequentially: (profile: ExtendedProfile) => void
        }
        clear: () => void
    }
}

export const useSubspace = create<SubspaceState>()(persist((set, get) => ({
    subspace: getSubspace(null, null),
    profile: null,
    profiles: {},
    servers: {},
    messages: {},
    friends: {},
    dmConversations: {},
    isCreatingProfile: false,
    isLoadingProfile: false,
    loadingProfiles: new Set<string>(),
    loadingServers: new Set<string>(),
    loadingFriends: new Set<string>(),
    loadingDMs: new Set<string>(),
    currentAddress: "",
    actions: {
        init: async () => {
            try {
                const signer = await useWallet.getState().actions.getSigner()
                let owner = useWallet.getState().address

                if (!owner) {
                    owner = "0x69420"
                    console.log("[hooks/use-subspace] no owner, using default")
                    return
                }

                const currentState = get()
                const previousAddress = currentState.currentAddress

                // Check if address has changed (wallet switch)
                if (previousAddress && previousAddress !== owner) {
                    console.log(`[hooks/use-subspace] Address changed from ${previousAddress} to ${owner}, clearing friends and DMs`)
                    set({
                        friends: {},
                        dmConversations: {},
                        loadingFriends: new Set<string>(),
                        loadingDMs: new Set<string>(),
                        currentAddress: owner
                    })
                } else if (!previousAddress) {
                    // First time initialization
                    set({ currentAddress: owner })
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

                // ✅ UPDATED: Removed delayed server loading since servers are now loaded sequentially after profile fetch
                // Rehydrate servers from persisted data only
                get().actions.internal.rehydrateServers()
            } catch (error) {
                console.error("Failed to initialize Subspace:", error)
                // Don't throw here, just log the error
            }
        },
        profile: {
            get: async (userId?: string) => {
                const subspace = get().subspace
                const walletAddress = useWallet.getState().address

                if (!subspace) return null

                // Don't run get profile if wallet address doesn't exist and no userId is provided
                if (!userId && !walletAddress) {
                    console.warn("[hooks/use-subspace] No wallet address available for profile get")
                    return null
                }

                const targetUserId = userId || walletAddress

                // ✅ ADDED: Check if this profile is already being loaded
                if (get().loadingProfiles.has(targetUserId)) {
                    console.log(`[hooks/use-subspace] Profile ${targetUserId} is already being loaded, skipping duplicate call`)
                    return get().profiles[targetUserId] || null
                }

                // ✅ ADDED: Check if we already have this profile cached (for other users)
                if (userId && get().profiles[userId]) {
                    return get().profiles[userId]
                }

                try {
                    let profile: ExtendedProfile | null = null

                    // ✅ ADDED: Mark this profile as being loaded
                    const currentLoadingProfiles = new Set(get().loadingProfiles)
                    currentLoadingProfiles.add(targetUserId)
                    set({
                        isLoadingProfile: true,
                        loadingProfiles: currentLoadingProfiles
                    })

                    try {
                        profile = await subspace.user.getProfile(targetUserId) as ExtendedProfile
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
                                        console.log("[hooks/use-subspace] WAuth wallet not loaded yet, skipping profile creation")
                                        return null
                                    }
                                } catch (walletError) {
                                    console.log("[hooks/use-subspace] WAuth wallet not ready yet, skipping profile creation:", walletError)
                                    return null
                                }
                            }

                            set({ isCreatingProfile: true })

                            try {
                                // create their profile
                                const profileId = await subspace.user.createProfile()
                                try {
                                    profile = await subspace.user.getProfile(profileId) as ExtendedProfile
                                } catch (e) {
                                    console.error("Failed to get profile:", e)
                                    throw e
                                }
                            } catch (error) {
                                console.error("Failed to create profile:", error)
                                throw error
                            } finally {
                                set({ isCreatingProfile: false })
                                // If profile was created successfully, refresh the page
                                window.location.reload()
                            }
                        } else {
                            // For other users' profiles, just throw the error
                            throw e
                        }
                    }

                    if (profile) {
                        const { primaryName, primaryLogo } = await getPrimaryName(profile.userId || userId)

                        // ✅ FIXED: Fetch tier info for ALL users, not just current user
                        try {
                            const tierInfo = await getWanderTierInfo(profile.userId || userId)
                            profile.wndrTier = tierInfo // Can be WanderTierInfo or null
                        } catch (e) {
                            console.error("Failed to get Wander tier info:", e)
                            profile.wndrTier = null
                        }

                        // Create enhanced profile with all data
                        const enhancedProfile = {
                            ...profile,
                            primaryName,
                            primaryLogo
                        } as ExtendedProfile

                        if (userId) {
                            // For other users: update profiles cache and return
                            set({ profiles: { ...get().profiles, [userId]: enhancedProfile } })
                            return enhancedProfile
                        } else {
                            // For current user: update both profile and profiles cache
                            set({
                                profile: enhancedProfile,
                                profiles: { ...get().profiles, [profile.userId]: enhancedProfile }
                            })

                            // ✅ NEW: Load user's servers one by one after profile is fetched
                            get().actions.internal.loadUserServersSequentially(enhancedProfile)

                            return enhancedProfile
                        }
                    } else {
                        console.error("[hooks/use-subspace] Failed to get profile")
                        set({ profile: null })
                    }
                } catch (error) {
                    console.error("[hooks/use-subspace] Error in profile.get:", error)
                    throw error
                } finally {
                    // ✅ ADDED: Clear loading state for this profile
                    const currentLoadingProfiles = new Set(get().loadingProfiles)
                    currentLoadingProfiles.delete(targetUserId)
                    set({
                        isLoadingProfile: false,
                        loadingProfiles: currentLoadingProfiles
                    })
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
                for (const userId of userIds) {
                    // run profile.get for each user id
                    const profile = await get().actions.profile.get(userId)
                    if (profile) {
                        set({ profiles: { ...get().profiles, [userId]: profile } })
                    }
                    await new Promise(resolve => setTimeout(resolve, 333))

                    // const { primaryName, primaryLogo } = await getPrimaryName(profile.userId)
                    // profile.primaryName = primaryName
                    // profile.primaryLogo = primaryLogo
                    // set({ profiles: { ...get().profiles, [profile.userId]: profile } })
                    // await new Promise(resolve => setTimeout(resolve, 220))
                }

                return profiles
            },
            refresh: async (silent: boolean = false) => {
                // Force refresh the current user's profile
                const walletAddress = useWallet.getState().address
                if (!walletAddress) {
                    console.error("[hooks/use-subspace] No wallet address available for profile refresh")
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
                    console.error("[hooks/use-subspace] Failed to refresh profile:", error)
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
                    console.error("[hooks/use-subspace] Failed to update profile:", error)
                    return false
                }
            }
        },
        servers: {
            get: async (serverId: string, forceRefresh: boolean = false) => {
                const subspace = get().subspace
                if (!subspace) return null

                // ✅ ADDED: Check if this server is already being loaded
                if (get().loadingServers.has(serverId)) {
                    return get().servers[serverId] || null
                }

                // Check if we already have a proper server instance
                const existingServer = get().servers[serverId]
                if (existingServer && !forceRefresh) {
                    return existingServer
                }

                try {
                    // ✅ ADDED: Mark this server as being loaded
                    const currentLoadingServers = new Set(get().loadingServers)
                    currentLoadingServers.add(serverId)
                    set({ loadingServers: currentLoadingServers })

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

                        // Auto-load members when forceRefresh is true (indicating server activation)
                        if (forceRefresh) {
                            const hasMembers = (mergedServer as any)?.members?.length > 0
                            const membersLoaded = (mergedServer as any)?.membersLoaded
                            const membersLoading = (mergedServer as any)?.membersLoading;



                            // Set loading state immediately
                            (mergedServer as any).membersLoading = true;
                            set({ servers: { ...get().servers, [serverId]: mergedServer } })

                            // Load members in background without blocking server return
                            setTimeout(async () => {
                                try {
                                    const membersData = await subspace.server.getAllMembers(serverId)

                                    // Check if the result is an object (members by userId) or an array
                                    let members: any[] = []
                                    if (Array.isArray(membersData)) {
                                        members = membersData
                                    } else if (typeof membersData === 'object' && membersData !== null) {
                                        // Convert object to array of member objects
                                        members = Object.entries(membersData).map(([userId, memberData]) => ({
                                            userId,
                                            ...(memberData as any)
                                        }))
                                    }

                                    // Update server with members
                                    const currentServer = get().servers[serverId]
                                    if (currentServer) {
                                        (currentServer as any).members = members;
                                        (currentServer as any).membersLoaded = true;
                                        (currentServer as any).membersLoading = false;

                                        set({
                                            servers: { ...get().servers, [serverId]: currentServer }
                                        })

                                        // ✅ FIXED: Removed automatic profile.getBulk() to break the loop
                                        // Profiles will be loaded centrally in member-list component when needed
                                    }
                                } catch (error) {
                                    console.error("[hooks/use-subspace] ❌ Failed to load members:", error)
                                    // Clear loading state on error
                                    const currentServer = get().servers[serverId]
                                    if (currentServer) {
                                        (currentServer as any).membersLoading = false
                                        set({
                                            servers: { ...get().servers, [serverId]: currentServer }
                                        })
                                    }
                                }
                            }, 0)

                        }

                        return mergedServer
                    }
                    return server
                } catch (e) {
                    console.error("[hooks/use-subspace] Failed to get server:", e)
                    return null
                } finally {
                    // ✅ ADDED: Clear loading state for this server
                    const currentLoadingServers = new Set(get().loadingServers)
                    currentLoadingServers.delete(serverId)
                    set({ loadingServers: currentLoadingServers })
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
                    console.error("[hooks/use-subspace] Failed to refresh profile after creating server:", error)
                }

                return server
            },
            update: async (serverId: string, params: { name?: string; logo?: string; description?: string }) => {
                const subspace = get().subspace
                if (!subspace) return false

                try {
                    const success = await subspace.server.updateServer(serverId, params)
                    if (success) {
                        // Wait a moment for the server to process the change
                        await new Promise(resolve => setTimeout(resolve, 200))

                        // Force refresh the server to get updated data while preserving members
                        try {
                            const updatedServer = await get().actions.servers.get(serverId, true)
                        } catch (refreshError) {
                            console.error("❌ Failed to refresh server after profile update:", refreshError)
                            // Don't fail the operation just because refresh failed
                        }
                    }
                    return success
                } catch (error) {
                    console.error("Failed to update server:", error)
                    return false
                }
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
            updateChannel: async (serverId: string, params: { channelId: string; name?: string; categoryId?: string | null; orderId?: number; allowMessaging?: 0 | 1; allowAttachments?: 0 | 1 }) => {
                const subspace = get().subspace
                if (!subspace) return false

                try {
                    const success = await subspace.server.updateChannel(serverId, params)
                    if (success) {
                        // Wait a moment for the server to process the change
                        await new Promise(resolve => setTimeout(resolve, 200))

                        // Force refresh the server to get updated channels while preserving members
                        try {
                            const updatedServer = await get().actions.servers.get(serverId, true)
                        } catch (refreshError) {
                            console.error("❌ Failed to refresh server after channel update:", refreshError)
                        }
                    }
                    return success
                } catch (error) {
                    console.error("Failed to update channel:", error)
                    return false
                }
            },
            deleteChannel: async (serverId: string, channelId: string) => {
                const subspace = get().subspace
                if (!subspace) return false

                try {
                    const success = await subspace.server.deleteChannel(serverId, channelId)
                    if (success) {
                        // Wait a moment for the server to process the change
                        await new Promise(resolve => setTimeout(resolve, 200))

                        // Force refresh the server to get updated channels while preserving members
                        try {
                            const updatedServer = await get().actions.servers.get(serverId, true)
                        } catch (refreshError) {
                            console.error("❌ Failed to refresh server after channel deletion:", refreshError)
                        }
                    }
                    return success
                } catch (error) {
                    console.error("Failed to delete channel:", error)
                    return false
                }
            },
            updateCategory: async (serverId: string, params: { categoryId: string; name?: string; orderId?: number }) => {
                const subspace = get().subspace
                if (!subspace) return false

                try {
                    const success = await subspace.server.updateCategory(serverId, params)
                    if (success) {
                        // Wait a moment for the server to process the change
                        await new Promise(resolve => setTimeout(resolve, 200))

                        // Force refresh the server to get updated categories while preserving members
                        try {
                            const updatedServer = await get().actions.servers.get(serverId, true)
                        } catch (refreshError) {
                            console.error("❌ Failed to refresh server after category update:", refreshError)
                        }
                    }
                    return success
                } catch (error) {
                    console.error("Failed to update category:", error)
                    return false
                }
            },
            deleteCategory: async (serverId: string, categoryId: string) => {
                const subspace = get().subspace
                if (!subspace) return false

                try {
                    const success = await subspace.server.deleteCategory(serverId, categoryId)
                    if (success) {
                        // Wait a moment for the server to process the change
                        await new Promise(resolve => setTimeout(resolve, 200))

                        // Force refresh the server to get updated categories while preserving members
                        try {
                            const updatedServer = await get().actions.servers.get(serverId, true)
                        } catch (refreshError) {
                            console.error("❌ Failed to refresh server after category deletion:", refreshError)
                        }
                    }
                    return success
                } catch (error) {
                    console.error("Failed to delete category:", error)
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

                // Get the server instance from current state, don't call servers.get to avoid recursion
                const server = get().servers[serverId]
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
            createRole: async (serverId: string, params: { name: string; color?: string; permissions?: number | string; position?: number }) => {
                const subspace = get().subspace
                if (!subspace) return false

                try {
                    const success = await subspace.server.createRole(serverId, params)
                    if (success) {
                        // Wait a moment for the server to process the change
                        await new Promise(resolve => setTimeout(resolve, 200))

                        // Force refresh the server to get updated roles
                        try {
                            const updatedServer = await get().actions.servers.get(serverId, true)
                        } catch (refreshError) {
                            console.error("❌ Failed to refresh server after role creation:", refreshError)
                        }
                    }
                    return success
                } catch (error) {
                    console.error("Failed to create role:", error)
                    return false
                }
            },
            updateRole: async (serverId: string, params: { roleId: string; name?: string; color?: string; permissions?: number | string; position?: number; orderId?: number }) => {
                const subspace = get().subspace
                if (!subspace) return false

                try {
                    const success = await subspace.server.updateRole(serverId, params)
                    if (success) {
                        // Wait a moment for the server to process the change
                        await new Promise(resolve => setTimeout(resolve, 200))

                        // Force refresh the server to get updated roles
                        try {
                            const updatedServer = await get().actions.servers.get(serverId, true)
                        } catch (refreshError) {
                            console.error("❌ Failed to refresh server after role update:", refreshError)
                        }
                    }
                    return success
                } catch (error) {
                    console.error("Failed to update role:", error)
                    return false
                }
            },
            reorderRole: async (serverId: string, roleId: string, newOrderId: number) => {
                const subspace = get().subspace
                if (!subspace) return false

                try {
                    const success = await (subspace.server as any).reorderRole(serverId, roleId, newOrderId)
                    if (success) {
                        // Wait a moment for the server to process the change
                        await new Promise(resolve => setTimeout(resolve, 200))

                        // Force refresh the server to get updated role order
                        try {
                            const updatedServer = await get().actions.servers.get(serverId, true)
                        } catch (refreshError) {
                            console.error("❌ Failed to refresh server after role reorder:", refreshError)
                        }
                    }
                    return success
                } catch (error) {
                    console.error("Failed to reorder role:", error)
                    return false
                }
            },
            moveRoleAbove: async (serverId: string, roleId: string, targetRoleId: string) => {
                const subspace = get().subspace
                if (!subspace) return false

                try {
                    const success = await (subspace.server as any).moveRoleAbove(serverId, roleId, targetRoleId)
                    if (success) {
                        // Wait a moment for the server to process the change
                        await new Promise(resolve => setTimeout(resolve, 200))

                        // Force refresh the server to get updated role order
                        try {
                            const updatedServer = await get().actions.servers.get(serverId, true)
                        } catch (refreshError) {
                            console.error("❌ Failed to refresh server after moving role above:", refreshError)
                        }
                    }
                    return success
                } catch (error) {
                    console.error("Failed to move role above:", error)
                    return false
                }
            },
            moveRoleBelow: async (serverId: string, roleId: string, targetRoleId: string) => {
                const subspace = get().subspace
                if (!subspace) return false

                try {
                    const success = await (subspace.server as any).moveRoleBelow(serverId, roleId, targetRoleId)
                    if (success) {
                        // Wait a moment for the server to process the change
                        await new Promise(resolve => setTimeout(resolve, 200))

                        // Force refresh the server to get updated role order
                        try {
                            const updatedServer = await get().actions.servers.get(serverId, true)
                        } catch (refreshError) {
                            console.error("❌ Failed to refresh server after moving role below:", refreshError)
                        }
                    }
                    return success
                } catch (error) {
                    console.error("Failed to move role below:", error)
                    return false
                }
            },
            deleteRole: async (serverId: string, roleId: string) => {
                const subspace = get().subspace
                if (!subspace) return false

                try {
                    const success = await subspace.server.deleteRole(serverId, roleId)
                    if (success) {
                        // Wait a moment for the server to process the change
                        await new Promise(resolve => setTimeout(resolve, 200))

                        // Force refresh the server to get updated roles
                        try {
                            const updatedServer = await get().actions.servers.get(serverId, true)
                        } catch (refreshError) {
                            console.error("❌ Failed to refresh server after role deletion:", refreshError)
                        }
                    }
                    return success
                } catch (error) {
                    console.error("Failed to delete role:", error)
                    return false
                }
            },
            assignRole: async (serverId: string, params: { userId: string; roleId: string }) => {
                const subspace = get().subspace
                if (!subspace) return false

                try {
                    const success = await subspace.server.assignRole(serverId, params)
                    if (success) {
                        // Refresh members to update role assignments
                        try {
                            await get().actions.servers.refreshMembers(serverId)
                        } catch (refreshError) {
                            console.error("❌ Failed to refresh members after role assignment:", refreshError)
                        }
                    }
                    return success
                } catch (error) {
                    console.error("Failed to assign role:", error)
                    return false
                }
            },
            unassignRole: async (serverId: string, params: { userId: string; roleId: string }) => {
                const subspace = get().subspace
                if (!subspace) return false

                try {
                    const success = await subspace.server.unassignRole(serverId, params)
                    if (success) {
                        // Refresh members to update role assignments
                        try {
                            await get().actions.servers.refreshMembers(serverId)
                        } catch (refreshError) {
                            console.error("❌ Failed to refresh members after role unassignment:", refreshError)
                        }
                    }
                    return success
                } catch (error) {
                    console.error("Failed to unassign role:", error)
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
        friends: {
            getFriends: async () => {
                const subspace = get().subspace
                const profile = get().profile
                if (!subspace || !profile) return []

                try {
                    // Parse friends from profile
                    const friendsList: ExtendedFriend[] = []

                    if (profile.friends) {
                        // Add accepted friends
                        for (const friendId of profile.friends.accepted || []) {
                            const friendProfile = await get().actions.profile.get(friendId)
                            friendsList.push({
                                userId: friendId,
                                status: 'accepted',
                                profile: friendProfile || undefined
                            })
                        }

                        // Add sent friend requests
                        for (const friendId of profile.friends.sent || []) {
                            const friendProfile = await get().actions.profile.get(friendId)
                            friendsList.push({
                                userId: friendId,
                                status: 'sent',
                                profile: friendProfile || undefined
                            })
                        }

                        // Add received friend requests
                        for (const friendId of profile.friends.received || []) {
                            const friendProfile = await get().actions.profile.get(friendId)
                            friendsList.push({
                                userId: friendId,
                                status: 'received',
                                profile: friendProfile || undefined
                            })
                        }
                    }

                    // Update friends cache
                    const friendsMap = friendsList.reduce((acc, friend) => {
                        acc[friend.userId] = friend
                        return acc
                    }, {} as Record<string, ExtendedFriend>)

                    set({ friends: friendsMap })
                    return friendsList
                } catch (error) {
                    console.error("Failed to get friends:", error)
                    return []
                }
            },
            sendFriendRequest: async (userId: string) => {
                const subspace = get().subspace
                if (!subspace) return false

                try {
                    const success = await subspace.user.sendFriendRequest(userId)
                    if (success) {
                        // Refresh profile to update friends list
                        await get().actions.profile.refresh()
                        await get().actions.friends.getFriends()
                    }
                    return success
                } catch (error) {
                    console.error("Failed to send friend request:", error)
                    return false
                }
            },
            acceptFriendRequest: async (userId: string) => {
                const subspace = get().subspace
                if (!subspace) return false

                try {
                    const success = await subspace.user.acceptFriendRequest(userId)
                    if (success) {
                        // Refresh profile to update friends list
                        await get().actions.profile.refresh()
                        await get().actions.friends.getFriends()
                    }
                    return success
                } catch (error) {
                    console.error("Failed to accept friend request:", error)
                    return false
                }
            },
            rejectFriendRequest: async (userId: string) => {
                const subspace = get().subspace
                if (!subspace) return false

                try {
                    const success = await subspace.user.rejectFriendRequest(userId)
                    if (success) {
                        // Refresh profile to update friends list
                        await get().actions.profile.refresh()
                        await get().actions.friends.getFriends()
                    }
                    return success
                } catch (error) {
                    console.error("Failed to reject friend request:", error)
                    return false
                }
            },
            removeFriend: async (userId: string) => {
                const subspace = get().subspace
                if (!subspace) return false

                try {
                    const success = await subspace.user.removeFriend(userId)
                    if (success) {
                        // Remove from local state
                        const currentFriends = get().friends
                        const { [userId]: removedFriend, ...remainingFriends } = currentFriends
                        set({ friends: remainingFriends })

                        // Also remove DM conversation
                        const currentConversations = get().dmConversations
                        const { [userId]: removedConvo, ...remainingConvos } = currentConversations
                        set({ dmConversations: remainingConvos })

                        // Refresh profile to update friends list
                        await get().actions.profile.refresh()
                        await get().actions.friends.getFriends()
                    }
                    return success
                } catch (error) {
                    console.error("Failed to remove friend:", error)
                    return false
                }
            },
            refreshFriends: async () => {
                try {
                    await get().actions.profile.refresh()
                    await get().actions.friends.getFriends()
                } catch (error) {
                    console.error("Failed to refresh friends:", error)
                }
            }
        },
        dms: {
            getConversation: async (friendId: string) => {
                const subspace = get().subspace
                const profile = get().profile
                if (!subspace || !profile) return null

                // Check if conversation already exists
                const existingConversation = get().dmConversations[friendId]
                if (existingConversation) {
                    return existingConversation
                }

                try {
                    // Use current user's DM process (not friend's DM process!)
                    if (!profile?.dmProcess) {
                        console.error("Current user doesn't have a DM process")
                        return null
                    }

                    // Create conversation object
                    const conversation: DMConversation = {
                        friendId,
                        dmProcessId: profile.dmProcess, // Use current user's DM process
                        messages: {},
                        unreadCount: 0
                    }

                    // Cache the conversation
                    set({
                        dmConversations: { ...get().dmConversations, [friendId]: conversation }
                    })

                    return conversation
                } catch (error) {
                    console.error("Failed to get conversation:", error)
                    return null
                }
            },
            getMessages: async (friendId: string, limit: number = 50) => {
                const subspace = get().subspace
                if (!subspace) return []

                // Check if we're already loading messages for this friend
                if (get().loadingDMs.has(friendId)) {
                    return get().actions.dms.getCachedMessages(friendId)
                }

                try {
                    // Mark as loading
                    const currentLoadingDMs = new Set(get().loadingDMs)
                    currentLoadingDMs.add(friendId)
                    set({ loadingDMs: currentLoadingDMs })

                    // Always use current user's DM process (not cached conversation)
                    const profile = get().profile
                    if (!profile?.dmProcess) {
                        console.error("Current user doesn't have a DM process")
                        return []
                    }

                    // Use current user's DM process directly (bypass cached conversation)
                    const dmProcessId = profile.dmProcess

                    // Get messages from the DM process (using current user's DM process)
                    const response = await subspace.user.getDMs(dmProcessId, { friendId, limit } as any)
                    if (!response?.messages) return []

                    // Process and cache messages
                    const messageMap = response.messages.reduce((acc, message) => {
                        acc[message.id] = message
                        return acc
                    }, {} as Record<string, DMMessage>)

                    // Get or create conversation for caching
                    let existingConversation = get().dmConversations[friendId]
                    if (!existingConversation) {
                        existingConversation = {
                            friendId,
                            dmProcessId: profile.dmProcess, // Always use current user's DM process
                            messages: {},
                            unreadCount: 0
                        }
                    }

                    // Update conversation with new messages
                    const updatedConversation = {
                        ...existingConversation,
                        dmProcessId: profile.dmProcess, // Force update to current user's DM process
                        messages: { ...existingConversation.messages, ...messageMap },
                        lastMessageTime: Math.max(...response.messages.map(m => m.timestamp))
                    }

                    set({
                        dmConversations: { ...get().dmConversations, [friendId]: updatedConversation }
                    })

                    return response.messages.sort((a, b) => a.timestamp - b.timestamp)
                } catch (error) {
                    console.error("Failed to get DM messages:", error)
                    return []
                } finally {
                    // Clear loading state
                    const currentLoadingDMs = new Set(get().loadingDMs)
                    currentLoadingDMs.delete(friendId)
                    set({ loadingDMs: currentLoadingDMs })
                }
            },
            sendMessage: async (friendId: string, params: { content: string; attachments?: string; replyTo?: number }) => {
                const subspace = get().subspace
                const profile = get().profile
                if (!subspace || !profile) return false

                try {
                    // Send message via main Subspace process (it will forward to both DM processes)
                    const success = await (subspace.user as any).sendDMToFriend(friendId, params)
                    if (success) {
                        // Refresh messages after sending
                        setTimeout(() => {
                            get().actions.dms.getMessages(friendId)
                        }, 500)
                    }
                    return success
                } catch (error) {
                    console.error("Failed to send DM:", error)
                    return false
                }
            },
            editMessage: async (friendId: string, messageId: string, content: string) => {
                const subspace = get().subspace
                if (!subspace) return false

                try {
                    const success = await (subspace.user as any).editDMToFriend(friendId, { messageId, content })
                    if (success) {
                        // Update cached message
                        const conversation = get().dmConversations[friendId]
                        if (conversation) {
                            const updatedMessage = { ...conversation.messages[messageId], content, edited: true }
                            const updatedConversation = {
                                ...conversation,
                                messages: { ...conversation.messages, [messageId]: updatedMessage }
                            }

                            set({
                                dmConversations: { ...get().dmConversations, [friendId]: updatedConversation }
                            })
                        }

                        // Refresh messages to get latest state
                        setTimeout(() => {
                            get().actions.dms.getMessages(friendId)
                        }, 500)
                    }
                    return success
                } catch (error) {
                    console.error("Failed to edit DM:", error)
                    return false
                }
            },
            deleteMessage: async (friendId: string, messageId: string) => {
                const subspace = get().subspace
                if (!subspace) return false

                try {
                    const success = await (subspace.user as any).deleteDMToFriend(friendId, messageId)
                    if (success) {
                        // Remove from cached messages
                        const conversation = get().dmConversations[friendId]
                        if (conversation) {
                            const { [messageId]: removedMessage, ...remainingMessages } = conversation.messages
                            const updatedConversation = {
                                ...conversation,
                                messages: remainingMessages
                            }

                            set({
                                dmConversations: { ...get().dmConversations, [friendId]: updatedConversation }
                            })
                        }
                    }
                    return success
                } catch (error) {
                    console.error("Failed to delete DM:", error)
                    return false
                }
            },
            getCachedMessages: (friendId: string) => {
                const conversation = get().dmConversations[friendId]
                if (!conversation) return []

                return Object.values(conversation.messages)
                    .sort((a, b) => a.timestamp - b.timestamp)
            },
            markAsRead: (friendId: string) => {
                const conversation = get().dmConversations[friendId]
                if (!conversation) return

                const updatedConversation = { ...conversation, unreadCount: 0 }
                set({
                    dmConversations: { ...get().dmConversations, [friendId]: updatedConversation }
                })
            }
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
            },
            loadUserServersSequentially: (profile: ExtendedProfile) => {
                const subspace = get().subspace
                if (!subspace) return

                const userJoinedServers = profile.serversJoined || [];
                if (userJoinedServers.length === 0) {
                    return;
                }

                const loadNextServer = async (index: number) => {
                    if (index >= userJoinedServers.length) {
                        return;
                    }

                    // Handle both string and object server identifiers
                    const serverEntry = userJoinedServers[index];
                    const serverId = typeof serverEntry === 'string' ? serverEntry : (serverEntry as any).serverId;

                    if (!serverId) {
                        console.warn(`Invalid server entry at index ${index}, skipping.`);
                        loadNextServer(index + 1);
                        return;
                    }

                    console.log(`Loading server ${serverId} (${index + 1}/${userJoinedServers.length})...`);
                    try {
                        const server = await get().actions.servers.get(serverId, true); // Force refresh
                    } catch (error) {
                        console.error(`❌ Failed to load server ${serverId}:`, error);
                    } finally {
                        // Wait a short delay before loading the next server to avoid overwhelming the system
                        setTimeout(() => {
                            loadNextServer(index + 1);
                        }, 100);
                    }
                };

                loadNextServer(0);
            }
        },
        clear: () => {
            console.log("🧹 Clearing all Subspace state due to wallet disconnection")
            set({
                subspace: null,
                profile: null,
                profiles: {},
                servers: {},
                messages: {},
                friends: {},
                dmConversations: {},
                isCreatingProfile: false,
                isLoadingProfile: false,
                loadingProfiles: new Set<string>(),
                loadingServers: new Set<string>(),
                loadingFriends: new Set<string>(),
                loadingDMs: new Set<string>(),
                currentAddress: "",
            })
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
        friends: state.friends,
        dmConversations: state.dmConversations,
        // ✅ EXCLUDED: Loading states and currentAddress don't need to be persisted
        // loadingProfiles, loadingServers, loadingFriends, loadingDMs, currentAddress are excluded from persistence
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
