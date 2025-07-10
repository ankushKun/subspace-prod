import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

interface GlobalState {
    activeServerId: string
    activeChannelId: string
    actions: {
        setActiveServerId: (serverId: string) => void
        setActiveChannelId: (channelId: string) => void
    }
}

export const useGlobalState = create<GlobalState>()(persist((set, get) => ({
    activeServerId: "",
    activeChannelId: "",
    actions: {
        setActiveServerId: (serverId: string) => set({ activeServerId: serverId }),
        setActiveChannelId: (channelId: string) => set({ activeChannelId: channelId })
    }
}), {
    name: "global-state",
    storage: createJSONStorage(() => localStorage),
    partialize: state => ({
        activeServerId: state.activeServerId,
        activeChannelId: state.activeChannelId
    })
}))