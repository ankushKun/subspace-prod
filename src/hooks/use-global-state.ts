import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

interface GlobalState {
    activeServerId: string
    activeChannelId: string
    activeFriendId: string
    actions: {
        setActiveServerId: (serverId: string) => void
        setActiveChannelId: (channelId: string) => void
        setActiveFriendId: (friendId: string) => void
        clear: () => void
    }
}

export const useGlobalState = create<GlobalState>()(persist((set, get) => ({
    activeServerId: "",
    activeChannelId: "",
    activeFriendId: "",
    actions: {
        setActiveServerId: (serverId: string) => set({ activeServerId: serverId }),
        setActiveChannelId: (channelId: string) => set({ activeChannelId: channelId }),
        setActiveFriendId: (friendId: string) => set({ activeFriendId: friendId }),
        clear: () => {
            console.log("🧹 Clearing global state due to wallet disconnection")
            set({
                activeServerId: "",
                activeChannelId: "",
                activeFriendId: ""
            })
        }
    }
}), {
    name: "global-state",
    storage: createJSONStorage(() => localStorage),
    partialize: state => ({
        activeServerId: state.activeServerId,
        activeChannelId: state.activeChannelId,
        activeFriendId: state.activeFriendId
    })
}))