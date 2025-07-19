import { useParams } from "react-router"

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

export default function App() {
    const { actions: stateActions } = useGlobalState()
    const { actions: subspaceActions, subspace } = useSubspace()
    const { serverId, channelId } = useParams()

    // Initialize subspace when app loads
    useEffect(() => {
        subspaceActions.init()
        // Load profile which will also load user's servers
        subspaceActions.profile.get().catch(console.error)
    }, [subspaceActions])

    useEffect(() => {
        stateActions.setActiveServerId(serverId)
        stateActions.setActiveChannelId(channelId)
        // update server and members
        if (subspace && serverId) {
            subspaceActions.servers.get(serverId).then(server => {
                if (server) {
                    subspaceActions.servers.refreshMembers(serverId).then(members => {
                        const userIds = members.map(m => m.userId)
                        subspaceActions.profile.getBulk(userIds)
                    })
                }
            })
        }
        console.table({ serverId, channelId })
    }, [serverId, channelId, stateActions, subspace])

    return <div className="flex flex-row items-start justify-start h-screen w-screen overflow-clip text-center text-2xl gap-0">
        <ServerList className="w-20 min-w-20 border-r h-full" />
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