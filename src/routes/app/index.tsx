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
import { useMobileContext } from "@/hooks/use-mobile"
import ProfileCreationDialog from "@/components/profile-creation-dialog"
import NicknameSettingDialog from "@/components/nickname-setting-dialog"
import ServerWelcomeDialog from "@/components/server-welcome-dialog"

import DataLoader from "./data-loader"

export default function App() {
    const { serverId, channelId, friendId } = useParams()
    const [searchParams, setSearchParams] = useSearchParams()
    const navigate = useNavigate()
    const { connected, address } = useWallet()
    const { actions: stateActions } = useGlobalState()
    const { subspace, profile, servers, profiles, isCreatingProfile } = useSubspace()

    // Mobile context: derive layout decisions (overlays, touch sizes)
    const { isMobile, shouldUseOverlays, shouldUseTouchSizes } = useMobileContext()

    // Nickname dialog tracks which server to prompt for a nickname on join
    const [nicknameDialogOpen, setNicknameDialogOpen] = useState(false)
    const [nicknameDialogServerId, setNicknameDialogServerId] = useState<string | null>(null)
    const [nicknameDialogServerName, setNicknameDialogServerName] = useState<string>("")

    // Welcome dialog appears after joining a server via invite
    const [welcomeDialogOpen, setWelcomeDialogOpen] = useState(false)
    const [welcomeServerName, setWelcomeServerName] = useState<string>("")
    const [welcomeMemberCount, setWelcomeMemberCount] = useState<number>(0)
    const [welcomeServerLogo, setWelcomeServerLogo] = useState<string | undefined>(undefined)
    const [pendingWelcomeServerId, setPendingWelcomeServerId] = useState<string | null>(null)

    // Servers where the user chose to skip the nickname prompt for this session
    const [skippedServers, setSkippedServers] = useState<Set<string>>(new Set())

    // Detect actual server changes to avoid re-triggering one-time effects
    const previousServerIdRef = useRef<string | undefined>(undefined)
    // Detect wallet switches to reset route state to a safe default
    const previousAddressRef = useRef<string | undefined>(undefined)

    // Allow programmatic focus of the message composers from this page
    const messagesRef = useRef<MessagesRef>(null)
    const dmMessagesRef = useRef<DMMessagesRef>(null)

    // Member list sidebar (desktop) visibility
    const [showMemberList, setShowMemberList] = useState(!isMobile)

    // Member list as a sheet on mobile overlays
    const [showMemberSheet, setShowMemberSheet] = useState(false)

    // Server and DM data hydration is centralized in `DataLoader` (background)

    // On mobile, show members as an overlay instead of a fixed sidebar
    useEffect(() => {
        if (shouldUseOverlays) {
            setShowMemberList(false)
        } else {
            setShowMemberList(true)
        }
    }, [shouldUseOverlays])

    // Toggle member list: switches between sidebar (desktop) and sheet (mobile)
    const handleToggleMemberList = () => {
        if (shouldUseOverlays) {
            // On mobile, show the member sheet instead
            setShowMemberSheet(prev => !prev)
        } else {
            // On desktop, toggle the sidebar
            setShowMemberList(prev => !prev)
        }
    }

    // Mobile view selection derived from route state
    const getMobileView = () => {
        if (friendId) return 'messages' // DM conversation
        if (serverId && channelId) return 'messages' // Channel conversation
        if (serverId) return 'channels' // Server channels list
        return 'home' // Servers + DMs split view
    }

    useEffect(() => {
        const previousAddress = previousAddressRef.current

        if (address && connected) {
            // On wallet switch, navigate away from deep routes to avoid stale context
            if (previousAddress && previousAddress !== address) {
                console.log(`📧 Address changed from ${previousAddress} to ${address}, navigating to app root`)
                if (serverId || channelId || friendId) {
                    navigate("/app")
                }
            }
        } else if (!connected || !address) {
            // On disconnect, avoid showing server/channel/DM routes
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

        // Reset the "skipped nickname" cache when switching servers
        if (previousServerIdRef.current !== serverId) {
            setSkippedServers(new Set())
            previousServerIdRef.current = serverId
        }

        // Structured navigation logs for easier debugging during development
        console.groupCollapsed(
            '%c🎯 Navigation Update',
            'color: #9C27B0; font-weight: bold; font-size: 12px;'
        );
        console.log('%cServer ID:', 'color: #2196F3; font-weight: bold;', serverId || 'None');
        console.log('%cChannel ID:', 'color: #4CAF50; font-weight: bold;', channelId || 'None');
        console.log('%cFriend ID:', 'color: #FF9800; font-weight: bold;', friendId || 'None');
        console.groupEnd();

        // Actual fetching is handled by DataLoader
    }, [serverId, channelId, friendId, subspace])

    // Handle welcome popup via URL parameter set by invite acceptance flow
    useEffect(() => {
        const welcome = searchParams.get('welcome')

        if (welcome === 'true' && serverId) {
            // Read server data from state; if missing, defer via pending id
            const currentServer = servers[serverId]

            if (currentServer) {
                setWelcomeServerName(currentServer.name || `Server ${serverId.substring(0, 8)}...`)
                setWelcomeMemberCount(currentServer.members?.length || currentServer.memberCount || 0)
                setWelcomeServerLogo(currentServer.logo ? `https://arweave.net/${currentServer.logo}` : undefined)
                setWelcomeDialogOpen(true)
                setPendingWelcomeServerId(null) // clear pending state

                // Remove welcome param without navigation to keep history clean
                const newSearchParams = new URLSearchParams(searchParams)
                newSearchParams.delete('welcome')
                setSearchParams(newSearchParams, { replace: true })
            } else {
                // Mark pending and clean the URL until data loads
                setPendingWelcomeServerId(serverId)

                // Remove welcome param without navigation to keep history clean
                const newSearchParams = new URLSearchParams(searchParams)
                newSearchParams.delete('welcome')
                setSearchParams(newSearchParams, { replace: true })
            }
        }
    }, [searchParams, serverId, servers, setSearchParams])

    // When pending server data becomes available, show the welcome dialog
    useEffect(() => {
        if (pendingWelcomeServerId && servers[pendingWelcomeServerId]) {
            const currentServer = servers[pendingWelcomeServerId]

            setWelcomeServerName(currentServer.name || `Server ${pendingWelcomeServerId.substring(0, 8)}...`)
            setWelcomeMemberCount(currentServer.members?.length || currentServer.memberCount || 0)
            setWelcomeServerLogo(currentServer.logo ? `https://arweave.net/${currentServer.logo}` : undefined)
            setWelcomeDialogOpen(true)
            setPendingWelcomeServerId(null) // clear pending state
        }
    }, [pendingWelcomeServerId, servers])

    // Prompt for nickname when user has no global name and no server nickname
    useEffect(() => {
        // Do not show when missing prerequisites
        if (!profile || isCreatingProfile || !serverId || !address) {
            // Force close dialog if conditions aren't met
            if (nicknameDialogOpen) {
                handleNicknameDialogClose()
            }
            return
        }

        // Check if user has a primary name
        const hasPrimaryName = profile.primaryName && profile.primaryName.trim() !== ""

        // If user has a primary name, there is no need to prompt for nickname
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

        // If a server nickname exists, avoid showing the dialog
        if (hasServerNickname) {
            if (nicknameDialogOpen) {
                handleNicknameDialogClose()
            }
            return
        }

        // Check if user has skipped this server before
        const hasSkippedServer = skippedServers.has(serverId)

        // Respect the user's decision to skip for this server
        if (hasSkippedServer) {
            if (nicknameDialogOpen) {
                handleNicknameDialogClose()
            }
            return
        }

        // Show only when required and not already shown for this server
        if (!nicknameDialogOpen || nicknameDialogServerId !== serverId) {
            setNicknameDialogServerId(serverId)
            setNicknameDialogServerName(currentServer?.name || "")
            setNicknameDialogOpen(true)
        }
    }, [profile, isCreatingProfile, serverId, address, servers, nicknameDialogOpen, nicknameDialogServerId, skippedServers])

    // Global keydown: when not focused in an input, route keystrokes to the active composer
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Ignore if any modifier keys are pressed
            if (event.ctrlKey || event.altKey || event.metaKey) {
                return
            }

            // Ignore navigation/function keys
            const ignoredKeys = [
                'Tab', 'Escape', 'Enter', 'Backspace', 'Delete',
                'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
                'Home', 'End', 'PageUp', 'PageDown', 'Insert',
                'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
            ]

            if (ignoredKeys.includes(event.key)) {
                return
            }

            // Skip when the user is already typing in any input/editor
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

            // Redirect to the right composer based on route
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
        // Remember skip for this session only
        setSkippedServers(prev => new Set([...prev, serverId]))
        handleNicknameDialogClose()
    }

    const title = useMemo(() => {
        let server = ""
        if (serverId) {
            server = servers[serverId]?.name || "Subspace"
            if (channelId) {
                const channelList = Array.isArray((servers[serverId] as any)?.channels)
                    ? (servers[serverId] as any).channels
                    : Object.values((servers[serverId] as any)?.channels || {})
                const ch: any = channelList.find((c: any) => c.channelId == channelId)
                return `#${ch?.name || ''} | ${server}`
            }
            return server
        } else if (friendId) {
            const friendName = profiles[friendId]?.primaryName || friendId.substring(0, 4) + "..." + friendId.substring(friendId.length - 4)
            return `${friendName} | Subspace`
        }
        return "Subspace"
    }, [serverId, channelId, servers, friendId, profiles])

    return (
        <>
            <DataLoader />
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