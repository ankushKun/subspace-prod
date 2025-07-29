import React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Home,
    Plus,
    Hash,
    MessageCircle,
    Users
} from "lucide-react"
import { useNavigate } from "react-router"
import { useGlobalState } from "@/hooks/use-global-state"
import { useSubspace } from "@/hooks/use-subspace"
import { useWallet } from "@/hooks/use-wallet"
import { shortenAddress } from "@/lib/utils"
import alien from "@/assets/subspace/alien-black.svg"
import LoginDialog from "@/components/login-dialog"

interface MobileSplitViewProps {
    className?: string
}

export default function MobileSplitView({ className }: MobileSplitViewProps) {
    const navigate = useNavigate()
    const { activeServerId } = useGlobalState()
    const { servers, friends, profiles } = useSubspace()
    const { address, connected } = useWallet()

    const handleServerClick = (serverId: string) => {
        navigate(`/app/${serverId}`)
    }

    const handleDMClick = (friendId: string) => {
        navigate(`/app/dm/${friendId}`)
    }

    return (
        <div className={cn("flex h-full bg-background", className)}>
            {/* Left side - Server icons */}
            <div className="w-20 border-r border-border bg-muted/30 flex flex-col">
                {/* Header */}
                <div className="p-3 border-b border-border">
                    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                        Servers
                    </h2>
                </div>

                                {/* Home/DMs button */}
                <div className="p-2">
                    <Button
                        variant={!activeServerId ? "default" : "ghost"}
                        size="icon"
                        className={cn(
                            "w-12 h-12 rounded-2xl transition-all duration-300",
                            !activeServerId 
                                ? "bg-primary text-primary-foreground shadow-lg" 
                                : "hover:rounded-xl hover:bg-primary/20"
                        )}
                        onClick={() => navigate('/app')}
                        title={connected && address ? "Direct Messages" : "Home"}
                    >
                        <Home className="w-6 h-6" />
                    </Button>
                </div>

                                {/* Server list */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {connected && address ? (
                        <>
                            {Object.values(servers).map((server) => (
                                <ServerIcon
                                    key={server.serverId}
                                    server={server}
                                    isActive={activeServerId === server.serverId}
                                    onClick={() => handleServerClick(server.serverId)}
                                />
                            ))}
                            
                            {/* Add server button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-12 h-12 rounded-3xl hover:rounded-xl hover:bg-primary/20 border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-all duration-300"
                            >
                                <Plus className="w-6 h-6 text-muted-foreground" />
                            </Button>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                                <Hash className="w-6 h-6 text-primary/30" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Connect to view servers
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right side - DMs list */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-muted-foreground" />
                        <h2 className="text-lg font-semibold text-foreground font-ocr">
                            Direct Messages
                        </h2>
                    </div>
                </div>

                {/* DMs list */}
                <div className="flex-1 overflow-y-auto">
                    {!connected || !address ? (
                        <div className="flex-1 flex items-center justify-center p-8">
                            <div className="text-center space-y-6">
                                <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center border border-primary/30">
                                    <img src={alien} alt="alien" className="w-8 h-8 opacity-60" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-lg font-medium text-foreground font-ocr">
                                        Welcome to Subspace
                                    </h3>
                                    <p className="text-sm text-muted-foreground max-w-sm">
                                        Connect your wallet to join servers, send messages, and explore the decentralized communication network.
                                    </p>
                                </div>
                                <LoginDialog>
                                    <Button 
                                        size="lg"
                                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-ocr gap-2 px-6"
                                    >
                                        <Users className="w-5 h-5" />
                                        Connect Wallet
                                    </Button>
                                </LoginDialog>
                            </div>
                        </div>
                    ) : Object.values(friends).length > 0 ? (
                        <div className="p-4 space-y-2">
                            {Object.values(friends).map((friend) => (
                                <DMItem
                                    key={friend.userId}
                                    friend={friend}
                                    profile={profiles[friend.userId]}
                                    onClick={() => handleDMClick(friend.userId)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center p-8">
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                                    <MessageCircle className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-lg font-medium text-foreground">
                                        No Direct Messages
                                    </h3>
                                    <p className="text-sm text-muted-foreground max-w-sm">
                                        Start a conversation by joining a server and messaging other members.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// Server icon component for mobile
interface ServerIconProps {
    server: any
    isActive: boolean
    onClick: () => void
}

function ServerIcon({ server, isActive, onClick }: ServerIconProps) {
    return (
        <div className="relative">
            {/* Active indicator */}
            {isActive && (
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
            )}

            <Button
                variant="ghost"
                size="icon"
                onClick={onClick}
                className={cn(
                    "w-12 h-12 p-0 transition-all duration-300 relative",
                    isActive
                        ? "rounded-2xl bg-primary/20 hover:bg-primary/30"
                        : "rounded-3xl hover:rounded-xl hover:bg-primary/10"
                )}
            >
                <div className="w-12 h-12 rounded-inherit overflow-hidden border border-border">
                    {server.logo ? (
                        <img
                            src={`https://arweave.net/${server.logo}`}
                            alt={server.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                            <Hash className="w-6 h-6 text-primary" />
                        </div>
                    )}
                </div>
            </Button>
        </div>
    )
}

// DM item component
interface DMItemProps {
    friend: any
    profile?: any
    onClick: () => void
}

function DMItem({ friend, profile, onClick }: DMItemProps) {
    const displayName = profile?.displayName || profile?.primaryName || shortenAddress(friend.userId)

    return (
        <Button
            variant="ghost"
            onClick={onClick}
            className="w-full h-14 px-3 justify-start text-left hover:bg-muted/50 transition-colors"
        >
            <div className="flex items-center gap-3 w-full">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/20 border border-primary/30 flex-shrink-0">
                    {profile?.pfp ? (
                        <img
                            src={`https://arweave.net/${profile.pfp}`}
                            alt={displayName}
                            className="w-full h-full object-cover"
                        />
                    ) : profile?.primaryLogo ? (
                        <img
                            src={`https://arweave.net/${profile.primaryLogo}`}
                            alt={displayName}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                            <img src={alien} alt="alien" className="w-1/2 h-1/2 opacity-60" />
                        </div>
                    )}
                </div>

                {/* Name and status */}
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                        {displayName}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                        {friend.status || "Click to message"}
                    </p>
                </div>
            </div>
        </Button>
    )
} 