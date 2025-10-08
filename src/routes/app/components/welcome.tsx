import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useGlobalState } from "@/hooks/use-global-state"
import { useServer } from "@/hooks/use-subspace"
import { useServerDialogs } from "@/hooks/use-server-dialogs"
import { Plus, Users, MessageSquare, Sparkles, Compass } from "lucide-react"
import alienShip from "@/assets/subspace/alien-ship.svg"
import alienGreen from "@/assets/subspace/alien-green.svg"

export default function Welcome() {
    const { activeServerId } = useGlobalState()
    const activeServer = useServer(activeServerId)
    const { actions: dialogActions } = useServerDialogs()

    // Scenario 1: No server active (app welcome)
    if (!activeServer || !activeServerId) {
        return (
            <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-background via-background to-primary/5">
                <div className="max-w-2xl mx-auto text-center space-y-8 animate-in fade-in-50 duration-700">
                    {/* Hero Section */}
                    <div className="space-y-6">
                        <div className="relative">
                            <img
                                src={alienGreen}
                                alt="Subspace"
                                className="w-16 h-24 mx-auto opacity-90 animate-breathe"
                            />
                            <div className="absolute inset-0 bg-primary/20 w-32 mx-auto rounded-full blur-3xl scale-75 animate-smooth-pulse" />
                        </div>

                        <div className="space-y-3">
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent font-ocr">
                                Welcome to Subspace <span className="text-sm -ml-6">(beta)</span>
                            </h1>
                            <p className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
                                Your decentralized communication hub. Connect with communities, share ideas, and explore cyberspace.
                            </p>
                        </div>
                    </div>


                </div>
            </div>
        )
    }

    // Scenario 2: Server active but no channel selected (server welcome)
    const serverIcon = activeServer.profile?.pfp ? `https://arweave.net/${activeServer.profile.pfp}` : null
    const serverName = activeServer.profile?.name || "Unknown Server"
    const serverDescription = activeServer.profile?.description
    const memberCount = activeServer.member_count || 0

    return (
        <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-background via-background to-primary/5">
            <div className="max-w-2xl mx-auto text-center space-y-8 animate-in fade-in-50 duration-700">
                {/* Server Hero */}
                <div className="space-y-6">
                    <div className="relative">
                        <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-primary/20 shadow-2xl">
                            {serverIcon ? (
                                <img
                                    src={serverIcon}
                                    alt={serverName}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                                    <span className="text-4xl font-bold text-primary">
                                        {serverName.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="absolute inset-0 bg-primary/10 w-32 mx-auto rounded-full blur-3xl scale-75 animate-smooth-pulse" />
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent font-ocr">
                            Welcome to {serverName}
                        </h1>
                        {serverDescription && (
                            <p className="text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
                                {serverDescription}
                            </p>
                        )}
                    </div>
                </div>

                {/* Server Stats or Quick Actions */}
                <div className="grid md:grid-cols-3 gap-4 mt-8">
                    <div className="text-center space-y-2">
                        <div className="text-2xl font-bold text-primary">
                            {Object.keys(activeServer.channels || {}).length}
                        </div>
                        <div className="text-sm text-muted-foreground">Channels</div>
                    </div>
                    <div className="text-center space-y-2">
                        <div className="text-2xl font-bold text-primary">
                            {memberCount}
                        </div>
                        <div className="text-sm text-muted-foreground">Members</div>
                    </div>
                    <div className="text-center space-y-2">
                        <div className="text-2xl font-bold text-primary">
                            {Object.keys(activeServer.roles || {}).length}
                        </div>
                        <div className="text-sm text-muted-foreground">Roles</div>
                    </div>
                </div>

                <div className="text-sm text-muted-foreground">
                    Open a channel from the left sidebar to start chatting.
                </div>
            </div>
        </div>
    )
}