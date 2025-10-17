import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import { Subspace, SubspaceProfiles, SubspaceServers, Utils } from "@subspace-protocol/sdk"
import type { IMember, IProfile, IServer, ICategory, IChannel, IRole, IMessage } from "@subspace-protocol/sdk/types"
import type { Inputs } from "@subspace-protocol/sdk/types"
import type { IWanderTier } from "@/lib/types"
import { getPrimaryName, getWanderTier } from "@/lib/utils"

interface SubspaceState {
    profiles: Record<string, IProfile>
    recentDms: Record<string, number> // userId -> timestamp pairs
    servers: Record<string, IServer> // this will contain all server metadata like channels, roles, server info etc
    members: Record<string, Record<string, IMember>> // serverid -> userid -> member
    messages: Record<string, Record<string, Record<string, IMessage>>> // serverid -> channelid -> messageid -> message
    dmConversations: Record<string, Record<string, Record<string, IMessage>>> // dmProcessId -> friendId -> messageId -> message
    // tempConversations: Record<string, Record<string, Record<string, IMessage>>> // dmProcessId -> userId -> messageId -> message - DISABLED: temporary DMs not supported
    friends: Record<string, string[]> // dmProcessId -> friendIds
    blockedUsers: Record<string, string[]> // dmProcessId -> blockedUserIds
    primaryNames: Record<string, string> // address -> primary name
    wanderTiers: Record<string, IWanderTier> // address -> wander tier
    actions: SubspaceActions
}

interface SubspaceActions {
    servers: {
        // Core server functions
        get: (serverId: string) => Promise<IServer | null>
        create: (data: Inputs.ICreateServer) => Promise<IServer | null>
        update: (data: Inputs.IUpdateServer) => Promise<IServer | null>
        updateServerSource: (serverId: string) => Promise<boolean>
        join: (serverId: string) => Promise<boolean>
        leave: (serverId: string) => Promise<boolean>

        // Category functions
        createCategory: (data: Inputs.ICreateCategory) => Promise<ICategory | null>
        updateCategory: (data: Inputs.IUpdateCategory) => Promise<ICategory | null>
        deleteCategory: (data: Inputs.IDeleteCategory) => Promise<boolean>

        // Channel functions
        createChannel: (data: Inputs.ICreateChannel) => Promise<IChannel | null>
        updateChannel: (data: Inputs.IUpdateChannel) => Promise<IChannel | null>
        deleteChannel: (data: Inputs.IDeleteChannel) => Promise<boolean>

        // Role functions
        createRole: (data: Inputs.ICreateRole) => Promise<IRole | null>
        updateRole: (data: Inputs.IUpdateRole) => Promise<IRole | null>
        deleteRole: (data: Inputs.IDeleteRole) => Promise<boolean>
        assignRole: (data: Inputs.IAssignRole) => Promise<boolean>
        unassignRole: (data: Inputs.IUnassignRole) => Promise<boolean>

        // Message functions
        sendMessage: (data: Inputs.ISendMessage) => Promise<IMessage | null>
        updateMessage: (data: Inputs.IUpdateMessage) => Promise<IMessage | null>
        deleteMessage: (data: Inputs.IDeleteMessage) => Promise<boolean>

        // Member functions
        getMember: (data: Inputs.IGetMember) => Promise<IMember | null>
        getAllMembers: (serverId: string) => Promise<Record<string, IMember> | null>
        updateMember: (data: Inputs.IUpdateMember) => Promise<IMember | null>
        kickMember: (data: Inputs.IKickMember) => Promise<boolean>
        banMember: (data: Inputs.IBanMember) => Promise<boolean>
        unbanMember: (data: Inputs.IUnbanMember) => Promise<boolean>
    },
    messages: {
        get: (serverId: string, channelId: string) => Promise<Record<string, IMessage> | null>
        getAll: (serverId: string) => Promise<Record<string, Record<string, IMessage>> | null>
        getOne: (serverId: string, channelId: string, messageId: string) => Promise<IMessage | null>
    },
    profiles: {
        get: (profileId: string) => Promise<IProfile | null>
        create: (data: Inputs.ICreateProfile) => Promise<IProfile | null>
        update: (data: Inputs.ICreateProfile) => Promise<IProfile | null>

        // Friend functions
        addFriend: (userId: string) => Promise<boolean>
        acceptFriend: (userId: string) => Promise<boolean>
        rejectFriend: (userId: string) => Promise<boolean>
        removeFriend: (userId: string) => Promise<boolean>

        // DM functions
        sendDM: (data: Inputs.ISendDM) => Promise<boolean>
        editDM: (data: Inputs.IEditDM) => Promise<boolean>
        deleteDM: (data: Inputs.IDeleteDM) => Promise<boolean>

        // DM conversation functions
        getConversationIds: (dmProcessId: string) => Promise<string[]>
        getDmConversation: (dmProcessId: string, friendId: string) => Promise<Record<string, IMessage>>
        getBlockedUsers: (dmProcessId: string) => Promise<string[]>
    },
    // Utility functions
    clearAllStates: () => void
}

