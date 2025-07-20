import { useGlobalState } from "@/hooks/use-global-state";
import { useSubspace } from "@/hooks/use-subspace";
import { cn } from "@/lib/utils";
import { useState, useMemo, useEffect } from "react";
import { ChevronRight, ChevronDown, Hash, MoreHorizontal, Settings, LogOut, Copy, Users, Crown } from "lucide-react";
import type { Channel, Category } from "@subspace-protocol/sdk";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useWallet } from "@/hooks/use-wallet";

export default function ChannelList({ className }: { className?: string }) {
    const { activeServerId, activeChannelId, actions } = useGlobalState()
    const { servers } = useSubspace()
    const navigate = useNavigate()

    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

    // Get the server instance
    const server = servers[activeServerId]

    // Organize channels by categories
    const { categories, categorizedChannels, uncategorizedChannels } = useMemo(() => {
        if (!server) {
            return { categories: [] as Category[], categorizedChannels: new Map(), uncategorizedChannels: [] as Channel[] }
        }

        // Sort categories by order
        const sortedCategories = [...server.categories].sort((a, b) => (a.orderId || 0) - (b.orderId || 0))

        // Create map of category ID to channels
        const channelsByCategory = new Map<string, Channel[]>()
        const categoryIds = new Set(sortedCategories.map(cat => cat.categoryId))

        // Categorize channels
        for (const channel of server.channels) {
            if (channel.categoryId && categoryIds.has(channel.categoryId)) {
                if (!channelsByCategory.has(channel.categoryId)) {
                    channelsByCategory.set(channel.categoryId, [])
                }
                channelsByCategory.get(channel.categoryId)?.push(channel)
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
            .filter(channel => !channel.categoryId || !categoryIds.has(channel.categoryId))
            .sort((a, b) => (a.orderId || 0) - (b.orderId || 0))

        return {
            categories: sortedCategories,
            categorizedChannels: channelsByCategory,
            uncategorizedChannels: uncategorized
        }
    }, [server])

    // Initialize expanded categories when server changes
    useEffect(() => {
        if (server?.categories) {
            setExpandedCategories(new Set(server.categories.map(cat => cat.categoryId)))
        }
    }, [server?.categories])

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

    const selectChannel = (channelId: string) => {
        navigate(`/app/${activeServerId}/${channelId}`)
    }

    // Helper function to check if a channel is the active one
    const isChannelActive = (channel: Channel): boolean => {
        if (!activeChannelId) return false;

        return channel.channelId === activeChannelId ||
            channel.channelId === parseInt(activeChannelId).toString() ||
            channel.orderId === parseInt(activeChannelId);
    };

    // Auto-redirect to first channel if current channel is not found
    useEffect(() => {
        if (server && server.channels && server.channels.length > 0 && activeChannelId) {
            // Check if current activeChannelId exists in server channels
            const channelExists = server.channels.some(c =>
                c.channelId === activeChannelId ||
                c.channelId === parseInt(activeChannelId).toString() ||
                c.orderId === parseInt(activeChannelId)
            );

            if (!channelExists) {
                const firstChannel = server.channels[0];
                if (firstChannel) {
                    selectChannel(firstChannel.channelId);
                }
            }
        }
    }, [server, activeChannelId, activeServerId]);

    if (!server) {
        return (
            <div className={cn(
                "flex flex-col w-60 h-full py-4 px-3",
                "bg-gradient-to-b from-background via-background/95 to-background/90",
                "border-r border-border/50 backdrop-blur-sm",
                className
            )}>
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center animate-in fade-in-50 slide-in-from-bottom-4 duration-700">
                        <Hash className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Server not found</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={cn(
            "flex flex-col w-60 h-full relative",
            "bg-gradient-to-b from-background via-background/95 to-background/90",
            "border-r border-b border-border/50 backdrop-blur-sm rounded-br-lg",
            "scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/40",
            "before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.02)_0%,transparent_50%)] before:pointer-events-none",
            className
        )}>
            {/* Ambient glow at top */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16 bg-primary/5 rounded-full blur-2xl" />

            {/* Server name header */}
            <div className="mb-4 p-4 flex flex-col justify-center items-center relative">
                <div className="flex items-center justify-between w-full group">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* Server Logo */}
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-primary/20 flex items-center justify-center border border-primary/30 flex-shrink-0">
                            {server.logo ? (
                                <img
                                    src={`https://arweave.net/${server.logo}`}
                                    alt={`${server.name} logo`}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <Hash className="w-4 h-4 text-primary/80" />
                            )}
                        </div>

                        {/* Server Name */}
                        <h2 className="text-lg font-semibold text-foreground text-left truncate flex-1">
                            {server.name}
                        </h2>
                    </div>

                    {/* Server Actions Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 opacity-60 hover:opacity-100 hover:bg-muted/50 transition-all duration-200"
                            >
                                <MoreHorizontal className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem
                                onClick={() => {
                                    const inviteLink = `${window.location.origin}/#/invite/${activeServerId}`;
                                    navigator.clipboard.writeText(inviteLink);
                                    toast.success("Invite link copied to clipboard");
                                }}
                                className="cursor-pointer"
                            >
                                <Copy className="w-4 h-4 mr-2" />
                                Copy Invite Link
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onClick={() => navigate(`/app/${activeServerId}/members`)}
                                className="cursor-pointer"
                            >
                                <Users className="w-4 h-4 mr-2" />
                                View Members
                            </DropdownMenuItem>

                            {/* Show server settings only if user is server owner */}
                            {server.ownerId === useWallet.getState().address && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => navigate(`/app/${activeServerId}/settings`)}
                                        className="cursor-pointer"
                                    >
                                        <Settings className="w-4 h-4 mr-2" />
                                        Server Settings
                                    </DropdownMenuItem>
                                </>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                                onClick={async () => {
                                    const { actions } = useSubspace.getState();
                                    const success = await actions.servers.leave(activeServerId);
                                    if (success) {
                                        // Explicitly refresh the user's profile to update joined servers list
                                        await actions.profile.refresh();
                                        toast.success("Left server successfully");
                                        navigate("/app");
                                    } else {
                                        toast.error("Failed to leave server");
                                    }
                                }}
                                className="cursor-pointer text-destructive focus:text-destructive"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Leave Server
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-border to-transparent absolute bottom-0" />
            </div>

            {/* Channels content */}
            <div className="flex-1 overflow-y-auto px-2 space-y-2">
                {/* Uncategorized channels */}
                {uncategorizedChannels.length > 0 && (
                    <div className="space-y-0.5">
                        {uncategorizedChannels.map((channel) => (
                            <div
                                key={channel.channelId}
                                className={cn(
                                    "w-full h-8 px-2 flex items-center gap-2 text-sm transition-all duration-200 relative overflow-hidden cursor-pointer",
                                    "hover:bg-muted/50 rounded-md",
                                    isChannelActive(channel)
                                        ? "bg-accent/20 text-foreground font-medium"
                                        : "text-muted-foreground hover:text-foreground",
                                    "before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/5 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300"
                                )}
                                onClick={() => selectChannel(channel.channelId)}
                            >
                                <Hash className={cn(
                                    "w-4 h-4 transition-all duration-200 flex-shrink-0",
                                    isChannelActive(channel)
                                        ? "text-foreground"
                                        : "text-muted-foreground/60"
                                )} />
                                <span className="truncate">{channel.name}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Categories */}
                {categories.map((category) => {
                    const categoryChannels = categorizedChannels.get(category.categoryId) || []
                    const isExpanded = expandedCategories.has(category.categoryId)

                    return (
                        <div key={category.categoryId} className="space-y-1">
                            {/* Category Header */}
                            <div
                                className={cn(
                                    "w-full h-8 px-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider transition-all duration-200",
                                    "text-muted-foreground hover:text-foreground",
                                    "hover:bg-muted/50 rounded-md cursor-pointer"
                                )}
                                onClick={() => toggleCategory(category.categoryId)}
                            >
                                <div className="flex items-center gap-1">
                                    {isExpanded ? (
                                        <ChevronDown className="w-3 h-3 transition-transform duration-200" />
                                    ) : (
                                        <ChevronRight className="w-3 h-3 transition-transform duration-200" />
                                    )}
                                    <span className="truncate">{category.name}</span>
                                </div>
                                <span className="text-xs text-muted-foreground/60">{categoryChannels.length}</span>
                            </div>

                            {/* Category Channels */}
                            {isExpanded && (
                                <div className="space-y-0.5 ml-4">
                                    {categoryChannels.map((channel) => (
                                        <div
                                            key={channel.channelId}
                                            className={cn(
                                                "w-full h-8 px-2 flex items-center gap-2 text-sm transition-all duration-200 relative overflow-hidden cursor-pointer",
                                                "hover:bg-muted/50 rounded-md",
                                                isChannelActive(channel)
                                                    ? "bg-accent/20 text-foreground font-medium"
                                                    : "text-muted-foreground hover:text-foreground",
                                                "before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/5 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300"
                                            )}
                                            onClick={() => selectChannel(channel.channelId)}
                                        >
                                            <Hash className={cn(
                                                "w-4 h-4 transition-all duration-200 flex-shrink-0",
                                                isChannelActive(channel)
                                                    ? "text-foreground"
                                                    : "text-muted-foreground/60"
                                            )} />
                                            <span className="truncate">{channel.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Ambient glow at bottom */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-24 h-12 bg-primary/3 rounded-full blur-xl" />
        </div>
    )
}