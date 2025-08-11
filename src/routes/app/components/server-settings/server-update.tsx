import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { RefreshCw, Download, Loader2, AlertCircle, CheckCircle, Zap } from "lucide-react"
import { useSubspace } from "@/hooks/use-subspace"
import { useGlobalState } from "@/hooks/use-global-state"
import { useWallet } from "@/hooks/use-wallet"
import { toast } from "sonner"

export default function ServerUpdate() {
    const { activeServerId } = useGlobalState()
    const { servers, actions: subspaceActions } = useSubspace()
    const { address: walletAddress } = useWallet()

    // Get the current server
    const server = servers[activeServerId]

    // State for version information
    const [currentServerVersion, setCurrentServerVersion] = useState<string>("")
    const [latestSourceVersion, setLatestSourceVersion] = useState<string>("")
    const [sources, setSources] = useState<any>(null)

    // Loading states
    const [isRefreshingSources, setIsRefreshingSources] = useState(false)
    const [isUpdatingServer, setIsUpdatingServer] = useState(false)
    const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)

    // Load server data when component mounts or activeServerId changes
    useEffect(() => {
        if (activeServerId) {
            // Ensure server data is loaded
            subspaceActions.servers.get(activeServerId, false).catch(console.error)
            // Load sources on component mount
            loadSources()
        }
    }, [activeServerId, subspaceActions.servers])

    // Update version information when server data changes
    useEffect(() => {
        if (server) {
            setCurrentServerVersion(server.version || "Unknown")
        }
    }, [server])

    // Check if user is server owner
    const isOwner = server?.ownerId === walletAddress

    const loadSources = async () => {
        try {
            const sourcesData = subspaceActions.servers.getSources()
            setSources(sourcesData)
            if (sourcesData?.Server?.Version) {
                setLatestSourceVersion(sourcesData.Server.Version)
            }
        } catch (error) {
            console.error("Failed to load sources:", error)
        }
    }

    const handleRefreshSources = async () => {
        setIsRefreshingSources(true)
        try {
            await subspaceActions.servers.refreshSources()
            await loadSources()
            setLastRefreshTime(new Date())
            toast.success("Sources refreshed successfully")
        } catch (error) {
            console.error("Failed to refresh sources:", error)
            toast.error("Failed to refresh sources")
        } finally {
            setIsRefreshingSources(false)
        }
    }

    const handleUpdateServerCode = async () => {
        if (!activeServerId) return

        setIsUpdatingServer(true)
        try {
            const success = await subspaceActions.servers.updateServerCode(activeServerId)
            if (success) {
                toast.success("Server code updated successfully")
                // Refresh server data to get updated version
                setTimeout(() => {
                    subspaceActions.servers.get(activeServerId, true)
                }, 1000)
            } else {
                toast.error("Failed to update server code")
            }
        } catch (error) {
            console.error("Failed to update server code:", error)
            toast.error("Failed to update server code")
        } finally {
            setIsUpdatingServer(false)
        }
    }

    // Check if update is available
    const isUpdateAvailable = currentServerVersion && latestSourceVersion &&
        currentServerVersion !== latestSourceVersion

    return (
        <div className="p-6 space-y-6">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary)/0.02)_0%,transparent_50%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(var(--primary)/0.02)_0%,transparent_50%)] pointer-events-none" />

            <div className="relative z-10 max-w-4xl mx-auto">
                <div className="space-y-6">
                    {/* Header */}
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center border border-primary/30">
                            <Zap className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold font-freecam text-primary tracking-wide">SERVER UPDATES</h1>
                            <p className="text-primary/80 font-ocr mt-2">
                                Manage your server's source code and keep it up to date
                            </p>
                        </div>
                    </div>

                    {/* Owner warning */}
                    {!isOwner && (
                        <Card className="border-amber-500/30 bg-amber-500/5">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-500" />
                                    <p className="text-sm text-amber-500 font-ocr">
                                        Only the server owner can update server code.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Version Information */}
                    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="font-freecam text-primary">Version Information</CardTitle>
                            <CardDescription className="font-ocr">
                                Current version status of your server and available updates
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Current Server Version */}
                                <div className="space-y-2">
                                    <div className="text-sm font-ocr text-primary/60">Current Server Version</div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="font-ocr">
                                            {currentServerVersion || "Loading..."}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Latest Source Version */}
                                <div className="space-y-2">
                                    <div className="text-sm font-ocr text-primary/60">Latest Source Version</div>
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant={isUpdateAvailable ? "default" : "outline"}
                                            className="font-ocr"
                                        >
                                            {latestSourceVersion || "Loading..."}
                                        </Badge>
                                        {isUpdateAvailable && (
                                            <AlertCircle className="w-4 h-4 text-amber-500" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Update Status */}
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {isUpdateAvailable ? (
                                        <>
                                            <AlertCircle className="w-5 h-5 text-amber-500" />
                                            <span className="text-sm font-ocr text-amber-500">
                                                Update available
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                            <span className="text-sm font-ocr text-green-500">
                                                Server is up to date
                                            </span>
                                        </>
                                    )}
                                </div>

                                {lastRefreshTime && (
                                    <div className="text-xs font-ocr text-primary/60">
                                        Last checked: {lastRefreshTime.toLocaleTimeString()}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="font-freecam text-primary">Actions</CardTitle>
                            <CardDescription className="font-ocr">
                                Refresh source information and update your server
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-4">
                                {/* Refresh Sources Button */}
                                <Button
                                    variant="outline"
                                    onClick={handleRefreshSources}
                                    disabled={isRefreshingSources}
                                    className="flex-1 font-ocr"
                                >
                                    {isRefreshingSources ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                    )}
                                    Refresh Sources
                                </Button>

                                {/* Update Server Code Button */}
                                <Button
                                    onClick={handleUpdateServerCode}
                                    disabled={!isOwner || isUpdatingServer || !isUpdateAvailable}
                                    className="flex-1 font-ocr"
                                    variant={isUpdateAvailable ? "default" : "outline"}
                                >
                                    {isUpdatingServer ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Download className="w-4 h-4 mr-2" />
                                    )}
                                    Update Server Code
                                </Button>
                            </div>

                            {/* Help text */}
                            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                                <div className="space-y-2">
                                    <h4 className="text-sm font-freecam text-primary">How it works:</h4>
                                    <ul className="text-xs text-primary/80 font-ocr space-y-1 list-disc list-inside">
                                        <li><strong>Refresh Sources:</strong> Fetches the latest source code versions from the Subspace network</li>
                                        <li><strong>Update Server Code:</strong> Updates your server to use the latest source code while preserving your server data</li>
                                        <li><strong>Safe Updates:</strong> Your server name, logo, description, channels, and members are preserved during updates</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}