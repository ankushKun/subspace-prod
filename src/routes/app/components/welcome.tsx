import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import LoginDialog from "@/components/login-dialog"
import { useWallet } from "@/hooks/use-wallet"
import alien from "@/assets/subspace/alien-black.svg"
import { useGlobalState } from "@/hooks/use-global-state"
import { useSubspace } from "@/hooks/use-subspace"
import { useEffect } from "react"
import { Hash, Users, Calendar } from "lucide-react"

export default function Welcome({ className }: { className?: string }) {
    const { connected } = useWallet()
    const { activeServerId } = useGlobalState()
    const { actions: subspaceActions, subspace, servers } = useSubspace()

    const server = activeServerId ? servers[activeServerId] : null

    useEffect(() => {
        if (activeServerId && subspace) {
            subspaceActions.servers.get(activeServerId)
        }
    }, [activeServerId, subspace])

    // If no server is selected, show general Subspace welcome
    if (!activeServerId || !server) {
        return <AppWelcome connected={connected} className={className} />
    }

    // If server is selected, show server-specific welcome
    return <ServerWelcome server={server} className={className} />
}

// General Subspace app welcome component
function AppWelcome({ connected, className }: { connected: boolean; className?: string }) {
    return (
        <div className={cn("flex flex-col items-center justify-center h-screen w-screen text-center relative overflow-hidden", className)}>
            <div className="max-w-4xl mx-auto text-center space-y-8">
                <div className="font-freecam text-2xl flex flex-col items-center justify-center gap-6">
                    <div className="flex flex-col lg:flex-row items-center justify-center gap-3">
                        <div className="text-2xl">Welcome to</div>
                        <div className="text-primary text-4xl">Subspace</div>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-center text-base text-muted-foreground">
                        Connect with communities,<br /> join conversations, and share<br />
                        ideas in a decentralized space
                    </div>
                </div>

                {/* Action hints */}
                <div className="flex flex-col items-center space-y-4 sm:space-y-6 mt-12 md:mt-16 px-4">
                    <div className="text-muted-foreground max-w-2xl mx-auto font-freecam text-sm sm:text-base leading-relaxed">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <span className="text-primary">👥</span>
                            <span className="font-ocr">Join a server to connect with communities</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-primary">💬</span>
                            <span className="font-ocr">Start a direct message conversation</span>
                        </div>
                    </div>

                    {/* Login Button - only show if not connected */}
                    {!connected && (
                        <div className="mt-8">
                            <LoginDialog>
                                <Button
                                    asChild
                                    variant="outline"
                                    className="flex items-center gap-3 px-6 py-3 h-auto hover:bg-primary/10 transition-colors font-ocr text-primary border-primary/30 hover:border-primary/50 bg-primary/5 backdrop-blur-sm shadow-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Alien Avatar */}
                                        <div className="relative flex-shrink-0">
                                            <div className="w-8 h-8 rounded-sm overflow-hidden bg-primary/20 flex items-center justify-center border border-primary/30">
                                                <img src={alien} alt="alien" className="w-5 h-5 opacity-80" />
                                            </div>
                                            {/* Disconnected status indicator */}
                                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-sm border border-background animate-pulse"></div>
                                        </div>

                                        {/* Login Text */}
                                        <div className="flex flex-col text-left">
                                            <span className="text-sm font-medium text-primary">
                                                Sign In
                                            </span>
                                            <span className="text-xs text-primary/60">
                                                Join the conversation
                                            </span>
                                        </div>
                                    </div>
                                </Button>
                            </LoginDialog>
                        </div>
                    )}
                </div>
            </div>

            {/* Background decoration */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-primary/20 rounded-full animate-pulse"></div>
                <div className="absolute top-1/3 right-1/3 w-0.5 h-0.5 bg-primary/30 rounded-full animate-pulse delay-1000"></div>
                <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-primary/10 rounded-full animate-pulse delay-2000"></div>
                <div className="absolute bottom-1/4 right-1/4 w-0.5 h-0.5 bg-primary/40 rounded-full animate-pulse delay-1500"></div>
            </div>
        </div>
    )
}

// Server-specific welcome component
function ServerWelcome({ server, className }: { server: any; className?: string }) {
    // Get actual member count from loaded members array, fallback to server.memberCount
    const actualMemberCount = server.members?.length || server.memberCount || 0

    const formatDate = (timestamp?: number) => {
        if (!timestamp) return 'Recently'
        return new Date(timestamp * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    return (
        <div className={cn("flex flex-col items-center justify-center h-screen w-screen text-center relative overflow-hidden", className)}>
            <div className="max-w-4xl mx-auto text-center space-y-8">
                {/* Server Header */}
                <div className="flex flex-col items-center justify-center gap-6">
                    {/* Server Logo/Avatar */}
                    <div className="relative">
                        <div className="w-24 h-24 rounded-2xl overflow-hidden bg-primary/20 flex items-center justify-center border-2 border-primary/30 shadow-lg">
                            {server.logo ? (
                                <img src={`https://arweave.net/${server.logo}`} alt={`${server.name} logo`} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-12 h-12 text-primary/80">
                                    <img src={alien} alt="server" className="w-full h-full opacity-80" />
                                </div>
                            )}
                        </div>
                        {/* Active indicator */}
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                    </div>

                    {/* Welcome Text */}
                    <div className="font-freecam text-2xl flex flex-col items-center justify-center gap-3">
                        <div className="flex flex-col lg:flex-row items-center justify-center gap-3">
                            <div className="text-2xl">Welcome to</div>
                            <div className="text-primary text-4xl">{server.name}</div>
                        </div>

                        {server.description && (
                            <div className="flex items-center justify-center gap-2 text-center text-base text-muted-foreground max-w-2xl">
                                {server.description}
                            </div>
                        )}
                    </div>
                </div>

                {/* Server Stats */}
                <div className="flex flex-col items-center space-y-6 mt-12 md:mt-16 px-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
                        {/* Channels Count */}
                        <div className="flex flex-col items-center p-4 rounded-xl bg-primary/5 border border-primary/20 backdrop-blur-sm">
                            <Hash className="w-6 h-6 text-primary mb-2" />
                            <div className="text-xl font-bold text-primary">{server.channels?.length || 0}</div>
                            <div className="text-sm text-muted-foreground font-ocr">Channels</div>
                        </div>

                        {/* Members Count */}
                        <div className="flex flex-col items-center p-4 rounded-xl bg-primary/5 border border-primary/20 backdrop-blur-sm">
                            <Users className="w-6 h-6 text-primary mb-2" />
                            <div className="text-xl font-bold text-primary">{actualMemberCount}</div>
                            <div className="text-sm text-muted-foreground font-ocr">Members</div>
                        </div>
                    </div>

                    {/* Action hints */}
                    <div className="text-muted-foreground max-w-2xl mx-auto font-freecam text-sm sm:text-base leading-relaxed mt-8">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <span className="text-primary">👈</span>
                            <span className="font-ocr">Select a channel from the sidebar to start chatting</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-primary">🎯</span>
                            <span className="font-ocr">Check out the member list to see who's online</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Background decoration with server theme */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-primary/20 rounded-full animate-pulse"></div>
                <div className="absolute top-1/3 right-1/3 w-0.5 h-0.5 bg-primary/30 rounded-full animate-pulse delay-1000"></div>
                <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-primary/10 rounded-full animate-pulse delay-2000"></div>
                <div className="absolute bottom-1/4 right-1/4 w-0.5 h-0.5 bg-primary/40 rounded-full animate-pulse delay-1500"></div>
                {/* Additional server-themed decoration */}
                <div className="absolute top-1/2 left-1/6 w-1 h-1 bg-green-500/20 rounded-full animate-pulse delay-500"></div>
                <div className="absolute top-3/4 right-1/6 w-0.5 h-0.5 bg-green-500/30 rounded-full animate-pulse delay-1750"></div>
            </div>
        </div>
    )
}