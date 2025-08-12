import { useEffect, useMemo, useRef } from "react";
import { useSubspace } from "@/hooks/use-subspace";
import { useWallet } from "@/hooks/use-wallet";
import { useGlobalState } from "@/hooks/use-global-state";

// Central background data orchestrator for servers, members, and messages.
// Invisible component; fetches lazily, throttles requests, and runs safe polling loops.
export default function DataLoader() {
    const { connected, address } = useWallet();
    const { activeServerId, activeChannelId, activeFriendId } = useGlobalState();
    const {
        subspace,
        profile,
        servers,
        dmConversations,
        actions,
        loadingServers,
        loadingDMs,
    } = useSubspace();

    // Throttle maps to avoid redundant network calls in rapid succession
    const lastServerFetchRef = useRef<Map<string, number>>(new Map());
    const lastMembersFetchRef = useRef<Map<string, number>>(new Map());
    const lastChannelMessagesFetchRef = useRef<string | null>(null); // composite key serverId:channelId
    const lastDMFetchRef = useRef<Map<string, number>>(new Map());

    // Polling controls. Only one channel and one DM loop run at a time.
    const channelPollingActiveRef = useRef<boolean>(false);
    const channelPollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dmPollingActiveRef = useRef<boolean>(false);
    const dmPollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Helpers
    const now = () => Date.now();
    const shouldThrottle = (last?: number, ms: number = 2000) => typeof last === 'number' && now() - last < ms;

    // Initialize SDK and hydrate own profile after wallet connects
    useEffect(() => {
        if (!connected || !address) return;
        // Initialize subspace connection and load own profile lazily
        actions.init();
        actions.profile.get().catch(() => { });
    }, [connected, address]);

    // Sequentially load joined servers to keep startup smooth and avoid request bursts
    useEffect(() => {
        if (!profile?.serversJoined) return;
        const serverIds = Object.keys(profile.serversJoined);
        if (serverIds.length === 0) return;

        let cancelled = false;

        const loadSequentially = async () => {
            for (const sid of serverIds) {
                if (cancelled) break;
                await ensureServerLoaded(sid);
                // Small delay between servers to avoid bursts
                await new Promise(res => setTimeout(res, 150));
            }
        };

        loadSequentially();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.serversJoined]);

    // Ensure the active server is minimally hydrated when it changes
    useEffect(() => {
        if (!activeServerId) return;
        void ensureServerLoaded(activeServerId);
    }, [activeServerId]);

    // Ensure members and their profiles are loaded when a server becomes active
    useEffect(() => {
        if (!activeServerId) return;
        void ensureMembersLoaded(activeServerId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeServerId, servers[activeServerId]?.members]);

    // Channel messages polling loop. Restarts when dependencies change.
    useEffect(() => {
        // stop previous loop
        channelPollingActiveRef.current = false;
        if (channelPollingTimeoutRef.current) {
            clearTimeout(channelPollingTimeoutRef.current);
            channelPollingTimeoutRef.current = null;
        }

        if (subspace && activeServerId && activeChannelId && servers[activeServerId]) {
            channelPollingActiveRef.current = true;
            const compositeKey = `${activeServerId}:${activeChannelId}`;
            lastChannelMessagesFetchRef.current = compositeKey;

            const loop = async () => {
                if (!channelPollingActiveRef.current) return;
                try {
                    await actions.servers.getMessages(activeServerId, String(activeChannelId), 50);
                } catch (_) {
                    // continue even on transient failures
                } finally {
                    if (!channelPollingActiveRef.current) return;
                    channelPollingTimeoutRef.current = setTimeout(loop, 1000);
                }
            };

            void loop();
        }

        return () => {
            channelPollingActiveRef.current = false;
            if (channelPollingTimeoutRef.current) {
                clearTimeout(channelPollingTimeoutRef.current);
                channelPollingTimeoutRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subspace, activeServerId, activeChannelId]);

    // DM polling loop. Ensures the conversation exists and then polls for messages.
    useEffect(() => {
        // stop previous loop
        dmPollingActiveRef.current = false;
        if (dmPollingTimeoutRef.current) {
            clearTimeout(dmPollingTimeoutRef.current);
            dmPollingTimeoutRef.current = null;
        }

        if (subspace && activeFriendId) {
            // Ensure conversation exists
            if (!dmConversations[activeFriendId]) {
                actions.dms.getConversation(activeFriendId).catch(() => { });
            }

            dmPollingActiveRef.current = true;

            const loop = async () => {
                if (!dmPollingActiveRef.current) return;
                try {
                    await actions.dms.getMessages(activeFriendId, 50);
                } catch (_) {
                    // continue even on transient failures
                } finally {
                    if (!dmPollingActiveRef.current) return;
                    dmPollingTimeoutRef.current = setTimeout(loop, 1000);
                }
            };

            void loop();
        }

        return () => {
            dmPollingActiveRef.current = false;
            if (dmPollingTimeoutRef.current) {
                clearTimeout(dmPollingTimeoutRef.current);
                dmPollingTimeoutRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subspace, activeFriendId]);

    // Helpers: ensure server and members
    async function ensureServerLoaded(serverId: string): Promise<void> {
        if (!serverId) return;
        const server = servers[serverId];
        const last = lastServerFetchRef.current.get(serverId);
        if (server && server.name && !shouldThrottle(last, 10_000)) {
            // Already loaded and not stale; skip
            return;
        }
        if (loadingServers.has(serverId) || shouldThrottle(last, 2_000)) return;
        lastServerFetchRef.current.set(serverId, now());
        try {
            await actions.servers.get(serverId);
        } catch (_) {
            // swallow
        }
    }

    async function ensureMembersLoaded(serverId: string): Promise<void> {
        const server = servers[serverId];
        const hasMembers = !!(server?.members && (Array.isArray(server.members) ? server.members.length > 0 : Object.keys(server.members || {}).length > 0));
        const last = lastMembersFetchRef.current.get(serverId);
        if (hasMembers || shouldThrottle(last, 10_000)) return;
        lastMembersFetchRef.current.set(serverId, now());
        try {
            const members = await actions.servers.getMembers(serverId);
            if (Array.isArray(members) && members.length > 0) {
                const userIds = members.map(m => m.userId);
                // Fire-and-forget: hydrate profiles in the background
                void actions.profile.getBulk(userIds);
                void actions.profile.getBulkPrimaryNames(userIds);
            }
        } catch (_) {
            // swallow
        }
    }

    return <div id="data-loader" style={{ display: "none" }} />;
}