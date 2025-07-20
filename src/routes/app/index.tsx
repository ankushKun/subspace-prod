import { useNavigate, useParams } from "react-router"

import ServerList from "./components/server-list"
import ChannelList from "./components/channel-list"
import DmsList from "./components/dms-list"
import MemberList from "./components/member-list"
import Messages from "./components/messages"
import Welcome from "./components/welcome"
import Profile from "./components/profile"
import { useGlobalState } from "@/hooks/use-global-state"
import { useSubspace } from "@/hooks/use-subspace"
import { useEffect } from "react"
import { useWallet } from "@/hooks/use-wallet"

export default function App() {
    const { serverId, channelId } = useParams()
    const navigate = useNavigate()
    const { connected, address } = useWallet()
    const { actions: stateActions } = useGlobalState()
    const { actions: subspaceActions, subspace } = useSubspace()

    useEffect(() => {
        if (address) {
            // Removed navigate("/app") to prevent hot reload navigation issues
            // The user is already in the App component, no need to navigate
            if (!subspace) return
            subspaceActions.init()
            subspaceActions.profile.refresh()
        }
    }, [address])

    useEffect(() => {
        if (!subspace) return
        stateActions.setActiveServerId(serverId)
        stateActions.setActiveChannelId(channelId)

        // Beautiful navigation logging
        console.groupCollapsed(
            '%c🎯 Navigation Update',
            'color: #9C27B0; font-weight: bold; font-size: 12px;'
        );
        console.log('%cServer ID:', 'color: #2196F3; font-weight: bold;', serverId || 'None');
        console.log('%cChannel ID:', 'color: #4CAF50; font-weight: bold;', channelId || 'None');
        console.groupEnd();

        // update server and members
        if (serverId) {
            subspaceActions.servers.get(serverId).then(server => {
                if (server) {
                    // Only refresh members if they haven't been loaded yet
                    const hasMembers = (server as any)?.members?.length > 0
                    const membersLoaded = (server as any)?.membersLoaded
                    const membersLoading = (server as any)?.membersLoading

                    if (!hasMembers && !membersLoaded && !membersLoading) {
                        subspaceActions.servers.refreshMembers(serverId).then(members => {
                            const userIds = members.map(m => m.userId)
                            if (userIds.length > 0) {
                                subspaceActions.profile.getBulk(userIds).then(console.log)
                            }
                        }).catch(console.error)
                    } else {
                        // Still load profiles for existing members if we have them
                        const existingMembers = (server as any)?.members || []
                        if (existingMembers.length > 0) {
                            const userIds = existingMembers.map(m => m.userId)
                            subspaceActions.profile.getBulk(userIds).catch(console.error)
                        }
                    }
                }
            }).catch(console.error)
        }
    }, [serverId, channelId, subspace])

    return <div className="flex flex-row items-start justify-start h-screen w-screen overflow-clip text-center text-2xl gap-0">
        <ServerList className="w-20 min-w-20 max-w-20 !overflow-x-visible overflow-y-scroll border-r h-full" />
        <div className="flex flex-col h-full items-start justify-start">
            <div className="grow h-full border-r border-b rounded-br-xl">
                {serverId ? <ChannelList className="w-80 min-w-80 h-full" /> : <DmsList className="w-80 min-w-80 h-full" />}
            </div>
            <Profile className="w-full h-fit p-2" />
        </div>
        {(serverId && channelId) ? <Messages className="grow border-r h-full" /> : <Welcome className="grow h-full" />}
        {(serverId && channelId) && <MemberList className="w-80 min-w-80 border-r h-full" />}
    </div>
}   