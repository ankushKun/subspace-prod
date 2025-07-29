import { useNavigate, useParams, useSearchParams } from "react-router"

import ServerList from "./components/server-list"
import ChannelList from "./components/channel-list"
import DmsList from "./components/dms-list"
import MemberList from "./components/member-list"
import Messages, { type MessagesRef } from "./components/messages"
import DMMessages, { type DMMessagesRef } from "./components/dm-messages"
import Welcome from "./components/welcome"
import Profile from "./components/profile"
import { useGlobalState } from "@/hooks/use-global-state"
import { useSubspace } from "@/hooks/use-subspace"
import { useEffect, useState, useRef, useMemo } from "react"
import { useWallet } from "@/hooks/use-wallet"
import { useIsMobile } from "@/hooks/use-mobile"
import ProfileCreationDialog from "@/components/profile-creation-dialog"
import NicknameSettingDialog from "@/components/nickname-setting-dialog"
import ServerWelcomeDialog from "@/components/server-welcome-dialog"

export default function App() {
    const { serverId, channelId, friendId } = useParams()
    const [searchParams, setSearchParams] = useSearchParams()
    const navigate = useNavigate()
    const { connected, address } = useWallet()
    const { actions: stateActions } = useGlobalState()
    const { actions: subspaceActions, subspace, profile, servers, profiles, isCreatingProfile } = useSubspace()

    // State for nickname setting dialog
    const [nicknameDialogOpen, setNicknameDialogOpen] = useState(false)
    const [nicknameDialogServerId, setNicknameDialogServerId] = useState<string | null>(null)
    const [nicknameDialogServerName, setNicknameDialogServerName] = useState<string>("")

    // State for welcome dialog
    const [welcomeDialogOpen, setWelcomeDialogOpen] = useState(false)
    const [welcomeServerName, setWelcomeServerName] = useState<string>("")
    const [welcomeMemberCount, setWelcomeMemberCount] = useState<number>(0)
    const [welcomeServerLogo, setWelcomeServerLogo] = useState<string | undefined>(undefined)
    const [pendingWelcomeServerId, setPendingWelcomeServerId] = useState<string | null>(null)

    // State to track servers where user clicked "Skip for now"
    const [skippedServers, setSkippedServers] = useState<Set<string>>(new Set())

    // Ref to track the previous server ID to detect actual server changes
    const previousServerIdRef = useRef<string | undefined>(undefined)
    // Ref to track the previous address to detect address changes (wallet switches)
    const previousAddressRef = useRef<string | undefined>(undefined)

    // Refs for Messages and DMMessages components to access their input focus methods
    const messagesRef = useRef<MessagesRef>(null)
    const dmMessagesRef = useRef<DMMessagesRef>(null)

    // Mobile detection for responsive behavior
    const isMobile = useIsMobile()

    // State for member list visibility
    const [showMemberList, setShowMemberList] = useState(!isMobile)

    // Auto-collapse member list on mobile
    useEffect(() => {
        setShowMemberList(!isMobile)
    }, [isMobile])

    // Toggle member list handler
    const handleToggleMemberList = () => {
        setShowMemberList(prev => !prev)
    }

    useEffect(() => {
        const previousAddress = previousAddressRef.current

        if (address && connected) {
            // Check if address changed (wallet switch) - navigate away from specific routes
            if (previousAddress && previousAddress !== address) {
                console.log(`📧 Address changed from ${previousAddress} to ${address}, navigating to app root`)
                if (serverId || channelId || friendId) {
                    navigate("/app")
                }
            }

            if (!subspace) return
            subspaceActions.init()
            subspaceActions.profile.refresh()
        } else if (!connected || !address) {
            // Navigate away from specific routes when wallet disconnects
            if (serverId || channelId || friendId) {
                navigate("/app")
            }
        }

        // Update the address ref for next comparison
        previousAddressRef.current = address
    }, [address, connected])

    useEffect(() => {
        if (!subspace) return
        stateActions.setActiveServerId(serverId || "")
        stateActions.setActiveChannelId(channelId || "")
        stateActions.setActiveFriendId(friendId || "")

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
        console.log('%cFriend ID:', 'color: #FF9800; font-weight: bold;', friendId || 'None');
        console.groupEnd();

        // update server and members
        if (serverId) {
            // Force refresh server data when serverId changes
            // Members are automatically loaded when forceRefresh is true
            subspaceActions.servers.get(serverId, true).catch(console.error)
        }

        // Load DM conversation when friendId changes
        if (friendId) {
            subspaceActions.dms.getConversation(friendId).catch(console.error)
        }
    }, [serverId, channelId, friendId, subspace])

    // Handle welcome popup from URL parameters
    useEffect(() => {
        const welcome = searchParams.get('welcome')

        if (welcome === 'true' && serverId) {
            // Get server data from loaded servers
            const currentServer = servers[serverId]

            if (currentServer) {
                setWelcomeServerName(currentServer.name || `Server ${serverId.substring(0, 8)}...`)
                setWelcomeMemberCount(currentServer.members?.length || currentServer.memberCount || 0)
                setWelcomeServerLogo(currentServer.logo ? `https://arweave.net/${currentServer.logo}` : undefined)
                setWelcomeDialogOpen(true)
                setPendingWelcomeServerId(null) // Clear pending state

                // Remove welcome parameter from URL without triggering navigation
                const newSearchParams = new URLSearchParams(searchParams)
                newSearchParams.delete('welcome')
                setSearchParams(newSearchParams, { replace: true })
            } else {
                // Server data isn't loaded yet, mark it as pending
                setPendingWelcomeServerId(serverId)

                // Remove welcome parameter from URL without triggering navigation
                const newSearchParams = new URLSearchParams(searchParams)
                newSearchParams.delete('welcome')
                setSearchParams(newSearchParams, { replace: true })
            }
        }
    }, [searchParams, serverId, servers, setSearchParams])

    // Show welcome popup when server data loads if it was pending
    useEffect(() => {
        if (pendingWelcomeServerId && servers[pendingWelcomeServerId]) {
            const currentServer = servers[pendingWelcomeServerId]

            setWelcomeServerName(currentServer.name || `Server ${pendingWelcomeServerId.substring(0, 8)}...`)
            setWelcomeMemberCount(currentServer.members?.length || currentServer.memberCount || 0)
            setWelcomeServerLogo(currentServer.logo ? `https://arweave.net/${currentServer.logo}` : undefined)
            setWelcomeDialogOpen(true)
            setPendingWelcomeServerId(null) // Clear pending state
        }
    }, [pendingWelcomeServerId, servers])

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

    // Global keydown listener to autofocus message input when user starts typing
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Ignore if any modifier keys are pressed
            if (event.ctrlKey || event.altKey || event.metaKey) {
                return
            }

            // Ignore special keys
            const ignoredKeys = [
                'Tab', 'Escape', 'Enter', 'Backspace', 'Delete',
                'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
                'Home', 'End', 'PageUp', 'PageDown', 'Insert',
                'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
            ]

            if (ignoredKeys.includes(event.key)) {
                return
            }

            // Check if any input, textarea, or contenteditable element is currently focused
            const activeElement = document.activeElement
            const isInputFocused = activeElement && (
                activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.getAttribute('contenteditable') === 'true' ||
                activeElement.closest('[contenteditable="true"]')
            )

            // Don't autofocus if an input is already focused
            if (isInputFocused) {
                return
            }

            // Only focus if we're in a chat view (not on welcome screen)
            if (serverId && channelId && messagesRef.current) {
                // Focus the server channel message input
                messagesRef.current.focusInput?.()
            } else if (friendId && dmMessagesRef.current) {
                // Focus the DM message input
                dmMessagesRef.current.focusInput?.()
            }
        }

        // Add event listener
        document.addEventListener('keydown', handleKeyDown)

        // Cleanup
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [serverId, channelId, friendId])

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

    const title = useMemo(() => {
        let server = ""
        if (serverId) {
            server = servers[serverId]?.name || "Subspace"
            if (channelId) {
                return `#${servers[serverId]?.channels.find(c => c.channelId == channelId)?.name} | ${server}`
            }
            return server
        } else if (friendId) {
            const friendName = profiles[friendId]?.displayName || profiles[friendId]?.primaryName || friendId.substring(0, 4) + "..." + friendId.substring(friendId.length - 4)
            return `${friendName} | Subspace`
        }


    }, [serverId, channelId, servers])

    return (
        <>
            <title>{title}</title>
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
                {/* Main content area */}
                {(serverId && channelId) ? (
                    <Messages
                        ref={messagesRef}
                        className="grow border-r h-full"
                        onToggleMemberList={handleToggleMemberList}
                        showMemberList={showMemberList}
                    />
                ) : friendId ? (
                    <DMMessages ref={dmMessagesRef} className="grow border-r h-full" />
                ) : (
                    <Welcome className="grow h-full" />
                )}
                {/* Right sidebar - show member list for servers, hide for DMs */}
                {(serverId && channelId) && (
                    <MemberList
                        className="border-r h-full transition-all duration-300 ease-in-out"
                        style={{
                            width: showMemberList ? '320px' : '0px',
                            minWidth: showMemberList ? '320px' : '0px',
                            maxWidth: showMemberList ? '320px' : '0px',
                            overflow: 'hidden',
                            opacity: showMemberList ? 1 : 0
                        }}
                        isVisible={showMemberList}
                    />
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

            {/* Welcome Dialog */}
            <ServerWelcomeDialog
                isOpen={welcomeDialogOpen}
                serverName={welcomeServerName}
                memberCount={welcomeMemberCount}
                serverLogo={welcomeServerLogo}
                onClose={() => setWelcomeDialogOpen(false)}
            />
        </>
    )
}   