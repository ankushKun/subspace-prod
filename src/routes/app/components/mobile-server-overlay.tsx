import React, { useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { X, Plus, Home } from "lucide-react"
import ServerList from "./server-list"
import { useNavigate } from "react-router"
import { useGlobalState } from "@/hooks/use-global-state"
import { useSubspace } from "@/hooks/use-subspace"

interface MobileServerOverlayProps {
    isOpen: boolean
    onClose: () => void
    onServerJoined?: (data: any) => void
}

export default function MobileServerOverlay({
    isOpen,
    onClose,
    onServerJoined
}: MobileServerOverlayProps) {
    const navigate = useNavigate()
    const { activeServerId } = useGlobalState()

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown)
            // Prevent body scroll when overlay is open
            document.body.style.overflow = 'hidden'
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.body.style.overflow = 'unset'
        }
    }, [isOpen, onClose])

    // Handle backdrop click
    const handleBackdropClick = (event: React.MouseEvent) => {
        if (event.target === event.currentTarget) {
            onClose()
        }
    }

    // Handle DM navigation
    const handleDMNavigation = () => {
        navigate('/app')
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0"
                )}
                onClick={handleBackdropClick}
            />

            {/* Slide-out panel */}
            <div
                className={cn(
                    "fixed left-0 top-0 h-full w-80 bg-background border-r border-border shadow-2xl",
                    "transform transition-transform duration-300 ease-out",
                    "flex flex-col",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                    <h2 className="text-lg font-semibold text-foreground font-ocr">
                        Servers
                    </h2>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={onClose}
                        className="h-10 w-10 hover:bg-muted/50 transition-colors"
                        aria-label="Close server list"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Home/DMs button */}
                    <div className="p-4 border-b border-border/50">
                        <Button
                            variant={!activeServerId ? "default" : "ghost"}
                            size="lg"
                            onClick={handleDMNavigation}
                            className={cn(
                                "w-full justify-start gap-3 h-12 text-left",
                                "hover:bg-muted/50 transition-colors font-medium",
                                !activeServerId && "bg-primary text-primary-foreground hover:bg-primary/90"
                            )}
                        >
                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                <Home className="w-4 h-4 text-primary" />
                            </div>
                            <span className="flex-1">Direct Messages</span>
                        </Button>
                    </div>

                    {/* Server List */}
                    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                Your Servers
                            </h3>

                            {/* Mobile-optimized server list */}
                            <div className="space-y-2">
                                <MobileServerList onServerJoined={onServerJoined} onClose={onClose} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Mobile-optimized server list component
interface MobileServerListProps {
    onServerJoined?: (data: any) => void
    onClose: () => void
}

function MobileServerList({ onServerJoined, onClose }: MobileServerListProps) {
    const navigate = useNavigate()
    const { activeServerId } = useGlobalState()

    // Custom handler for server clicks that also closes the overlay
    const handleServerClick = (serverId: string) => {
        navigate(`/app/${serverId}`)
        onClose()
    }

    return (
        <div className="space-y-2">
            {/* Use the existing ServerList component but hide it and create mobile-friendly buttons */}
            <div className="hidden">
                <ServerList onServerJoined={onServerJoined} />
            </div>

            {/* Mobile server buttons - we'll need to get servers from the hook */}
            <MobileServerButtons
                onServerClick={handleServerClick}
                activeServerId={activeServerId}
                onServerJoined={onServerJoined}
            />
        </div>
    )
}

// Mobile server buttons component
interface MobileServerButtonsProps {
    onServerClick: (serverId: string) => void
    activeServerId: string
    onServerJoined?: (data: any) => void
}

function MobileServerButtons({ onServerClick, activeServerId, onServerJoined }: MobileServerButtonsProps) {
    // Get servers from subspace hook
    const { servers } = useSubspace()

    return (
        <div className="space-y-2">
            {/* Server buttons */}
            {Object.values(servers).map((server) => (
                <Button
                    key={server.serverId}
                    variant={activeServerId === server.serverId ? "default" : "ghost"}
                    size="lg"
                    onClick={() => onServerClick(server.serverId)}
                    className={cn(
                        "w-full justify-start gap-3 h-12 text-left",
                        "hover:bg-muted/50 transition-colors font-medium",
                        activeServerId === server.serverId && "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                >
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-primary/20 flex items-center justify-center">
                        {server.logo ? (
                            <img
                                src={`https://arweave.net/${server.logo}`}
                                alt={server.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                                <div className="w-4 h-4 bg-primary rounded-sm" />
                            </div>
                        )}
                    </div>
                    <span className="flex-1 truncate">{server.name}</span>
                </Button>
            ))}

            {/* Add Server Button */}
            <Button
                variant="outline"
                size="lg"
                className="w-full justify-start gap-3 h-12 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/10"
            >
                <div className="w-8 h-8 rounded-lg border-2 border-dashed border-current flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                </div>
                <span className="flex-1 text-muted-foreground">Add a Server</span>
            </Button>
        </div>
    )
} 