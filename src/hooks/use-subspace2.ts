import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import { SubspaceProfiles, SubspaceServers, Utils } from "@subspace-protocol/sdk"
import type { IMember, IProfile, IServer, ICategory, IChannel, IRole, IMessage } from "@subspace-protocol/sdk/types"
import type { Inputs } from "@subspace-protocol/sdk/types"

interface SubspaceState {
    profiles: Record<string, IProfile>
    servers: Record<string, IServer> // this will contain all server metadata like channels, roles, server info etc
    members: Record<string, Record<string, IMember>> // a seperate mapping for server members
    actions: SubspaceActions
}

interface SubspaceActions {
    servers: {
        // Core server functions
        get: (serverId: string) => Promise<IServer | null>
        create: (data: Inputs.ICreateServer) => Promise<IServer | null>
        update: (data: Inputs.IUpdateServer) => Promise<IServer | null>
        join: (serverId: string) => Promise<boolean>
        getMembers: (serverId: string) => Promise<Record<string, IMember> | null>

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
    },
    // Utility functions
    clearAllStates: () => void
}

export const useSubspace2 = create<SubspaceState>()(persist((set, get) => ({
    profiles: {},
    servers: {},
    members: {},
    actions: {
        profiles: {
            get: async (profileId: string) => {
                Utils.log({ type: "debug", label: "Getting Profile", data: profileId })
                try {
                    const { result, duration } = await Utils.withDuration(() => SubspaceProfiles.getProfile(profileId))
                    Utils.log({ type: result ? "success" : "error", label: "Got Profile", data: result, duration })
                    result && set((state) => ({ profiles: { ...state.profiles, [profileId]: result } }))
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
            getMembers: async (serverId: string) => {
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
            }
        },

        // Utility functions
        clearAllStates: () => {
            Utils.log({ type: "debug", label: "Clearing All States", data: "Resetting profiles, servers, and members" })
            set(() => ({
                profiles: {},
                servers: {},
                members: {}
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

export function useMembers(): Record<string, Record<string, IMember>>
export function useMembers(serverId: string): Record<string, IMember> | undefined
export function useMembers(serverId?: string): Record<string, Record<string, IMember>> | Record<string, IMember> | undefined {
    if (serverId) {
        return useSubspace2((state) => state.members[serverId])
    }
    return useSubspace2((state) => state.members)
}

// Helper function to access actions
export function useSubspaceActions() {
    return useSubspace2((state) => state.actions)
}