export const useSubspace = create<SubspaceState>()(persist((set, get) => ({
    profiles: {},
    recentDms: {},
    primaryNames: {},
    wanderTiers: {},
    servers: {},
    members: {},
    messages: {},
    dmConversations: {},
    // tempConversations: {}, - DISABLED: temporary DMs not supported
    friends: {},
    blockedUsers: {},
    actions: {
        profiles: {
            get: async (profileId: string) => {
                Utils.log({ type: "debug", label: "Getting Profile", data: profileId })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceProfiles.getProfile(profileId))
                    Utils.log({ type: result ? "success" : "error", label: "Got Profile", data: result, duration })
                    result && set((state) => ({ profiles: { ...state.profiles, [profileId]: result } }))
                    const address = result.id
                    // recent dms
                    try {
                        Utils.log({ type: "debug", label: "Getting Recent Dms", data: address })
                        const { result: recentDms, duration } = await Utils.withDuration(() => SubspaceProfiles.getRecentDms(result.dm_process))
                        recentDms && set((state) => ({ recentDms: { ...state.recentDms, ...recentDms } }))
                        Utils.log({ type: "success", label: "Got Recent Dms", data: recentDms, duration })
                    } catch (e) {
                        Utils.log({ type: "error", label: "Error Getting Recent Dms", data: e })
                    }
                    // primary name
                    try {
                        Utils.log({ type: "debug", label: "Getting Primary Name", data: address })
                        const { result: primaryName, duration } = await Utils.withDuration(() => getPrimaryName(address))
                        primaryName && set((state) => ({ primaryNames: { ...state.primaryNames, [address]: primaryName } }))
                        Utils.log({ type: "success", label: "Got Primary Name", data: primaryName, duration })
                    } catch (e) {
                        Utils.log({ type: "error", label: "Error Getting Primary Name", data: e })
                    }
                    // wander tier
                    try {
                        Utils.log({ type: "debug", label: "Getting Wander Tier", data: address })
                        const { result: wanderTier, duration } = await Utils.withDuration(() => getWanderTier(address))
                        wanderTier && set((state) => ({ wanderTiers: { ...state.wanderTiers, [address]: wanderTier } }))
                        Utils.log({ type: "success", label: "Got Wander Tier", data: wanderTier, duration })
                    } catch (e) {
                        Utils.log({ type: "error", label: "Error Getting Wander Tier", data: e })
                    }
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Getting Profile", data: e })
                    return null
                }
            },
            create: async (data: Inputs.ICreateProfile) => {
                Utils.log({ type: "debug", label: "Creating Profile", data: data })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceProfiles.createProfile(data))
                    Utils.log({ type: result ? "success" : "error", label: "Created Profile", data: result, duration })
                    result && set((state) => ({ profiles: { ...state.profiles, [result.id]: result } }))
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Creating Profile", data: e })
                    return null
                }
            },
            update: async (data: Inputs.ICreateProfile) => {
                Utils.log({ type: "debug", label: "Updating Profile", data: data })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceProfiles.updateProfile(data))
                    Utils.log({ type: "success", label: "Updated Profile", data: result, duration })
                    result && set((state) => ({ profiles: { ...state.profiles, [result.id]: result } }))
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Updating Profile", data: e })
                    return null
                }
            },

            // Friend functions
            addFriend: async (userId: string) => {
                Utils.log({ type: "debug", label: "Adding Friend", data: userId })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceProfiles.addFriend(userId))
                    Utils.log({ type: "success", label: "Added Friend", data: { result }, duration })
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Adding Friend", data: e })
                    return false
                }
            },
            acceptFriend: async (userId: string) => {
                Utils.log({ type: "debug", label: "Accepting Friend", data: userId })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceProfiles.acceptFriend(userId))
                    Utils.log({ type: "success", label: "Accepted Friend", data: { result }, duration })
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Accepting Friend", data: e })
                    return false
                }
            },
            rejectFriend: async (userId: string) => {
                Utils.log({ type: "debug", label: "Rejecting Friend", data: userId })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceProfiles.rejectFriend(userId))
                    Utils.log({ type: "success", label: "Rejected Friend", data: { result }, duration })
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Rejecting Friend", data: e })
                    return false
                }
            },
            removeFriend: async (userId: string) => {
                Utils.log({ type: "debug", label: "Removing Friend", data: userId })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceProfiles.removeFriend(userId))
                    Utils.log({ type: "success", label: "Removed Friend", data: { result }, duration })
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Removing Friend", data: e })
                    return false
                }
            },

            // DM functions
            sendDM: async (data: Inputs.ISendDM) => {
                Utils.log({ type: "debug", label: "Sending DM", data: data })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceProfiles.sendDM(data))
                    Utils.log({ type: "success", label: "Sent DM", data: { result }, duration })
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Sending DM", data: e })
                    return false
                }
            },
            editDM: async (data: Inputs.IEditDM) => {
                Utils.log({ type: "debug", label: "Editing DM", data: data })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceProfiles.editDM(data))
                    Utils.log({ type: "success", label: "Edited DM", data: { result }, duration })
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Editing DM", data: e })
                    return false
                }
            },
            deleteDM: async (data: Inputs.IDeleteDM) => {
                Utils.log({ type: "debug", label: "Deleting DM", data: data })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceProfiles.deleteDM(data))
                    Utils.log({ type: "success", label: "Deleted DM", data: { result }, duration })
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Deleting DM", data: e })
                    return false
                }
            },

            // DM conversation functions
            getConversationIds: async (dmProcessId: string) => {
                Utils.log({ type: "debug", label: "Getting Conversation IDs", data: dmProcessId })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceProfiles.getConversationIds({ dmProcessId }))
                    Utils.log({ type: "success", label: "Got Conversation IDs", data: result, duration })
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Getting Conversation IDs", data: e })
                    return []
                }
            },
            getDmConversation: async (dmProcessId: string, friendId: string) => {
                Utils.log({ type: "debug", label: "Getting DM Conversation", data: { dmProcessId, friendId } })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceProfiles.getDmConversation({ dmProcessId, friendId }))
                    Utils.log({ type: "success", label: "Got DM Conversation", data: result, duration })
                    result && set((state) => ({
                        dmConversations: {
                            ...state.dmConversations,
                            [dmProcessId]: {
                                ...state.dmConversations[dmProcessId],
                                [friendId]: result
                            }
                        }
                    }))
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Getting DM Conversation", data: e })
                    return {}
                }
            },
            // getTempConversationIds: async (dmProcessId: string) => { - DISABLED: temporary DMs not supported
            //     Utils.log({ type: "debug", label: "Getting Temp Conversation IDs", data: dmProcessId })
            //     try {
            //         const { result, duration } = await Utils.withDuration(() => SubspaceProfiles.getTempConversationIds({ dmProcessId }))
            //         Utils.log({ type: "success", label: "Got Temp Conversation IDs", data: result, duration })
            //         return result
            //     } catch (e) {
            //         Utils.log({ type: "error", label: "Error Getting Temp Conversation IDs", data: e })
            //         return []
            //     }
            // },
            // getTempDmConversation: async (dmProcessId: string, userId: string) => { - DISABLED: temporary DMs not supported
            //     Utils.log({ type: "debug", label: "Getting Temp DM Conversation", data: { dmProcessId, userId } })
            //     try {
            //         const { result, duration } = await Utils.withDuration(() => SubspaceProfiles.getTempDmConversation({ dmProcessId, userId }))
            //         Utils.log({ type: "success", label: "Got Temp DM Conversation", data: result, duration })
            //         result && set((state) => ({
            //             tempConversations: {
            //                 ...state.tempConversations,
            //                 [dmProcessId]: {
            //                     ...state.tempConversations[dmProcessId],
            //                     [userId]: result
            //                 }
            //             }
            //         }))
            //         return result
            //     } catch (e) {
            //         Utils.log({ type: "error", label: "Error Getting Temp DM Conversation", data: e })
            //         return {}
            //     }
            // },
            getBlockedUsers: async (dmProcessId: string) => {
                Utils.log({ type: "debug", label: "Getting Blocked Users", data: dmProcessId })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceProfiles.getBlockedUsers({ dmProcessId }))
                    Utils.log({ type: "success", label: "Got Blocked Users", data: result, duration })
                    result && set((state) => ({ blockedUsers: { ...state.blockedUsers, [dmProcessId]: result } }))
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Getting Blocked Users", data: e })
                    return []
                }
            }
        },
        servers: {
            // Core server functions
            get: async (serverId: string) => {
                Utils.log({ type: "debug", label: "Getting Server", data: serverId })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceServers.getServer(serverId))
                    Utils.log({ type: result ? "success" : "error", label: "Got Server", data: result, duration })
                    result && set((state) => ({ servers: { ...state.servers, [serverId]: result } }))
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Getting Server", data: e })
                    return null
                }
            },
            create: async (data: Inputs.ICreateServer) => {
                Utils.log({ type: "debug", label: "Creating Server", data: data })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceServers.createServer(data))
                    Utils.log({ type: "success", label: "Created Server", data: result, duration })
                    result && set((state) => ({ servers: { ...state.servers, [result.profile.id]: result } }))
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Creating Server", data: e })
                    return null
                }
            },
            update: async (data: Inputs.IUpdateServer) => {
                Utils.log({ type: "debug", label: "Updating Server", data: data })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceServers.updateServer(data as any))
                    Utils.log({ type: "success", label: "Updated Server", data: result, duration })
                    result && set((state) => ({ servers: { ...state.servers, [result.profile.id]: result } }))
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Updating Server", data: e })
                    return null
                }
            },
            updateServerSource: async (serverId: string) => {
                Utils.log({ type: "debug", label: "Updating Server Source", data: serverId })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceServers.updateServerSource(serverId))
                    Utils.log({ type: "success", label: "Updated Server Source", data: { result }, duration })
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Updating Server Source", data: e })
                    return false
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
            },
            leave: async (serverId: string) => {
                Utils.log({ type: "debug", label: "Leaving Server", data: serverId })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceServers.leaveServer(serverId))
                    Utils.log({ type: "success", label: "Left Server", data: { result }, duration })
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Leaving Server", data: e })
                    return false
                }
            },
            // Category functions
            createCategory: async (data: Inputs.ICreateCategory) => {
                Utils.log({ type: "debug", label: "Creating Category", data: data })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceServers.createCategory(data))
                    Utils.log({ type: "success", label: "Created Category", data: result, duration })
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Creating Category", data: e })
                    return null
                }
            },
            updateCategory: async (data: Inputs.IUpdateCategory) => {
                Utils.log({ type: "debug", label: "Updating Category", data: data })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceServers.updateCategory(data))
                    Utils.log({ type: "success", label: "Updated Category", data: result, duration })
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Updating Category", data: e })
                    return null
                }
            },
            deleteCategory: async (data: Inputs.IDeleteCategory) => {
                Utils.log({ type: "debug", label: "Deleting Category", data: data })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceServers.deleteCategory(data))
                    Utils.log({ type: "success", label: "Deleted Category", data: { result }, duration })
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Deleting Category", data: e })
                    return false
                }
            },

            // Channel functions
            createChannel: async (data: Inputs.ICreateChannel) => {
                Utils.log({ type: "debug", label: "Creating Channel", data: data })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceServers.createChannel(data))
                    Utils.log({ type: "success", label: "Created Channel", data: result, duration })
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Creating Channel", data: e })
                    return null
                }
            },
            updateChannel: async (data: Inputs.IUpdateChannel) => {
                Utils.log({ type: "debug", label: "Updating Channel", data: data })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceServers.updateChannel(data))
                    Utils.log({ type: "success", label: "Updated Channel", data: result, duration })
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Updating Channel", data: e })
                    return null
                }
            },
            deleteChannel: async (data: Inputs.IDeleteChannel) => {
                Utils.log({ type: "debug", label: "Deleting Channel", data: data })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceServers.deleteChannel(data))
                    Utils.log({ type: "success", label: "Deleted Channel", data: { result }, duration })
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Deleting Channel", data: e })
                    return false
                }
            },

            // Role functions
            createRole: async (data: Inputs.ICreateRole) => {
                Utils.log({ type: "debug", label: "Creating Role", data: data })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceServers.createRole(data))
                    Utils.log({ type: "success", label: "Created Role", data: result, duration })
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Creating Role", data: e })
                    return null
                }
            },
            updateRole: async (data: Inputs.IUpdateRole) => {
                Utils.log({ type: "debug", label: "Updating Role", data: data })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceServers.updateRole(data))
                    Utils.log({ type: "success", label: "Updated Role", data: result, duration })
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Updating Role", data: e })
                    return null
                }
            },
            deleteRole: async (data: Inputs.IDeleteRole) => {
                Utils.log({ type: "debug", label: "Deleting Role", data: data })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceServers.deleteRole(data))
                    Utils.log({ type: "success", label: "Deleted Role", data: { result }, duration })
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Deleting Role", data: e })
                    return false
                }
            },
            assignRole: async (data: Inputs.IAssignRole) => {
                Utils.log({ type: "debug", label: "Assigning Role", data: data })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceServers.assignRole(data))
                    Utils.log({ type: "success", label: "Assigned Role", data: { result }, duration })
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Assigning Role", data: e })
                    return false
                }
            },
            unassignRole: async (data: Inputs.IUnassignRole) => {
                Utils.log({ type: "debug", label: "Unassigning Role", data: data })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceServers.unassignRole(data))
                    Utils.log({ type: "success", label: "Unassigned Role", data: { result }, duration })
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Unassigning Role", data: e })
                    return false
                }
            },

            // Message functions
            sendMessage: async (data: Inputs.ISendMessage) => {
                Utils.log({ type: "debug", label: "Sending Message", data: data })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceServers.sendMessage(data))
                    Utils.log({ type: "success", label: "Sent Message", data: result, duration })
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Sending Message", data: e })
                    return null
                }
            },
            updateMessage: async (data: Inputs.IUpdateMessage) => {
                Utils.log({ type: "debug", label: "Updating Message", data: data })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceServers.updateMessage(data))
                    Utils.log({ type: "success", label: "Updated Message", data: result, duration })
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Updating Message", data: e })
                    return null
                }
            },
            deleteMessage: async (data: Inputs.IDeleteMessage) => {
                Utils.log({ type: "debug", label: "Deleting Message", data: data })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceServers.deleteMessage(data))
                    Utils.log({ type: "success", label: "Deleted Message", data: { result }, duration })
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Deleting Message", data: e })
                    return false
                }
            },
            // Member functions
            getAllMembers: async (serverId: string) => {
                Utils.log({ type: "debug", label: "Getting Server Members", data: serverId })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceServers.getServerMembers(serverId))
                    Utils.log({ type: "success", label: "Got Server Members", data: result, duration })
                    result && set((state) => ({ members: { ...state.members, [serverId]: result } }))
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Getting Server Members", data: e })
                    return null
                }
            },
            getMember: async (data: Inputs.IGetMember) => {
                Utils.log({ type: "debug", label: "Getting Server Member", data: data })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceServers.getServerMember(data))
                    Utils.log({ type: "success", label: "Got Server Member", data: result, duration })
                    // Update the local state with the fetched member data
                    if (result) {
                        set((state) => ({
                            members: {
                                ...state.members,
                                [data.serverId]: {
                                    ...state.members[data.serverId],
                                    [data.userId]: result
                                }
                            }
                        }))
                    }
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Getting Server Member", data: e })
                    return null
                }
            },
            updateMember: async (data: Inputs.IUpdateMember) => {
                Utils.log({ type: "debug", label: "Updating Server Member", data: data })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceServers.updateMember(data))
                    Utils.log({ type: "success", label: "Updated Server Member", data: result, duration })
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Updating Server Member", data: e })
                    return null
                }
            },
            kickMember: async (data: Inputs.IKickMember) => {
                Utils.log({ type: "debug", label: "Kicking Server Member", data: data })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceServers.kickMember(data))
                    Utils.log({ type: "success", label: "Kicked Server Member", data: { result }, duration })
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Kicking Server Member", data: e })
                    return false
                }
            },
            banMember: async (data: Inputs.IBanMember) => {
                Utils.log({ type: "debug", label: "Banning Server Member", data: data })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceServers.banMember(data))
                    Utils.log({ type: "success", label: "Banned Server Member", data: { result }, duration })
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Banning Server Member", data: e })
                    return false
                }
            },
            unbanMember: async (data: Inputs.IUnbanMember) => {
                Utils.log({ type: "debug", label: "Unbanning Server Member", data: data })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceServers.unbanMember(data))
                    Utils.log({ type: "success", label: "Unbanned Server Member", data: { result }, duration })
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Unbanning Server Member", data: e })
                    return false
                }
            },
        },
        messages: {
            get: async (serverId: string, channelId: string) => {
                Utils.log({ type: "debug", label: "Getting Messages", data: { serverId, channelId } })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceServers.getMessages(serverId, channelId))
                    Utils.log({ type: "success", label: "Got Messages", data: result, duration })
                    result && set((state) => ({ messages: { ...state.messages, [serverId]: { ...state.messages[serverId], [channelId]: result } } }))
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Getting Messages", data: e })
                    return null
                }
            },
            getAll: async (serverId: string) => {
                Utils.log({ type: "debug", label: "Getting All Messages", data: serverId })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceServers.getAllMessages(serverId))
                    Utils.log({ type: "success", label: "Got All Messages", data: result, duration })
                    result && set((state) => ({ messages: { ...state.messages, [serverId]: result } }))
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Getting All Messages", data: e })
                    return null
                }
            },
            getOne: async (serverId: string, channelId: string, messageId: string) => {
                Utils.log({ type: "debug", label: "Getting One Message", data: { serverId, channelId, messageId } })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceServers.getMessage(serverId, channelId, messageId))
                    Utils.log({ type: "success", label: "Got One Message", data: result, duration })
                    result && set((state) => ({ messages: { ...state.messages, [serverId]: { ...state.messages[serverId], [channelId]: { ...state.messages[serverId][channelId], [messageId]: result } } } }))
                    return result
                } catch (e) {
                    Utils.log({ type: "error", label: "Error Getting One Message", data: e })
                    return null
                }
            }
        },

        // Utility functions
        clearAllStates: () => {
            Utils.log({ type: "debug", label: "Clearing All States", data: "Resetting profiles, servers, members, and DM data" })
            set(() => ({
                profiles: {},
                primaryNames: {},
                wanderTiers: {},
                servers: {},
                members: {},
                dmConversations: {},
                // tempConversations: {}, - DISABLED: temporary DMs not supported
                friends: {},
                blockedUsers: {}
            }))
            // Also clear localStorage
            localStorage.removeItem("subspace2-dev")
            Utils.log({ type: "success", label: "Cleared All States", data: "All states and storage cleared" })
        }
    },
}), {
    name: "subspace2-dev",
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
        profiles: state.profiles,
        recentDms: state.recentDms,
        primaryNames: state.primaryNames,
        wanderTiers: state.wanderTiers,
        servers: state.servers,
        members: state.members,
        messages: state.messages,
        dmConversations: state.dmConversations,
        // tempConversations: state.tempConversations, - DISABLED: temporary DMs not supported
        friends: state.friends,
        blockedUsers: state.blockedUsers,
    })
}))

