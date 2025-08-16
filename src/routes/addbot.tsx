// src/routes/addbot/[botId].tsx
import { useEffect, useState, useRef } from "react"
import { useParams, useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { useWallet } from "@/hooks/use-wallet"
import { useSubspace } from "@/hooks/use-subspace"
import type { Bot, Server } from "@subspace-protocol/sdk"
import { toast } from "sonner"
import { Loader2, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react"
import LoginDialog from "@/components/login-dialog"
import alien from "@/assets/subspace/alien-black.svg"
import { memberHasPermission } from "@/lib/utils"
import { EPermissions } from "@subspace-protocol/sdk"

export default function AddBot() {
    const { botId } = useParams()
    const navigate = useNavigate()
    const { connected, address } = useWallet()
    const { servers, actions: subspaceActions, profile, subspace } = useSubspace()

    // State management
    const [botInfo, setBotInfo] = useState<Bot | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [selectedServer, setSelectedServer] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [hasAdded, setHasAdded] = useState(false)
    const [addingStatus, setAddingStatus] = useState<string>("")
    const [addingProgress, setAddingProgress] = useState<number>(0)

    // Track if the component is mounted
    const isMounted = useRef(true)
    useEffect(() => {
        return () => {
            isMounted.current = false
        }
    }, [])

    // Fetch data only when connection state changes
    useEffect(() => {
        if (!connected || !address || !subspace) return

        let isLatestFetch = true // For race condition prevention

        const fetchData = async () => {
            try {
                // 1. Fetch profile first
                if (!isMounted.current || !isLatestFetch) return
                await subspaceActions.profile.get(address)

                // Wait for profile to be available in state
                if (!profile?.serversJoined || !isMounted.current || !isLatestFetch) return

                // 2. Fetch all servers the user has joined
                const serverIds = Object.keys(profile.serversJoined)
                for (const serverId of serverIds) {
                    if (!isMounted.current || !isLatestFetch) return
                    await subspaceActions.servers.get(serverId)
                }

                // 3. Now fetch members for each server
                for (const serverId of serverIds) {
                    if (!isMounted.current || !isLatestFetch) return
                    await subspaceActions.servers.getMembers(serverId)
                }
            } catch (err) {
                if (isMounted.current && isLatestFetch) {
                    console.error("Error fetching data:", err)
                }
            }
        }

        fetchData()

        return () => {
            isLatestFetch = false
        }
    }, [connected, address, subspace])

    // Fetch bot info on mount
    useEffect(() => {
        const fetchBotInfo = async () => {
            if (!botId || !connected || !subspace) return
            setIsLoading(true)
            setError(null)

            try {
                const bot = await subspaceActions.bots.get(botId)
                if (bot) {
                    setBotInfo(bot)
                } else {
                    setError("Bot not found")
                }
            } catch (err) {
                console.error("Error fetching bot:", err)
                setError("Failed to load bot information")
            } finally {
                setIsLoading(false)
            }
        }

        fetchBotInfo()
    }, [botId, connected, subspace])

    // Get servers where user has MANAGE_BOTS permission
    console.log('Debug - All servers:', servers)
    console.log('Debug - Current user address:', address)
    console.log('Debug - Bot info:', botInfo)

    const eligibleServers = Object.entries(servers || {}).filter(([serverId, server]) => {
        console.log(`\nDebug - Checking server: ${server.name} (${serverId})`)

        const member = server.members?.[address!]
        console.log('Debug - Member found:', member ? {
            userId: member.userId,
            roles: member.roles,
            nickname: member.nickname
        } : 'No member found')

        if (!member) {
            console.log('Debug - Skipping server: User is not a member')
            return false
        }

        // Log member's roles details
        console.log('Debug - Member roles:', member.roles.map(roleId => ({
            roleId,
            role: server.roles[roleId],
            permissions: server.roles[roleId]?.permissions
        })))

        // Check for MANAGE_BOTS permission (includes ADMINISTRATOR and owner checks)
        const hasPermission = memberHasPermission(member, EPermissions.MANAGE_BOTS, server)
        console.log('Debug - Has MANAGE_BOTS permission:', hasPermission)
        console.log('Debug - Is server owner:', member.userId === server.ownerId)

        return hasPermission
    }).map(([serverId, server]) => {
        // Check if bot is already in this server
        const botAlreadyInServer = botInfo?.joinedServers?.[serverId] === true
        console.log(`Debug - Bot already in ${server.name}:`, botAlreadyInServer)

        return {
            serverId,
            server,
            botAlreadyInServer,
            canAdd: !botAlreadyInServer
        }
    })

    // Separate available and unavailable servers for display
    const availableServers = eligibleServers.filter(item => item.canAdd)
    const serversWithBot = eligibleServers.filter(item => item.botAlreadyInServer)



    const handleAddBot = async () => {
        if (!selectedServer || !botId) return

        setIsAdding(true)
        setError(null)
        setAddingStatus("")
        setAddingProgress(0)

        try {
            const success = await subspaceActions.bots.addToServer({
                serverId: selectedServer,
                botId: botId
            }, (status: string, progress?: number) => {
                setAddingStatus(status)
                if (progress !== undefined) {
                    setAddingProgress(progress)
                }
            })

            if (success) {
                setHasAdded(true)
                // Refresh bot info
                const updatedBot = await subspaceActions.bots.get(botId)
                setBotInfo(updatedBot)
                toast.success("Bot added successfully!")
            } else {
                setError("Failed to add bot to server - please try again")
            }
        } catch (err) {
            console.error("Error adding bot:", err)
            setError("Failed to add bot to server")
        } finally {
            setIsAdding(false)
            setAddingStatus("")
            setAddingProgress(0)
        }
    }

    // Render login prompt if not connected
    const renderLoginPrompt = () => (
        <div className="w-full max-w-md mx-auto">
            <div className="bg-background/80 backdrop-blur-sm border rounded-2xl p-8 text-center space-y-6">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20 mx-auto">
                    <img src={alien} alt="alien" className="w-10 h-10 opacity-80" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-foreground">Connect Wallet</h1>
                    <p className="text-muted-foreground">
                        You need to connect your wallet to add bots to your servers.
                    </p>
                </div>
                <LoginDialog>
                    <Button className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary">
                        Connect Wallet
                    </Button>
                </LoginDialog>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-background/90 relative overflow-hidden p-4">
            {/* Background decorative elements */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.1),transparent_50%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.05),transparent_50%)] pointer-events-none" />

            {/* Back button */}
            <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/app")}
                className="absolute top-6 left-6 text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
            </Button>

            {/* Main content */}
            {!connected ? renderLoginPrompt() : (
                <div className="w-full max-w-md mx-auto">
                    <div className="bg-background/80 backdrop-blur-sm border rounded-2xl p-8">
                        {/* Loading State */}
                        {isLoading && (
                            <div className="flex flex-col items-center space-y-4">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                <p className="text-muted-foreground">Loading bot information...</p>
                            </div>
                        )}

                        {/* Error State */}
                        {error && !isLoading && (
                            <div className="flex flex-col items-center space-y-4">
                                <AlertCircle className="w-12 h-12 text-destructive" />
                                <div className="text-center">
                                    <h2 className="text-lg font-semibold">Error</h2>
                                    <p className="text-muted-foreground">{error}</p>
                                </div>
                                <Button variant="outline" onClick={() => navigate("/app")}>
                                    Return to App
                                </Button>
                            </div>
                        )}

                        {/* Bot Info and Addition UI */}
                        {botInfo && !isLoading && !error && (
                            <div className="flex flex-col items-center space-y-6">
                                {/* Bot Icon */}
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
                                        {botInfo.pfp ? (
                                            <img
                                                src={`https://arweave.net/${botInfo.pfp}`}
                                                alt={botInfo.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <img src={alien} alt="alien" className="w-10 h-10 opacity-80" />
                                        )}
                                    </div>
                                    {botInfo.public && (
                                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                                            <CheckCircle className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                </div>

                                {/* Bot Details */}
                                <div className="text-center space-y-2">
                                    <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                                        {botInfo.name}
                                        {botInfo.public && (
                                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                                                APP
                                            </span>
                                        )}
                                    </h1>
                                    <p className="text-muted-foreground">{botInfo.description}</p>
                                </div>

                                {/* Permissions List */}
                                <div className="w-full space-y-2 bg-muted/50 rounded-lg p-4">
                                    <p className="text-sm font-medium">This will allow the bot to:</p>
                                    <ul className="space-y-2">
                                        <li className="flex items-center gap-2 text-sm">
                                            <CheckCircle className="w-4 h-4 text-primary" />
                                            Join your server
                                        </li>
                                        <li className="flex items-center gap-2 text-sm">
                                            <CheckCircle className="w-4 h-4 text-primary" />
                                            Read messages and member info
                                        </li>
                                        <li className="flex items-center gap-2 text-sm">
                                            <CheckCircle className="w-4 h-4 text-primary" />
                                            Send messages and respond to commands
                                        </li>
                                    </ul>
                                </div>

                                {/* Server Selection */}
                                {!hasAdded && eligibleServers.length > 0 && (
                                    <div className="w-full space-y-2">
                                        <label className="text-sm font-medium">ADD TO SERVER:</label>
                                        <Select
                                            value={selectedServer || ""}
                                            onValueChange={setSelectedServer}
                                            disabled={isAdding}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select a server" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {/* Available servers (can add bot) */}
                                                {availableServers.map(({ serverId, server }) => (
                                                    <SelectItem key={serverId} value={serverId}>
                                                        {server.name}
                                                    </SelectItem>
                                                ))}

                                                {/* Servers that already have the bot (disabled) */}
                                                {serversWithBot.length > 0 && (
                                                    <>
                                                        {availableServers.length > 0 && (
                                                            <div className="px-2 py-1.5 text-xs text-muted-foreground border-t">
                                                                Already added:
                                                            </div>
                                                        )}
                                                        {serversWithBot.map(({ serverId, server }) => (
                                                            <SelectItem
                                                                key={serverId}
                                                                value={serverId}
                                                                disabled
                                                                className="opacity-50"
                                                            >
                                                                <div className="flex items-center justify-between w-full">
                                                                    <span>{server.name}</span>
                                                                    <CheckCircle className="w-3 h-3 text-green-500 ml-2" />
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">
                                                This requires you to have Manage Server permission in the server.
                                            </p>
                                            {serversWithBot.length > 0 && (
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                                    Bot is already added to {serversWithBot.length} server{serversWithBot.length !== 1 ? 's' : ''}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Action Button */}
                                {hasAdded ? (
                                    <Button
                                        onClick={() => navigate(`/app/${selectedServer}`)}
                                        className="w-full bg-green-600 hover:bg-green-700"
                                    >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Go to Server
                                    </Button>
                                ) : eligibleServers.length === 0 ? (
                                    <div className="text-center space-y-2">
                                        <p className="text-sm text-muted-foreground">
                                            You don't have permission to add bots to any servers.
                                        </p>
                                        <Button variant="outline" onClick={() => navigate("/app")}>
                                            Return to App
                                        </Button>
                                    </div>
                                ) : availableServers.length === 0 ? (
                                    <div className="text-center space-y-2">
                                        <p className="text-sm text-muted-foreground">
                                            This bot is already added to all servers you can manage.
                                        </p>
                                        <div className="text-xs text-muted-foreground">
                                            Already in: {serversWithBot.map(({ server }) => server.name).join(', ')}
                                        </div>
                                        <Button variant="outline" onClick={() => navigate("/app")}>
                                            Return to App
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="w-full space-y-4">
                                        {/* Progress indicator when adding */}
                                        {isAdding && (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-muted-foreground">
                                                        {addingStatus || "Processing..."}
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                        {Math.round(addingProgress)}%
                                                    </span>
                                                </div>
                                                <Progress value={addingProgress} className="w-full" />
                                            </div>
                                        )}

                                        <Button
                                            onClick={handleAddBot}
                                            disabled={!selectedServer || isAdding}
                                            className="w-full"
                                        >
                                            {isAdding ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Adding Bot...
                                                </>
                                            ) : (
                                                "Continue"
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}