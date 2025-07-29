import React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    ArrowLeft,
    Hash,
    Users,
    Search,
    MoreVertical
} from "lucide-react"
import { useNavigate } from "react-router"
import { useGlobalState } from "@/hooks/use-global-state"
import { useSubspace } from "@/hooks/use-subspace"
import { useWallet } from "@/hooks/use-wallet"
import Messages, { type MessagesRef } from "./messages"
import DMMessages, { type DMMessagesRef } from "./dm-messages"
import { useRef } from "react"
import LoginDialog from "@/components/login-dialog"
import alien from "@/assets/subspace/alien-black.svg"

interface MobileMessagesViewProps {
    className?: string
    onToggleMemberList?: () => void
    showMemberList?: boolean
}

export default function MobileMessagesView({
    className,
    onToggleMemberList,
    showMemberList
}: MobileMessagesViewProps) {
    const navigate = useNavigate()
    const { activeServerId, activeChannelId, activeFriendId } = useGlobalState()
    const { servers, profiles } = useSubspace()
    const { address, connected } = useWallet()

    const messagesRef = useRef<MessagesRef>(null)
    const dmMessagesRef = useRef<DMMessagesRef>(null)

    // Get current context data
    const server = servers[activeServerId]
    const channel = server?.channels?.find(c =>
        c.channelId.toString() === activeChannelId ||
        (typeof c.channelId === 'string' && c.channelId === activeChannelId) ||
        (typeof c.channelId === 'number' && c.channelId === parseInt(activeChannelId))
    )
    const friendProfile = profiles[activeFriendId]

    // Handle back navigation
    const handleBack = () => {
        if (activeFriendId) {
            // Go back to DM list (home)
            navigate('/app')
        } else if (activeServerId) {
            // Go back to channel list
            navigate(`/app/${activeServerId}`)
        } else {
            navigate('/app')
        }
    }

    // Generate header content
    const getHeaderContent = () => {
        if (activeFriendId) {
            const friendDisplayName = friendProfile?.displayName ||
                friendProfile?.primaryName ||
                activeFriendId?.substring(0, 4) + "..." + activeFriendId?.substring(activeFriendId.length - 4)
            return {
                title: friendDisplayName || 'Direct Message',
                subtitle: 'Direct Message',
                icon: (
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/20 border border-primary/30">
                        {friendProfile?.pfp ? (
                            <img
                                src={`https://arweave.net/${friendProfile.pfp}`}
                                alt={friendDisplayName}
                                className="w-full h-full object-cover"
                            />
                        ) : friendProfile?.primaryLogo ? (
                            <img
                                src={`https://arweave.net/${friendProfile.primaryLogo}`}
                                alt={friendDisplayName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                                <div className="w-4 h-4 bg-primary rounded-full" />
                            </div>
                        )}
                    </div>
                )
            }
        }

        return {
            title: channel?.name || 'channel',
            subtitle: server?.name,
            icon: <Hash className="w-5 h-5 text-muted-foreground" />
        }
    }

    const { title, subtitle, icon } = getHeaderContent()

    // Show connect prompt if not connected
    if (!connected || !address) {
        return (
            <div className={cn("flex flex-col h-full bg-background", className)}>
                {/* Mobile header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-background/95 backdrop-blur-sm min-h-[60px]">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={handleBack}
                            className="h-10 w-10 hover:bg-muted/50 transition-colors flex-shrink-0"
                            aria-label="Go back"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <h1 className="text-base font-semibold text-foreground truncate ml-1">
                            Messages
                        </h1>
                    </div>
                </div>

                {/* Connect prompt */}
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="text-center space-y-6">
                        <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center border border-primary/30">
                            <img src={alien} alt="alien" className="w-8 h-8 opacity-60" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-medium text-foreground font-ocr">
                                Connect Required
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-sm">
                                Connect your wallet to send and receive messages in Subspace.
                            </p>
                        </div>
                        <LoginDialog>
                            <Button
                                size="lg"
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-ocr gap-2 px-6"
                            >
                                <Hash className="w-5 h-5" />
                                Connect Wallet
                            </Button>
                        </LoginDialog>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={cn("flex flex-col h-full bg-background", className)}>
            {/* Mobile header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-background/95 backdrop-blur-sm min-h-[60px]">
                {/* Left side - Back button and title */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleBack}
                        className="h-10 w-10 hover:bg-muted/50 transition-colors flex-shrink-0"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>

                    <div className="flex items-center gap-3 min-w-0 flex-1 ml-1">
                        <div className="flex-shrink-0">
                            {icon}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-base font-semibold text-foreground truncate">
                                {title}
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
                    {/* Search button */}
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 hover:bg-muted/50 transition-colors"
                        aria-label="Search"
                    >
                        <Search className="w-5 h-5" />
                    </Button>

                    {/* Member list toggle - only for channels */}
                    {activeServerId && activeChannelId && onToggleMemberList && (
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

                    {/* More options */}
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

            {/* Messages content */}
            <div className="flex-1 overflow-hidden">
                {activeServerId && activeChannelId ? (
                    <Messages
                        ref={messagesRef}
                        className="h-full"
                        onToggleMemberList={onToggleMemberList}
                        showMemberList={false} // Never show desktop member list on mobile
                    />
                ) : activeFriendId ? (
                    <DMMessages
                        ref={dmMessagesRef}
                        className="h-full"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">No conversation selected</p>
                    </div>
                )}
            </div>
        </div>
    )
} 