import { create } from "zustand"

interface ServerDialogState {
    isJoinDialogOpen: boolean
    isCreateDialogOpen: boolean
    actions: {
        openJoinDialog: () => void
        closeJoinDialog: () => void
        openCreateDialog: () => void
        closeCreateDialog: () => void
    }
}

export const useServerDialogs = create<ServerDialogState>((set) => ({
    isJoinDialogOpen: false,
    isCreateDialogOpen: false,
    actions: {
        openJoinDialog: () => set({ isJoinDialogOpen: true }),
        closeJoinDialog: () => set({ isJoinDialogOpen: false }),
        openCreateDialog: () => set({ isCreateDialogOpen: true }),
        closeCreateDialog: () => set({ isCreateDialogOpen: false }),
    }
}))
