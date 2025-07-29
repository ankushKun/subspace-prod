import React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
    Menu,
    ArrowLeft,
    Hash,
    Users,
    Search,
    MoreVertical,
    MessageCircle
} from "lucide-react"
import { useNavigate } from "react-router"
import { useGlobalState } from "@/hooks/use-global-state"
import { useSubspace } from "@/hooks/use-subspace"

interface MobileHeaderProps {
    className?: string
    // Navigation controls
    onToggleServerList?: () => void
    onToggleChannelList?: () => void
    onToggleMemberList?: () => void
    showMemberList?: boolean
    // Context
    context: 'servers' | 'channels' | 'messages' | 'dms'
    // Custom title override
    title?: string
}

export default function MobileHeader({
    className,
    onToggleServerList,
    onToggleChannelList,
    onToggleMemberList,
    showMemberList = false,
    context,
    title
}: MobileHeaderProps) {
    const navigate = useNavigate()
    const { activeServerId, activeChannelId, activeFriendId } = useGlobalState()
    const { servers, profiles } = useSubspace()

    // Get current context data
    const server = servers[activeServerId]
    const channel = server?.channels?.find(c =>
        c.channelId.toString() === activeChannelId ||
        (typeof c.channelId === 'string' && c.channelId === activeChannelId) ||
        (typeof c.channelId === 'number' && c.channelId === parseInt(activeChannelId))
    )
    const friendProfile = profiles[activeFriendId]

    // Generate contextual title and subtitle
    const getHeaderContent = () => {
        if (title) {
            return { title, subtitle: null, icon: null }
        }

        switch (context) {
            case 'servers':
                return {
                    title: 'Subspace',
                    subtitle: 'Select a server',
                    icon: <Menu className="w-5 h-5" />
                }
            case 'channels':
                return {
                    title: server?.name || 'Server',
                    subtitle: 'Select a channel',
                    icon: server?.logo ? (
                        <img
                            src={`https://arweave.net/${server.logo}`}
                            alt={server.name}
                            className="w-5 h-5 rounded-sm object-cover"
                        />
                    ) : (
                        <div className="w-5 h-5 bg-primary/20 rounded-sm flex items-center justify-center">
                            <Hash className="w-3 h-3 text-primary" />
                        </div>
                    )
                }
            case 'messages':
                return {
                    title: channel?.name || 'channel',
                    subtitle: server?.name,
                    icon: <Hash className="w-5 h-5 text-muted-foreground" />
                }
            case 'dms':
                const friendDisplayName = friendProfile?.displayName ||
                    friendProfile?.primaryName ||
                    activeFriendId?.substring(0, 4) + "..." + activeFriendId?.substring(activeFriendId.length - 4)
                return {
                    title: friendDisplayName || 'Direct Message',
                    subtitle: 'Direct Message',
                    icon: <MessageCircle className="w-5 h-5 text-muted-foreground" />
                }
            default:
                return {
                    title: 'Subspace',
                    subtitle: null,
                    icon: <Menu className="w-5 h-5" />
                }
        }
    }

    const { title: headerTitle, subtitle, icon } = getHeaderContent()

    // Navigation handlers
    const handleBack = () => {
        switch (context) {
            case 'messages':
                // Go back to channels
                navigate(`/app/${activeServerId}`)
                break
            case 'channels':
                // Go back to servers
                navigate('/app')
                break
            case 'dms':
                // Go back to DM list
                navigate('/app')
                break
            default:
                navigate('/app')
        }
    }

    const handlePrimary = () => {
        switch (context) {
            case 'servers':
                onToggleServerList?.()
                break
            case 'channels':
                onToggleChannelList?.()
                break
            case 'messages':
                onToggleChannelList?.()
                break
            case 'dms':
                // Could toggle DM list
                break
        }
    }

    const showBackButton = context !== 'servers'
    const showPrimaryButton = context === 'servers' || context === 'channels' || context === 'messages'

    return (
        <div className={cn(
            "flex items-center justify-between px-3 py-2 border-b border-border/50 bg-background/95 backdrop-blur-sm",
            "min-h-[60px] w-full relative z-50",
            className
        )}>
            {/* Left side - Navigation */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
                {showBackButton ? (
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleBack}
                        className="h-10 w-10 hover:bg-muted/50 transition-colors flex-shrink-0"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                ) : showPrimaryButton ? (
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={handlePrimary}
                        className="h-10 w-10 hover:bg-muted/50 transition-colors flex-shrink-0"
                        aria-label="Open menu"
                    >
                        <Menu className="w-5 h-5" />
                    </Button>
                ) : null}

                {/* Title and context */}
                <div className="flex items-center gap-3 min-w-0 flex-1 ml-1">
                    {icon && (
                        <div className="flex-shrink-0">
                            {icon}
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <h1 className="text-base font-semibold text-foreground truncate">
                            {headerTitle}
                        </h1>
                        {subtitle && (
                            <p className="text-xs text-muted-foreground truncate">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Right side - Action buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
                {/* Search button - shown in messages context */}
                {context === 'messages' && (
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 hover:bg-muted/50 transition-colors"
                        aria-label="Search"
                    >
                        <Search className="w-5 h-5" />
                    </Button>
                )}

                {/* Member list toggle - shown in messages context */}
                {context === 'messages' && onToggleMemberList && (
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={onToggleMemberList}
                        className={cn(
                            "h-10 w-10 hover:bg-muted/50 transition-colors",
                            showMemberList && "bg-muted/50 text-primary"
                        )}
                        aria-label={showMemberList ? "Hide members" : "Show members"}
                    >
                        <Users className="w-5 h-5" />
                    </Button>
                )}

                {/* More options menu */}
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 hover:bg-muted/50 transition-colors"
                    aria-label="More options"
                >
                    <MoreVertical className="w-5 h-5" />
                </Button>
            </div>
        </div>
    )
} 