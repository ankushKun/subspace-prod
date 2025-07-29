import React, { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { X, Hash, ChevronDown, ChevronRight, Plus, Volume2, Settings } from "lucide-react"
import { useNavigate } from "react-router"
import { useGlobalState } from "@/hooks/use-global-state"
import { useSubspace } from "@/hooks/use-subspace"
import type { Channel, Category } from "@subspace-protocol/sdk"

interface MobileChannelOverlayProps {
    isOpen: boolean
    onClose: () => void
}

export default function MobileChannelOverlay({
    isOpen,
    onClose
}: MobileChannelOverlayProps) {
    const navigate = useNavigate()
    const { activeServerId, activeChannelId } = useGlobalState()
    const { servers } = useSubspace()

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

    // Get current server
    const server = servers[activeServerId]

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
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        {server?.logo ? (
                            <img
                                src={`https://arweave.net/${server.logo}`}
                                alt={server.name}
                                className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                            />
                        ) : (
                            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Hash className="w-4 h-4 text-primary" />
                            </div>
                        )}
                        <h2 className="text-lg font-semibold text-foreground font-ocr truncate">
                            {server?.name || 'Server'}
                        </h2>
                    </div>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={onClose}
                        className="h-10 w-10 hover:bg-muted/50 transition-colors flex-shrink-0"
                        aria-label="Close channel list"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {server ? (
                        <MobileChannelList
                            server={server}
                            activeChannelId={activeChannelId}
                            onChannelClick={onClose}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-muted-foreground">No server selected</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// Mobile channel list component
interface MobileChannelListProps {
    server: any
    activeChannelId: string
    onChannelClick: () => void
}

function MobileChannelList({ server, activeChannelId, onChannelClick }: MobileChannelListProps) {
    const navigate = useNavigate()
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

    // Organize channels by categories (reused logic from channel-list.tsx)
    const { categories, categorizedChannels, uncategorizedChannels } = useMemo(() => {
        if (!server) {
            return { categories: [] as Category[], categorizedChannels: new Map(), uncategorizedChannels: [] as Channel[] }
        }

        // Sort categories by order
        const sortedCategories = [...server.categories].sort((a, b) => (a.orderId || 0) - (b.orderId || 0))

        // Create map of category ID to channels
        const channelsByCategory = new Map<string, Channel[]>()
        const categoryIds = new Set(sortedCategories.map(cat => cat.categoryId.toString()))

        // Categorize channels
        for (const channel of server.channels) {
            if (channel.categoryId && categoryIds.has(channel.categoryId.toString())) {
                const categoryIdStr = channel.categoryId.toString()
                if (!channelsByCategory.has(categoryIdStr)) {
                    channelsByCategory.set(categoryIdStr, [])
                }
                channelsByCategory.get(categoryIdStr)?.push(channel)
            }
        }

        // Sort channels within each category
        for (const [categoryId, channels] of channelsByCategory.entries()) {
            channelsByCategory.set(
                categoryId,
                channels.sort((a, b) => (a.orderId || 0) - (b.orderId || 0))
            )
        }

        // Get uncategorized channels
        const uncategorized = server.channels
            .filter(channel => !channel.categoryId || !categoryIds.has(channel.categoryId.toString()))
            .sort((a, b) => (a.orderId || 0) - (b.orderId || 0))

        return {
            categories: sortedCategories,
            categorizedChannels: channelsByCategory,
            uncategorizedChannels: uncategorized
        }
    }, [server])

    // Handle channel click
    const handleChannelClick = (channelId: string) => {
        navigate(`/app/${server.serverId}/${channelId}`)
        onChannelClick()
    }

    // Toggle category expansion
    const toggleCategory = (categoryId: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev)
            if (newSet.has(categoryId)) {
                newSet.delete(categoryId)
            } else {
                newSet.add(categoryId)
            }
            return newSet
        })
    }

    return (
        <div className="p-4 space-y-4">
            {/* Uncategorized channels */}
            {uncategorizedChannels.length > 0 && (
                <div className="space-y-1">
                    {uncategorizedChannels.map((channel) => (
                        <ChannelButton
                            key={channel.channelId}
                            channel={channel}
                            isActive={activeChannelId === channel.channelId.toString()}
                            onClick={() => handleChannelClick(channel.channelId.toString())}
                        />
                    ))}
                </div>
            )}

            {/* Categorized channels */}
            {categories.map((category) => {
                const channels = categorizedChannels.get(category.categoryId.toString()) || []
                const isExpanded = expandedCategories.has(category.categoryId.toString())

                return (
                    <div key={category.categoryId} className="space-y-1">
                        {/* Category header */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCategory(category.categoryId.toString())}
                            className="w-full justify-start gap-2 h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground uppercase tracking-wider"
                        >
                            {isExpanded ? (
                                <ChevronDown className="w-3 h-3" />
                            ) : (
                                <ChevronRight className="w-3 h-3" />
                            )}
                            <span className="flex-1 text-left truncate">
                                {category.name}
                            </span>
                        </Button>

                        {/* Category channels */}
                        {isExpanded && (
                            <div className="space-y-1 ml-2">
                                {channels.map((channel) => (
                                    <ChannelButton
                                        key={channel.channelId}
                                        channel={channel}
                                        isActive={activeChannelId === channel.channelId.toString()}
                                        onClick={() => handleChannelClick(channel.channelId.toString())}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

// Channel button component
interface ChannelButtonProps {
    channel: any
    isActive: boolean
    onClick: () => void
}

function ChannelButton({ channel, isActive, onClick }: ChannelButtonProps) {
    const getChannelIcon = () => {
        switch (channel.type) {
            case 'voice':
                return <Volume2 className="w-4 h-4" />
            default:
                return <Hash className="w-4 h-4" />
        }
    }

    return (
        <Button
            variant={isActive ? "default" : "ghost"}
            size="sm"
            onClick={onClick}
            className={cn(
                "w-full justify-start gap-2 h-10 px-3 text-sm",
                "hover:bg-muted/50 transition-colors font-medium",
                isActive && "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
        >
            <div className="flex-shrink-0 text-muted-foreground">
                {getChannelIcon()}
            </div>
            <span className="flex-1 text-left truncate">
                {channel.name}
            </span>
        </Button>
    )
} 