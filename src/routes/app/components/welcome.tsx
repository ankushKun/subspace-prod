import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import LoginDialog from "@/components/login-dialog"
import { useWallet } from "@/hooks/use-wallet"
import alien from "@/assets/subspace/alien-black.svg"
import { useGlobalState } from "@/hooks/use-global-state"
import { useSubspace } from "@/hooks/use-subspace"
import { useEffect } from "react"
import { Hash, Users, MessageCircle, UserPlus } from "lucide-react"

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
        <div className={cn("flex flex-col items-center justify-center min-h-screen w-full text-center relative overflow-hidden bg-background", className)}>
            {/* Background grid pattern */}
            <div
                className="absolute inset-0 opacity-[0.02] pointer-events-none"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '32px 32px'
                }}
            />

            <div className="relative z-10 max-w-lg mx-auto px-6 space-y-12">
                {/* Logo - Bright Green to match ServerWelcome */}
                <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-2xl">
                        <Hash className="w-10 h-10 text-primary-foreground" />
                    </div>
                </div>

                {/* Welcome Text */}
                <div className="space-y-2">
                    <h1 className="text-4xl md:text-5xl font-bold text-muted-foreground font-ocr">
                        Welcome to
                    </h1>
                    <h2 className="text-4xl md:text-5xl font-bold text-primary font-ocr">
                        Subspace
                    </h2>
                    <p className="text-base text-muted-foreground mt-4 leading-relaxed max-w-md mx-auto">
                        Connect with communities, join conversations, and share ideas in a decentralized space
                    </p>
                </div>

                {/* Action Options - Simple Design like ServerWelcome */}
                <div className="space-y-6 max-w-md mx-auto">
                    <div className="flex items-center gap-4 text-left">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <UserPlus className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-muted-foreground text-sm">
                            Join a server to connect with communities
                        </span>
                    </div>

                    <div className="flex items-center gap-4 text-left">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <MessageCircle className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-muted-foreground text-sm">
                            Start a direct message conversation
                        </span>
                    </div>
                </div>

                {/* Login Button - only show if not connected */}
                {!connected && (
                    <div className="mt-8">
                        <LoginDialog>
                            <Button
                                size="lg"
                                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-sm overflow-hidden bg-primary-foreground/20 flex items-center justify-center">
                                        <img src={alien} alt="alien" className="w-4 h-4" />
                                    </div>
                                    <span>Sign In to Get Started</span>
                                </div>
                            </Button>
                        </LoginDialog>
                    </div>
                )}
            </div>
        </div>
    )
}

// Server-specific welcome component
function ServerWelcome({ server, className }: { server: any; className?: string }) {
    // Get actual member count from loaded members array, fallback to server.memberCount
    const actualMemberCount = server.members?.length || server.memberCount || 0

    return (
        <div className={cn("flex flex-col items-center justify-center min-h-screen w-full text-center relative overflow-hidden bg-background", className)}>
            {/* Background grid pattern */}
            <div
                className="absolute inset-0 opacity-[0.02] pointer-events-none"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '32px 32px'
                }}
            />

            <div className="relative z-10 max-w-lg mx-auto px-6 space-y-12">
                {/* Server Logo - Bright Green */}
                <div className="flex justify-center">
                    <div className="w-24 h-24 rounded-2xl bg-primary flex items-center justify-center shadow-2xl">
                        {server.logo ? (
                            <img src={`https://arweave.net/${server.logo}`} alt={`${server.name} logo`} className="w-[99%] h-[99%] rounded-2xl object-cover" />
                        ) : (
                            <div className="w-10 h-10 text-primary-foreground">
                                <img src={alien} alt="server" className="w-[99%] h-[99%] opacity-90" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Welcome Text */}
                <div className="space-y-2">
                    <h1 className="text-4xl md:text-5xl font-bold text-muted-foreground font-ocr">
                        Welcome to
                    </h1>
                    <h2 className="text-4xl md:text-5xl font-bold text-primary font-ocr">
                        {server.name}
                    </h2>
                    {server.description && (
                        <p className="text-base text-muted-foreground mt-4 leading-relaxed max-w-md mx-auto">
                            {server.description}
                        </p>
                    )}
                </div>

                {/* Server Stats - Compact Design */}
                <div className="grid grid-cols-2 gap-6 max-w-xs mx-auto">
                    {/* Channels Count */}
                    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-card/30 border border-border/20 backdrop-blur-sm">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                            <Hash className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex items-center justify-center gap-2">
                            <div className="text-xl font-bold text-primary">{server.channels?.length || 0}</div>
                            <div className="text-base text-muted-foreground">Channels</div>
                        </div>
                    </div>

                    {/* Members Count */}
                    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-card/30 border border-border/20 backdrop-blur-sm">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                            <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex items-center justify-center gap-2">
                            <div className="text-xl font-bold text-primary">{actualMemberCount}</div>
                            <div className="text-base text-muted-foreground">Members</div>
                        </div>
                    </div>
                </div>

                {/* Action hints - Simple Design */}
                <div className="space-y-6 max-w-md mx-auto">
                    <div className="flex items-center gap-4 text-left">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <Hash className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-muted-foreground text-sm">
                            Select a channel from the sidebar to start chatting
                        </span>
                    </div>

                    <div className="flex items-center gap-4 text-left">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <Users className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-muted-foreground text-sm">
                            Check out the member list to see who's online
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}