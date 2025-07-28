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
import { useEffect, useState, useRef } from "react"
import { useWallet } from "@/hooks/use-wallet"
import ProfileCreationDialog from "@/components/profile-creation-dialog"
import NicknameSettingDialog from "@/components/nickname-setting-dialog"

export default function App() {
    const { serverId, channelId } = useParams()
    const navigate = useNavigate()
    const { connected, address } = useWallet()
    const { actions: stateActions } = useGlobalState()
    const { actions: subspaceActions, subspace, profile, servers, isCreatingProfile } = useSubspace()

    // State for nickname setting dialog
    const [nicknameDialogOpen, setNicknameDialogOpen] = useState(false)
    const [nicknameDialogServerId, setNicknameDialogServerId] = useState<string | null>(null)
    const [nicknameDialogServerName, setNicknameDialogServerName] = useState<string>("")

    // State to track servers where user clicked "Skip for now"
    const [skippedServers, setSkippedServers] = useState<Set<string>>(new Set())

    // Ref to track the previous server ID to detect actual server changes
    const previousServerIdRef = useRef<string | undefined>(undefined)

    useEffect(() => {
        if (address) {
            if (!subspace) return
            subspaceActions.init()
            subspaceActions.profile.refresh()
        } else {
            navigate("/app")
        }
    }, [address])

    useEffect(() => {
        if (!subspace) return
        stateActions.setActiveServerId(serverId)
        stateActions.setActiveChannelId(channelId)

        // Only clear skipped servers when the server ID actually changes
        if (previousServerIdRef.current !== serverId) {
            setSkippedServers(new Set())
            previousServerIdRef.current = serverId
        }

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
            // Force refresh server data when serverId changes
            // Members are automatically loaded when forceRefresh is true
            subspaceActions.servers.get(serverId, true).catch(console.error)
        }
    }, [serverId, channelId, subspace])

    // Check if user needs nickname prompt when server changes
    useEffect(() => {
        // Don't show nickname prompt if:
        // - No profile or profile is being created
        // - No active server
        // - No wallet address
        if (!profile || isCreatingProfile || !serverId || !address) {
            // Force close dialog if conditions aren't met
            if (nicknameDialogOpen) {
                handleNicknameDialogClose()
            }
            return
        }

        // Check if user has a primary name
        const hasPrimaryName = profile.primaryName && profile.primaryName.trim() !== ""

        // If user has a primary name, force close dialog and don't show it
        if (hasPrimaryName) {
            if (nicknameDialogOpen) {
                handleNicknameDialogClose()
            }
            return
        }

        // Check if user already has a nickname for this server
        const currentServer = servers[serverId]
        let hasServerNickname = false

        if (currentServer?.members) {
            if (Array.isArray(currentServer.members)) {
                // Handle members as array
                const member = currentServer.members.find((m: any) => m.userId === address)
                hasServerNickname = !!(member?.nickname && member.nickname.trim() !== "")
            } else if (currentServer.members[address]) {
                // Handle members as object
                const member = currentServer.members[address] as any
                hasServerNickname = !!(member?.nickname && member.nickname.trim() !== "")
            }
        }

        // If user has a server nickname, force close the dialog
        if (hasServerNickname) {
            if (nicknameDialogOpen) {
                handleNicknameDialogClose()
            }
            return
        }

        // Check if user has skipped this server before
        const hasSkippedServer = skippedServers.has(serverId)

        // If user has skipped this server, don't show the dialog
        if (hasSkippedServer) {
            if (nicknameDialogOpen) {
                handleNicknameDialogClose()
            }
            return
        }

        // Show nickname dialog only if user doesn't have primary name and no server nickname
        // and dialog isn't already open for this server and hasn't been skipped
        if (!nicknameDialogOpen || nicknameDialogServerId !== serverId) {
            setNicknameDialogServerId(serverId)
            setNicknameDialogServerName(currentServer?.name || "")
            setNicknameDialogOpen(true)
        }
    }, [profile, isCreatingProfile, serverId, address, servers, nicknameDialogOpen, nicknameDialogServerId, skippedServers])

    const handleNicknameDialogClose = () => {
        setNicknameDialogOpen(false)
        setNicknameDialogServerId(null)
        setNicknameDialogServerName("")
    }

    const handleNicknameDialogSkip = (serverId: string) => {
        // Add the server to the skipped list
        setSkippedServers(prev => new Set([...prev, serverId]))
        handleNicknameDialogClose()
    }

    return (
        <>
            <div className="flex flex-row items-start justify-start h-screen w-screen overflow-clip text-center text-2xl gap-0">
                <ServerList className="w-20 min-w-20 max-w-20 !overflow-x-visible overflow-y-scroll border-r h-full" />
                <div className="flex flex-col h-full items-start justify-start">
                    <div className="grow h-full border-r border-b rounded-br-xl">
                        {serverId ? (
                            <ChannelList className="w-80 min-w-80 h-full" />
                        ) : (
                            <DmsList className="w-80 min-w-80 h-full" />
                        )}
                    </div>
                    <Profile className="w-full h-fit p-2" />
                </div>
                {(serverId && channelId) ? (
                    <Messages className="grow border-r h-full" />
                ) : (
                    <Welcome className="grow h-full" />
                )}
                {(serverId && channelId) && (
                    <MemberList className="w-80 min-w-80 border-r h-full" />
                )}
            </div>

            {/* Profile Creation Dialog */}
            <ProfileCreationDialog />

            {/* Nickname Setting Dialog */}
            <NicknameSettingDialog
                isOpen={nicknameDialogOpen}
                serverId={nicknameDialogServerId}
                serverName={nicknameDialogServerName}
                onClose={handleNicknameDialogClose}
                onSkip={handleNicknameDialogSkip}
            />
        </>
    )
}   