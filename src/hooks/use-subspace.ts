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
import { Constants as WebConstants } from "@/lib/constants";
import { useEffect } from "react";

// Helper function to get CU URL from localStorage
function getCuUrl(): string {
    const storedUrl = localStorage.getItem('subspace-cu-url');
    return storedUrl || WebConstants.CuEndpoints.BetterIDEa; // Default to BetterIDEa
}

// Helper function to set CU URL in localStorage
export function setCuUrl(url: string): void {
    localStorage.setItem('subspace-cu-url', url);
}

// Helper function to get Hyperbeam URL from localStorage
function getHyperbeamUrl(): string {
    const storedUrl = localStorage.getItem('subspace-hyperbeam-url');
    return storedUrl || WebConstants.HyperbeamEndpoints.BetterIDEa; // Default to BetterIDEa
}

// Helper function to set Hyperbeam URL in localStorage
export function setHyperbeamUrl(url: string): void {
    localStorage.setItem('subspace-hyperbeam-url', url);
}


interface CreateServerParams {
    name: string;
    logo?: string;
    description?: string;
}

export interface ExtendedFriend extends Friend {
    profile?: Profile;
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
    profile: Profile | null
    profiles: Record<string, Profile>
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
            get: (userId?: string) => Promise<Profile | null>
            getBulk: (userIds: string[]) => Promise<Profile[]>
            getBulkPrimaryNames: (userIds: string[]) => Promise<void>
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
            getMembers: (serverId: string) => Promise<any[]>
            refreshMembers: (serverId: string) => Promise<Member[]>
            refreshMemberProfiles: (serverId: string) => Promise<boolean>
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
            updateServerCode: (serverId: string) => Promise<boolean>
            refreshSources: () => Promise<void>
            getSources: () => any | null
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
            markAsRead: (friendId: string) => void
        }
        // internal: {
        //     rehydrateServers: () => void
        //     loadUserServersSequentially: (profile: ExtendedProfile) => void
        // }
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
                    return
                }

                const currentState = get()
                const previousAddress = currentState.currentAddress

                // Check if address has changed (wallet switch)
                if (previousAddress && previousAddress !== owner) {
                    // Clear all user-specific data from state on wallet change
                    set({
                        profile: null,
                        profiles: {},
                        servers: {},
                        messages: {},
                        friends: {},
                        dmConversations: {},
                        loadingProfiles: new Set<string>(),
                        loadingServers: new Set<string>(),
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

                try {
                    const profile = await subspace.user.getProfile(targetUserId)
                    if (profile) {
                        set({ profile })
                        set({ profiles: { ...get().profiles, [targetUserId]: profile } })
                        // a possibility that this was a migrated profile and even tho is exists, dmProcess wont exist,
                        // meaning user has not yet initialised their profile, so throw and error here to trigger profile creation
                        if (!profile.dmProcess) {
                            throw new Error("dm process not found, initialise profile first")
                        }
                    }
                } catch (e) {
                    // Only show creating profile dialog if this is our own profile
                    // and we don't already have a profile in the store
                    if (targetUserId === walletAddress) {
                        const profileId = await subspace.user.createProfile()
                        if (profileId) {
                            const profile = await subspace.user.getProfile(profileId)
                            return profile
                        }
                    } else {
                        throw e
                    }

                }
            },
            getBulk: async (userIds: string[]) => {

                const subspace = get().subspace
                if (!subspace) return []

                const profiles = await subspace.user.getBulkProfiles(userIds)
                if (profiles) {
                    const profilesKV = profiles.reduce((acc: Record<string, Profile>, profile: Profile) => {
                        acc[profile.userId] = profile as Profile
                        return acc
                    }, {} as Record<string, Profile>)

                    // merge profiles values with any existing data from the state (primaryName, primaryLogo)

                    const stateProfiles = get().profiles
                    Object.keys(stateProfiles).forEach((userId) => {
                        if (profilesKV[userId]) {
                            profilesKV[userId] = {
                                ...profilesKV[userId],
                                ...stateProfiles[userId]
                            }
                        }
                    })

                    set({ profiles: { ...get().profiles, ...profilesKV } })
                }
                return profiles as Profile[]
            },
            getBulkPrimaryNames: async (userIds: string[]) => {
                const subspace = get().subspace
                if (!subspace) return

                // promise.all wont work and api calls will get blocked due to rate limiting
                // instead, run a loop and fetch their profiles one by one

                for (const userId of userIds) {
                    const profile = await get().actions.profile.get(userId)
                    // delay 250ms
                    await new Promise(resolve => setTimeout(resolve, 220))
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
            get: async (serverId: string) => {
                const subspace = get().subspace
                if (!subspace) return null

                try {
                    const server = await subspace.server.getServer(serverId)

                    if (server) {
                        const stateServer = get().servers[serverId]
                        if (stateServer) {
                            server.members = stateServer.members || []
                        } else {
                            server.members = []
                        }
                    }
                    set({
                        servers: {
                            ...get().servers,
                            [serverId]: server
                        }
                    })
                    return server
                } catch (e) {
                    console.error("[hooks/use-subspace] Failed to get server:", e)
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
                server.members = []
                if (!server) throw new Error("Failed to retrieve created server")

                set({ servers: { ...get().servers, [serverId]: server } })

                // join the server and wait for completion
                await get().actions.servers.join(serverId)
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
                    }
                    return success
                } catch (error) {
                    console.error("Failed to leave server:", error)
                    return false
                }
            },
            getMembers: async (serverId: string): Promise<any[]> => {
                const subspace = get().subspace
                if (!subspace) return []

                // Get the server instance from current state, don't call servers.get to avoid recursion
                const server = get().servers[serverId]
                if (!server) {
                    console.error("Server not found for getMembers")
                    return []
                }

                try {
                    const membersData = await subspace.server.getAllMembers(serverId)
                    const members = Object.entries(membersData).map(([userId, memberData]) => ({
                        userId,
                        ...memberData
                    }))

                    set({
                        servers: {
                            ...get().servers,
                            [serverId]: {
                                ...server,
                                members: members
                            }
                        }
                    })

                    return members
                } catch (e) {
                    console.log("error", e)
                    return []
                }
            },
            refreshMembers: async (serverId: string) => {
                return get().actions.servers.getMembers(serverId)
            },
            refreshMemberProfiles: async (serverId: string) => {
                console.log(`[hooks/use-subspace] 🔄 Refreshing member profiles for server ${serverId}`)

                const server = get().servers[serverId]
                if (!server || !(server as any).members) {
                    console.warn(`[hooks/use-subspace] ⚠️ No members found for server ${serverId}`)
                    return false
                }

                try {
                    const members = (server as any).members || []
                    const memberUserIds = members.map((m: any) => m.userId).filter(Boolean)

                    if (memberUserIds.length > 0) {
                        console.log(`[hooks/use-subspace] 📊 Force refreshing ${memberUserIds.length} member profiles`)

                        // Force refresh all member profiles (including primary names/logos)
                        await get().actions.profile.getBulk(memberUserIds)

                        // Enrich members with updated profile data using reactive pattern
                        const updatedProfiles = get().profiles
                        const enrichedMembers = members.map((member: any) => ({
                            ...member,
                            profile: updatedProfiles[member.userId] || null
                        }))

                        const currentServer = get().servers[serverId]
                        if (currentServer) {
                            // Create new server object to trigger reactivity
                            const updatedServer = {
                                ...currentServer,
                                members: enrichedMembers
                            }

                            set((state) => ({
                                servers: {
                                    ...state.servers,
                                    [serverId]: updatedServer
                                }
                            }))
                            console.log(`[hooks/use-subspace] ✅ Member profiles refreshed for server ${serverId}`)
                            return true
                        }
                    }
                    return false
                } catch (error) {
                    console.error(`[hooks/use-subspace] ❌ Failed to refresh member profiles for server ${serverId}:`, error)
                    return false
                }
            },
            getMember: async (serverId: string, userId: string) => {
                const subspace = get().subspace
                if (!subspace) return

                try {
                    const member = await subspace.server.getMember(serverId, userId)
                    if (member) {
                        // Merge into server cache so UI sees the update
                        const servers = get().servers
                        const server = servers[serverId]
                        if (server) {
                            const existingMembers: any = (server as any).members
                            let updatedMembers: any
                            if (Array.isArray(existingMembers)) {
                                let replaced = false
                                updatedMembers = existingMembers.map((m: any) => {
                                    if (m.userId === userId) {
                                        replaced = true
                                        return { ...m, ...member }
                                    }
                                    return m
                                })
                                if (!replaced) updatedMembers = [...updatedMembers, member]
                            } else if (existingMembers && typeof existingMembers === 'object') {
                                updatedMembers = { ...existingMembers, [userId]: { ...(existingMembers?.[userId] || {}), ...member } }
                            } else {
                                updatedMembers = [member]
                            }

                            set({
                                servers: {
                                    ...servers,
                                    [serverId]: {
                                        ...server,
                                        members: updatedMembers
                                    }
                                }
                            })
                        }
                    }
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
                            .map((rawMessage: any) => {
                                const authorId = rawMessage.authorId ?? rawMessage.senderId;
                                return ({
                                    messageId: rawMessage.messageId,
                                    content: rawMessage.content,
                                    authorId,
                                    timestamp: Number(rawMessage.timestamp),
                                    edited: Boolean(rawMessage.edited),
                                    attachments: rawMessage.attachments || "[]",
                                    replyTo: rawMessage.replyTo,
                                    messageTxId: rawMessage.messageTxId,
                                    replyToMessage: null // Will be populated below
                                } as any)
                            })
                            .sort((a: any, b: any) => a.timestamp - b.timestamp)

                        // Get current cached messages to help populate replyToMessage
                        const currentMessages = get().messages
                        const serverMessages = currentMessages[serverId] || {}
                        const channelMessages = serverMessages[channelId] || {}

                        // Create a combined lookup map of all messages (current + new)
                        const allMessagesMap: Record<string, any> = { ...channelMessages }
                        processedMessages.forEach(msg => {
                            allMessagesMap[msg.messageId] = msg
                        })

                        // Populate replyToMessage field for messages that have replyTo
                        for (const message of processedMessages) {
                            if (message.replyTo) {
                                let replyToMessage = allMessagesMap[message.replyTo]

                                // If reply message is not in cache, fetch it
                                if (!replyToMessage) {
                                    try {
                                        const fetchedReplyMessage = await subspace.server.getMessage(serverId, String(message.replyTo))
                                        if (fetchedReplyMessage) {
                                            replyToMessage = fetchedReplyMessage
                                            // Cache the fetched message
                                            allMessagesMap[message.replyTo] = fetchedReplyMessage
                                        }
                                    } catch (error) {
                                        console.warn(`Failed to fetch reply message ${message.replyTo}:`, error)
                                    }
                                }

                                if (replyToMessage) {
                                    message.replyToMessage = replyToMessage
                                }
                            }
                        }

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
                        // Normalize to always have authorId for UI components
                        (message as any).authorId = (message as any).authorId ?? (message as any).senderId
                        // Get current cached messages to help populate replyToMessage
                        const currentMessages = get().messages
                        const serverMessages = currentMessages[serverId] || {}
                        const channelMessages = serverMessages[channelId] || {}

                        // Populate replyToMessage field if this message has replyTo
                        if (message.replyTo) {
                            let replyToMessage = channelMessages[message.replyTo]

                            // If reply message is not in cache, fetch it
                            if (!replyToMessage) {
                                try {
                                    const fetchedReplyMessage = await subspace.server.getMessage(String(serverId), String(message.replyTo))
                                    console.log("fetchedReplyMessage", fetchedReplyMessage)
                                    if (fetchedReplyMessage) {
                                        // Normalize reply message as well
                                        replyToMessage = {
                                            ...fetchedReplyMessage,
                                            authorId: (fetchedReplyMessage as any).authorId ?? (fetchedReplyMessage as any).senderId
                                        }
                                        // Cache the fetched message
                                        channelMessages[message.replyTo] = fetchedReplyMessage
                                    }
                                } catch (error) {
                                    console.warn(`Failed to fetch reply message ${message.replyTo}:`, error)
                                }
                            }

                            if (replyToMessage) {
                                (message as any).replyToMessage = replyToMessage
                            }
                        }

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

                console.log("🔧 SDK DEBUG: sendMessage", serverId, params)

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
                    const success = await subspace.server.editMessage(serverId, channelId, messageId, content)

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
                    const success = await subspace.server.deleteMessage(serverId, channelId, messageId)

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
            updateServerCode: async (serverId: string) => {
                const subspace = get().subspace
                if (!subspace) return false

                try {
                    const success = await subspace.server.updateServerCode(serverId)
                    if (success) {
                        // Wait a moment for the server to process the change
                        await new Promise(resolve => setTimeout(resolve, 200))

                        // Force refresh the server to get updated version while preserving members
                        try {
                            const updatedServer = await get().actions.servers.get(serverId, true)
                        } catch (refreshError) {
                            console.error("❌ Failed to refresh server after code update:", refreshError)
                            // Don't fail the operation just because refresh failed
                        }
                    }
                    return success
                } catch (error) {
                    console.error("Failed to update server code:", error)
                    return false
                }
            },
            refreshSources: async () => {
                const subspace = get().subspace
                if (!subspace) return

                try {
                    await subspace.connectionManager.refreshSources()
                } catch (error) {
                    console.error("Failed to refresh sources:", error)
                }
            },
            getSources: () => {
                const subspace = get().subspace
                if (!subspace) return null
                return subspace.connectionManager.sources
            }
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
                            // Create placeholder friend entry immediately
                            const placeholderFriend: ExtendedFriend = {
                                userId: friendId,
                                status: 'accepted',
                                profile: undefined
                            }
                            friendsList.push(placeholderFriend)

                            // Update state immediately with placeholder - SAFE UPDATE
                            set((state) => ({
                                friends: { ...state.friends, [friendId]: placeholderFriend }
                            }))

                            // Fetch profile and update state as soon as it's received
                            const friendProfile = await get().actions.profile.get(friendId)
                            if (friendProfile) {
                                const updatedFriend: ExtendedFriend = {
                                    userId: friendId,
                                    status: 'accepted',
                                    profile: friendProfile
                                }
                                // Update the friend in the list
                                const friendIndex = friendsList.findIndex(f => f.userId === friendId)
                                if (friendIndex !== -1) {
                                    friendsList[friendIndex] = updatedFriend
                                }
                                // Update state immediately with full profile data - SAFE UPDATE
                                set((state) => ({
                                    friends: { ...state.friends, [friendId]: updatedFriend }
                                }))
                            }
                        }

                        // Add sent friend requests
                        for (const friendId of profile.friends.sent || []) {
                            // Create placeholder friend entry immediately
                            const placeholderFriend: ExtendedFriend = {
                                userId: friendId,
                                status: 'sent',
                                profile: undefined
                            }
                            friendsList.push(placeholderFriend)

                            // Update state immediately with placeholder - SAFE UPDATE
                            set((state) => ({
                                friends: { ...state.friends, [friendId]: placeholderFriend }
                            }))

                            // Fetch profile and update state as soon as it's received
                            const friendProfile = await get().actions.profile.get(friendId)
                            if (friendProfile) {
                                const updatedFriend: ExtendedFriend = {
                                    userId: friendId,
                                    status: 'sent',
                                    profile: friendProfile
                                }
                                // Update the friend in the list
                                const friendIndex = friendsList.findIndex(f => f.userId === friendId)
                                if (friendIndex !== -1) {
                                    friendsList[friendIndex] = updatedFriend
                                }
                                // Update state immediately with full profile data - SAFE UPDATE
                                set((state) => ({
                                    friends: { ...state.friends, [friendId]: updatedFriend }
                                }))
                            }
                        }

                        // Add received friend requests
                        for (const friendId of profile.friends.received || []) {
                            // Create placeholder friend entry immediately
                            const placeholderFriend: ExtendedFriend = {
                                userId: friendId,
                                status: 'received',
                                profile: undefined
                            }
                            friendsList.push(placeholderFriend)

                            // Update state immediately with placeholder - SAFE UPDATE
                            set((state) => ({
                                friends: { ...state.friends, [friendId]: placeholderFriend }
                            }))

                            // Fetch profile and update state as soon as it's received
                            const friendProfile = await get().actions.profile.get(friendId)
                            if (friendProfile) {
                                const updatedFriend: ExtendedFriend = {
                                    userId: friendId,
                                    status: 'received',
                                    profile: friendProfile
                                }
                                // Update the friend in the list
                                const friendIndex = friendsList.findIndex(f => f.userId === friendId)
                                if (friendIndex !== -1) {
                                    friendsList[friendIndex] = updatedFriend
                                }
                                // Update state immediately with full profile data - SAFE UPDATE
                                set((state) => ({
                                    friends: { ...state.friends, [friendId]: updatedFriend }
                                }))
                            }
                        }
                    }

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

                    // Get existing cached messages to help populate replyToMessage
                    const existingMessages = get().dmConversations[friendId]?.messages || {}

                    // Create a combined lookup map of all messages (existing + new)
                    const allMessagesMap: Record<string, DMMessage> = { ...existingMessages, ...messageMap }

                    // Populate replyToMessage field for DM messages that have replyTo
                    for (const message of response.messages) {
                        if (message.replyTo) {
                            // Find the referenced message (DM messages use numeric IDs)
                            let replyToMessage = Object.values(allMessagesMap).find(m => {
                                // Try to match by converting to numbers since DM message IDs might be stored differently
                                return String(m.id) === String(message.replyTo) || Number(m.id) === Number(message.replyTo)
                            })

                            // If reply message is not found in current messages, try to fetch it
                            if (!replyToMessage) {
                                try {
                                    // For DMs, we need to use the user's DM process to fetch the message
                                    const profile = get().profile
                                    if (profile?.dmProcess) {
                                        const dmResponse = await subspace.user.getDMs(profile.dmProcess, {
                                            friendId,
                                            limit: 1,
                                            messageId: message.replyTo
                                        } as any)

                                        if (dmResponse?.messages?.length > 0) {
                                            replyToMessage = dmResponse.messages[0]
                                            // Cache the fetched message
                                            allMessagesMap[replyToMessage.id] = replyToMessage
                                        }
                                    }
                                } catch (error) {
                                    console.warn(`Failed to fetch DM reply message ${message.replyTo}:`, error)
                                }
                            }

                            if (replyToMessage) {
                                (message as any).replyToMessage = replyToMessage
                                // Update the messageMap as well
                                messageMap[message.id] = { ...message, replyToMessage } as any
                            }
                        }
                    }

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
            markAsRead: (friendId: string) => {
                const conversation = get().dmConversations[friendId]
                if (!conversation) return

                const updatedConversation = { ...conversation, unreadCount: 0 }
                set({
                    dmConversations: { ...get().dmConversations, [friendId]: updatedConversation }
                })
            }
        },
        // internal: {
        //     rehydrateServers: () => {
        //         const subspace = get().subspace
        //         if (!subspace) return

        //         const persistedServers = get().servers
        //         const rehydratedServers: Record<string, Server> = {}

        //         // Recreate server instances from persisted data
        //         for (const [serverId, data] of Object.entries(persistedServers)) {
        //             try {
        //                 // Just use the persisted data as server data
        //                 rehydratedServers[serverId] = data
        //             } catch (e) {
        //                 console.error(`Failed to rehydrate server ${serverId}:`, e)
        //             }
        //         }

        //         if (Object.keys(rehydratedServers).length > 0) {
        //         }
        //         set({ servers: rehydratedServers })
        //     },
        //     loadUserServersSequentially: (profile: ExtendedProfile) => {
        //         const subspace = get().subspace
        //         if (!subspace) return

        //         const userJoinedServers = profile.serversJoined || [];
        //         if (userJoinedServers.length === 0) {
        //             return;
        //         }

        //         console.log(`[hooks/use-subspace] Starting to load ${userJoinedServers.length} servers sequentially...`);

        //         const loadNextServer = async (index: number) => {
        //             if (index >= userJoinedServers.length) {
        //                 console.log(`[hooks/use-subspace] ✅ Finished loading all ${userJoinedServers.length} servers`);
        //                 return;
        //             }

        //             // Handle both string and object server identifiers
        //             const serverEntry = userJoinedServers[index];
        //             const serverId = typeof serverEntry === 'string' ? serverEntry : (serverEntry as any).serverId;

        //             if (!serverId) {
        //                 console.warn(`Invalid server entry at index ${index}, skipping.`);
        //                 loadNextServer(index + 1);
        //                 return;
        //             }

        //             console.log(`[hooks/use-subspace] Loading server ${serverId} (${index + 1}/${userJoinedServers.length})...`);

        //             // ✅ IMMEDIATE UPDATE: Mark this server as being loaded in the loadingServers set
        //             const currentLoadingServers = new Set(get().loadingServers)
        //             currentLoadingServers.add(serverId)
        //             set({ loadingServers: currentLoadingServers })

        //             try {
        //                 const server = await get().actions.servers.get(serverId, true); // Force refresh
        //                 if (server) {
        //                     console.log(`[hooks/use-subspace] ✅ Successfully loaded server ${serverId}`);
        //                 }
        //             } catch (error) {
        //                 console.error(`[hooks/use-subspace] ❌ Failed to load server ${serverId}:`, error);
        //             } finally {
        //                 // ✅ IMMEDIATE UPDATE: Remove from loading set when done (success or failure)
        //                 const updatedLoadingServers = new Set(get().loadingServers)
        //                 updatedLoadingServers.delete(serverId)
        //                 set({ loadingServers: updatedLoadingServers })

        //                 // Wait a short delay before loading the next server to avoid overwhelming the system
        //                 setTimeout(() => {
        //                     loadNextServer(index + 1);
        //                 }, 100);
        //             }
        //         };

        //         loadNextServer(0);
        //     }
        // }
    },
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
    const hyperbeamUrl = getHyperbeamUrl();

    const config: ConnectionConfig = {
        CU_URL: cuUrl,
        GATEWAY_URL: 'https://arweave.net',
        HYPERBEAM_URL: hyperbeamUrl,
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

        if (strategy === 'guest_user') {
            throw new Error('Guest user mode has limited functionality. Please connect a wallet for full features.');
        } else {
            throw new Error('Failed to initialize Subspace client. Please check your connection and try again.');
        }
    }
}



// Custom hook to handle wallet disconnect events and clear subspace state
export function useSubspaceWalletDisconnectHandler() {
    const { actions } = useSubspace();

    useEffect(() => {
        const handleWalletDisconnected = () => {
            console.log("🔌 Wallet disconnected, clearing subspace state");

            // Clear all user-specific data from subspace state
            // Use the store's set method directly to clear state
            useSubspace.setState({
                profile: null,
                profiles: {},
                servers: {},
                messages: {},
                friends: {},
                dmConversations: {},
                loadingProfiles: new Set<string>(),
                loadingServers: new Set<string>(),
                loadingFriends: new Set<string>(),
                loadingDMs: new Set<string>(),
                currentAddress: "",
                subspace: null
            });
        };

        window.addEventListener("subspace-wallet-disconnected", handleWalletDisconnected);

        return () => {
            window.removeEventListener("subspace-wallet-disconnected", handleWalletDisconnected);
        };
    }, [actions]);
}
