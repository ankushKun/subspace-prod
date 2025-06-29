import type { Server } from '@subspace-protocol/sdk'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { getSubspace } from './subspace'

export interface IuseServers {
    servers: Record<string, Server> // server id -> server
    setServers: (servers: Record<string, Server>) => void
    getServers: () => Record<string, Server>
    getServer: (id: string) => Promise<Server | undefined>
    setServer: (id: string, server: Server) => void
    removeServer: (id: string) => void
}

export const useServerStore = create<IuseServers>()(
    persist(
        (set, get) => ({
            servers: {},
            setServers: (servers) => set({ servers }),
            getServers: () => get().servers,
            getServer: async (id) => {
                const ss = getSubspace()
                const server = await ss.getServer(id)
                if (server) set({ servers: { ...get().servers, [id]: server } })
                return server
            },
            setServer: (id, server) => set({ servers: { ...get().servers, [id]: server } }),
            removeServer: (id) => set({ servers: Object.fromEntries(Object.entries(get().servers).filter(([key]) => key !== id)) }),
        }),
        {
            name: 'subspace-servers',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ servers: state.servers }),
        }
    ),
)