// Helper fns to access data from state

export function useProfile(userId: string): IProfile | undefined {
    return useSubspace((state) => state.profiles[userId] ? state.profiles[userId] : null)
}

export function useProfiles(): Record<string, IProfile> {
    return useSubspace((state) => state.profiles)
}

export function useProfileServers(userId: string): Record<string, IServer> {
    const profile = useProfile(userId)
    const servers = useServers()

    if (!userId) return {}

    const profileServerId = Object.entries(profile?.servers || {}).filter(([serverId, server]) => server.approved)
    const returnServers: Record<string, IServer> = {}
    profileServerId.forEach(([serverId, server]) => {
        returnServers[serverId] = servers[serverId]
    })
    return returnServers
}

export function useServer(serverId: string): IServer | undefined {
    return useSubspace((state) => state.servers[serverId] ? state.servers[serverId] : null)
}

export function useServers(): Record<string, IServer> {
    return useSubspace((state) => state.servers)
}

export function useMember(serverId: string, memberId: string): IMember | undefined {
    return useSubspace((state) => state.members[serverId]?.[memberId] || null)
}

export function useMembers(serverId: string): Record<string, IMember> | undefined {
    return useSubspace((state) => state.members[serverId] ? state.members[serverId] : null)
}

export function useRole(serverId: string, roleId: string): IRole | undefined {
    return useSubspace((state) => state.servers[serverId]?.roles[roleId] || null)
}

