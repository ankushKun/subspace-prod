import { useWallet } from "@/hooks/use-wallet"
import { useGlobalState } from "@/hooks/use-global-state"
import { useServer, useChannel, useSubspaceActions } from "@/hooks/use-subspace"
import Servers from "./components/servers"
import Profile from "@/components/profile"
import Channels from "@/routes/app/components/channels"
import Welcome from "@/routes/app/components/welcome"
import Messages from "@/routes/app/components/messages"
import { useEffect } from "react"

export default function App() {
    const { activeServerId, activeChannelId } = useGlobalState()
    const activeServer = useServer(activeServerId)
    const subspaceActions = useSubspaceActions()

    useEffect(() => {
        let timeoutId: NodeJS.Timeout

        if (!activeServerId) {
            // If no active server, ensure any existing loop is stopped
            return () => {
                if (timeoutId) {
                    clearTimeout(timeoutId)
                }
            }
        }

        async function fetchMessages() {
            try {
                await subspaceActions.messages.getAll(activeServerId)
            } catch (e) {
                console.error(e)
            }
            finally {
                timeoutId = setTimeout(() => {
                    fetchMessages()
                }, 1000);
            }
        }

        fetchMessages()

        // Cleanup function to stop the polling loop when server changes or component unmounts
        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId)
            }
        }
    }, [activeServerId])

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