import React, { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    ArrowLeft,
    Hash,
    Volume2,
    ChevronDown,
    ChevronRight,
    Settings,
    Users
} from "lucide-react"
import { useNavigate } from "react-router"
import { useGlobalState } from "@/hooks/use-global-state"
import { useSubspace } from "@/hooks/use-subspace"
import type { Channel, Category } from "@subspace-protocol/sdk"

interface MobileChannelsViewProps {
    className?: string
}

export default function MobileChannelsView({ className }: MobileChannelsViewProps) {
    const navigate = useNavigate()
    const { activeServerId, activeChannelId } = useGlobalState()
    const { servers } = useSubspace()
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

    // Get current server
    const server = servers[activeServerId]

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

    // Handle back navigation
    const handleBack = () => {
        navigate('/app')
    }

    // Handle channel click
    const handleChannelClick = (channelId: string) => {
        navigate(`/app/${activeServerId}/${channelId}`)
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

    if (!server) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Server not found</p>
            </div>
        )
    }

    return (
        <div className={cn("flex flex-col h-full bg-background", className)}>
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border bg-background/95 backdrop-blur-sm">
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleBack}
                    className="h-10 w-10 hover:bg-muted/50 transition-colors flex-shrink-0"
                    aria-label="Back to servers"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>

                <div className="flex items-center gap-3 min-w-0 flex-1">
                    {server.logo ? (
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

                    <div className="min-w-0 flex-1">
                        <h1 className="text-lg font-semibold text-foreground font-ocr truncate">
                            {server.name}
                        </h1>
                        <p className="text-sm text-muted-foreground truncate">
                            {server.memberCount || 0} members
                        </p>
                    </div>
                </div>

                <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 hover:bg-muted/50 transition-colors flex-shrink-0"
                    aria-label="Server settings"
                >
                    <Settings className="w-5 h-5" />
                </Button>
            </div>

            {/* Channels list */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-6">
                    {/* Uncategorized channels */}
                    {uncategorizedChannels.length > 0 && (
                        <div className="space-y-2">
                            {uncategorizedChannels.map((channel) => (
                                <MobileChannelItem
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
                            <div key={category.categoryId} className="space-y-2">
                                {/* Category header */}
                                <Button
                                    variant="ghost"
                                    onClick={() => toggleCategory(category.categoryId.toString())}
                                    className="w-full justify-start gap-2 h-10 px-3 text-sm font-medium text-muted-foreground hover:text-foreground uppercase tracking-wider hover:bg-muted/50"
                                >
                                    {isExpanded ? (
                                        <ChevronDown className="w-4 h-4" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4" />
                                    )}
                                    <span className="flex-1 text-left truncate">
                                        {category.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {channels.length}
                                    </span>
                                </Button>

                                {/* Category channels */}
                                {isExpanded && (
                                    <div className="space-y-1 ml-4">
                                        {channels.map((channel) => (
                                            <MobileChannelItem
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

                    {/* Empty state */}
                    {uncategorizedChannels.length === 0 && categories.length === 0 && (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                                    <Hash className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-lg font-medium text-foreground">
                                        No Channels
                                    </h3>
                                    <p className="text-sm text-muted-foreground max-w-sm">
                                        This server doesn't have any channels yet.
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

// Mobile channel item component
interface MobileChannelItemProps {
    channel: any
    isActive: boolean
    onClick: () => void
}

function MobileChannelItem({ channel, isActive, onClick }: MobileChannelItemProps) {
    const getChannelIcon = () => {
        switch (channel.type) {
            case 'voice':
                return <Volume2 className="w-5 h-5" />
            default:
                return <Hash className="w-5 h-5" />
        }
    }

    return (
        <Button
            variant={isActive ? "default" : "ghost"}
            onClick={onClick}
            className={cn(
                "w-full justify-start gap-3 h-12 px-3 text-left transition-colors",
                "hover:bg-muted/50 font-medium",
                isActive && "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
        >
            <div className="flex-shrink-0 text-muted-foreground">
                {getChannelIcon()}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                    {channel.name}
                </p>
                {channel.description && (
                    <p className="text-xs text-muted-foreground truncate">
                        {channel.description}
                    </p>
                )}
            </div>
        </Button>
    )
} 