export function useRoles(serverId: string): Record<string, IRole> | undefined {
    return useSubspace((state) => state.servers[serverId]?.roles ? state.servers[serverId]?.roles : null)
}

export function usePrimaryName(address: string): string | undefined {
    return useSubspace((state) => state.primaryNames[address] ? state.primaryNames[address] : null)
}

export function usePrimaryNames(): Record<string, string> {
    return useSubspace((state) => state.primaryNames)
}

export function useWanderTier(address: string): IWanderTier | undefined {
    return useSubspace((state) => state.wanderTiers[address] ? state.wanderTiers[address] : null)
}

export function useWanderTiers(): Record<string, IWanderTier> {
    return useSubspace((state) => state.wanderTiers)
}

export function useChannel(serverId: string, channelId: string): IChannel | undefined {
    return useSubspace((state) => state.servers[serverId]?.channels[channelId] || null)
}

export function useChannels(serverId: string): Record<string, IChannel> | undefined {
    return useSubspace((state) => state.servers[serverId]?.channels ? state.servers[serverId]?.channels : null)
}

export function useCategory(serverId: string, categoryId: string): ICategory | undefined {
    return useSubspace((state) => state.servers[serverId]?.categories[categoryId] || null)
}

export function useCategories(serverId: string): Record<string, ICategory> | undefined {
    return useSubspace((state) => state.servers[serverId]?.categories ? state.servers[serverId]?.categories : null)
}

