import { useWallet } from "@/hooks/use-wallet"
import { useGlobalState } from "@/hooks/use-global-state"
import { useServer, useChannel, useSubspaceActions, useProfile, useProfileServers } from "@/hooks/use-subspace"
import { Subspace } from "@subspace-protocol/sdk"
import Servers from "./components/servers"
import Profile from "@/components/profile"
import Channels from "@/routes/app/components/channels"
import Welcome from "@/routes/app/components/welcome"
import Messages from "@/routes/app/components/messages"
import { useEffect, useState } from "react"
import { useParams, useNavigate, useLocation } from "react-router"
import { toast } from "sonner"
import SubspaceLoader from "@/components/subspace-loader"
import { useIsMobile } from "@/hooks/use-mobile"

declare global {
    interface Window {
        fetchMessageTimeout: NodeJS.Timeout
        prevAddress: string
    }
}

export default function App() {
    const { activeServerId, activeChannelId, lastChannelByServer, actions: globalStateActions } = useGlobalState()
    const activeServer = useServer(activeServerId)
    const subspaceActions = useSubspaceActions()
    const { serverId, channelId } = useParams()
    const navigate = useNavigate()
    const { address } = useWallet()
    const [showLoader, setShowLoader] = useState(true)
    const [loaderAnimating, setLoaderAnimating] = useState(false)
    const { connected } = useWallet()
    const userProfile = useProfile(address)
    const joinedServers = useProfileServers(address)
    const isMobile = useIsMobile()

    useEffect(() => {
        window.toast = toast
    }, [toast])

    useEffect(() => {
        clearTimeout(window.fetchMessageTimeout)
        if (address !== window.prevAddress && window.prevAddress && window.prevAddress !== "") {
            navigate("/app")
        }
        window.prevAddress = address
    }, [address])

    // Sync URL parameters with global state on mount and URL changes
    // URL is the single source of truth
    useEffect(() => {
        const urlServerId = serverId || ""
        const urlChannelId = channelId || ""

        if (urlServerId !== activeServerId) {
            globalStateActions.setActiveServerId(urlServerId)
        }

        if (urlChannelId !== activeChannelId) {
            globalStateActions.setActiveChannelId(urlChannelId)
        }
    }, [serverId, channelId, activeServerId, activeChannelId, globalStateActions])

    // Track the last opened channel for each server
    useEffect(() => {
        if (activeServerId && activeChannelId) {
            globalStateActions.setLastChannelForServer(activeServerId, activeChannelId)
        }
    }, [activeServerId, activeChannelId, globalStateActions])

    // Redirect to /app if server is active but not in user's joined servers
    useEffect(() => {
        if (activeServerId && joinedServers && !joinedServers[activeServerId]) {
            console.log("Server not found in joined servers, redirecting to /app")
            navigate("/app")
        }
    }, [activeServerId, joinedServers, navigate])

    useEffect(() => {
        if (!activeServerId || !Subspace.initialized) {
            // If no active server or Subspace not initialized, ensure any existing loop is stopped
            return () => {
                if (window.fetchMessageTimeout) {
                    clearTimeout(window.fetchMessageTimeout)
                }
            }
        }

        async function fetchMessages() {
            try {
                // Only fetch messages if Subspace is initialized
                if (Subspace.initialized) {
                    await subspaceActions.messages.getAll(activeServerId)
                }
            } catch (e) {
                console.error(e)
            }
            finally {
                window.fetchMessageTimeout = setTimeout(() => {
                    fetchMessages()
                }, 1000)
            }
        }

        fetchMessages()

        // Cleanup function to stop the polling loop when server changes or component unmounts
        return () => {
            if (window.fetchMessageTimeout) {
                clearTimeout(window.fetchMessageTimeout)
            }
        }
    }, [activeServerId, Subspace.initialized])

    // Handle loader transition when Subspace becomes initialized
    useEffect(() => {
        if (Subspace.initialized && showLoader && !loaderAnimating) {
            setLoaderAnimating(true)
            // Wait for blur-out animation to complete before hiding loader
            setTimeout(() => {
                setShowLoader(false)
                setLoaderAnimating(false)
            }, 400) // Match the blur-out animation duration
        }
    }, [Subspace.initialized, showLoader, loaderAnimating])

    // Reset loader state when Subspace becomes uninitialized
    useEffect(() => {
        if (!Subspace.initialized && !showLoader) {
            setShowLoader(true)
            setLoaderAnimating(false)
        }
    }, [Subspace.initialized, showLoader])

    if (isMobile) {
        return <div className="h-screen w-screen flex items-center justify-center">
            <div className="text-sm text-muted-foreground font-ocr">Works best on desktop</div>
        </div>
    }

    // if subspace is not initialized or loader is still showing, show the loader
    if (!Subspace.initialized && connected) {
        return <SubspaceLoader isAnimatingOut={loaderAnimating} />
    }

    return <div className="h-screen w-screen flex">
        {/* Server list */}
        <div className="border-r max-h-screen w-[72px] shrink-0">
            <Servers />
        </div>

        {/* DMs list / channels list (if server active) */}
        <div className="w-[300px] shrink-0 flex flex-col">
            <div className="grow border-b border-r rounded-br">
                <Channels />
            </div>
            <Profile />
        </div>

        {/* Welcome section / messages list (if server active or no channel selected) */}
        {(!activeServer || !activeChannelId) && <Welcome />}

        {/* messages list (if server active) */}
        {activeServer && activeChannelId && <Messages />}
    </div>
}