export function useMessages(serverId: string, channelId: string): Record<string, IMessage> {
    return useSubspace((state) => state.messages[serverId]?.[channelId] ? state.messages[serverId][channelId] : null)
}

// DM conversation helper functions
export function useDmConversation(dmProcessId: string, friendId: string): Record<string, IMessage> | null {
    return useSubspace((state) => state.dmConversations[dmProcessId]?.[friendId] ? state.dmConversations[dmProcessId][friendId] : null)
}

export function useDmConversations(dmProcessId: string): Record<string, Record<string, IMessage>> | null {
    return useSubspace((state) => state.dmConversations[dmProcessId] ? state.dmConversations[dmProcessId] : null)
}

// export function useTempDmConversation(dmProcessId: string, userId: string): Record<string, IMessage> | null { - DISABLED: temporary DMs not supported
//     return useSubspace((state) => state.tempConversations[dmProcessId]?.[userId] ? state.tempConversations[dmProcessId][userId] : null)
// }

// export function useTempDmConversations(dmProcessId: string): Record<string, Record<string, IMessage>> | null { - DISABLED: temporary DMs not supported
//     return useSubspace((state) => state.tempConversations[dmProcessId] ? state.tempConversations[dmProcessId] : null)
// }

export function useFriends(dmProcessId: string): string[] {
    return useSubspace((state) => state.friends[dmProcessId] ? state.friends[dmProcessId] : [])
}

export function useBlockedUsers(dmProcessId: string): string[] {
    return useSubspace((state) => state.blockedUsers[dmProcessId] ? state.blockedUsers[dmProcessId] : [])
}

export function useRecentDms(): Record<string, number> {
    return useSubspace((state) => state.recentDms)
}

// Helper function to access actions
export function useSubspaceActions() {
    return useSubspace((state) => state.actions)
}