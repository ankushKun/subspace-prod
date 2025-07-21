import { useGlobalState } from "@/hooks/use-global-state";
import { useSubspace } from "@/hooks/use-subspace";
import { cn } from "@/lib/utils";
import { useState, useMemo, useEffect } from "react";
import { ChevronRight, ChevronDown, Hash, MoreHorizontal, Settings, LogOut, Copy, Users, Crown, Link, Plus, FolderPlus, Loader2 } from "lucide-react";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useWallet } from "@/hooks/use-wallet";

export default function ChannelList({ className }: { className?: string }) {
    const { activeServerId, activeChannelId, actions } = useGlobalState()
    const { servers, actions: subspaceActions } = useSubspace()
    const navigate = useNavigate()

    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

    // Create/Edit dialogs state
    const [createChannelOpen, setCreateChannelOpen] = useState(false)
    const [createCategoryOpen, setCreateCategoryOpen] = useState(false)
    const [channelName, setChannelName] = useState("")
    const [categoryName, setCategoryName] = useState("")
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("none")
    const [isCreatingChannel, setIsCreatingChannel] = useState(false)
    const [isCreatingCategory, setIsCreatingCategory] = useState(false)

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

    // Initialize expanded categories when server changes
    useEffect(() => {
        if (server?.categories) {
            setExpandedCategories(new Set(server.categories.map(cat => cat.categoryId.toString())))
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

        // Handle both string and number channel IDs for compatibility
        const isActive = channel.channelId.toString() === activeChannelId ||
            (typeof channel.channelId === 'string' && channel.channelId === activeChannelId) ||
            (typeof channel.channelId === 'number' && channel.channelId === parseInt(activeChannelId));

        return isActive;
    };

    // Auto-redirect to first channel if current channel is not found
    useEffect(() => {
        if (server && server.channels && server.channels.length > 0 && activeChannelId) {
            // Check if current activeChannelId exists in server channels
            const channelExists = server.channels.some(c =>
                c.channelId.toString() === activeChannelId ||
                (typeof c.channelId === 'string' && c.channelId === activeChannelId) ||
                (typeof c.channelId === 'number' && c.channelId === parseInt(activeChannelId))
            );

            if (!channelExists) {
                const firstChannel = server.channels[0];
                if (firstChannel) {
                    selectChannel(firstChannel.channelId);
                }
            }
        }
    }, [server, activeChannelId, activeServerId]);

    // CRUD handlers for categories and channels
    const handleCreateCategory = async () => {
        if (!activeServerId || !categoryName.trim()) {
            toast.error("Please enter a category name")
            return
        }

        setIsCreatingCategory(true)
        try {
            const success = await subspaceActions.servers.createCategory(activeServerId, {
                name: categoryName.trim()
            })

            if (success) {
                toast.success("Category created successfully")
                setCategoryName("")
                setCreateCategoryOpen(false)
            } else {
                toast.error("Failed to create category")
            }
        } catch (error) {
            console.error("Error creating category:", error)
            toast.error("Failed to create category")
        } finally {
            setIsCreatingCategory(false)
        }
    }

    const handleCreateChannel = async () => {
        if (!activeServerId || !channelName.trim()) {
            toast.error("Please enter a channel name")
            return
        }

        setIsCreatingChannel(true)
        try {
            const success = await subspaceActions.servers.createChannel(activeServerId, {
                name: channelName.trim(),
                categoryId: selectedCategoryId === "none" ? undefined : selectedCategoryId || undefined
            })

            if (success) {
                toast.success("Channel created successfully")
                setChannelName("")
                setSelectedCategoryId("none")
                setCreateChannelOpen(false)
            } else {
                toast.error("Failed to create channel")
            }
        } catch (error) {
            console.error("Error creating channel:", error)
            toast.error("Failed to create channel")
        } finally {
            setIsCreatingChannel(false)
        }
    }

    if (!server) {
        return (
            <div className={cn(
                "flex flex-col w-60 h-full py-4 px-3 !z-10",
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
            "flex flex-col w-60 h-full relative !z-10",
            "bg-gradient-to-b from-background via-background/95 to-background/90",
            "backdrop-blur-sm rounded-br-xl",
            "scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/40",
            "before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.02)_0%,transparent_50%)] before:pointer-events-none",
            className
        )}>
            {/* Ambient glow at top */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16 bg-primary/5 rounded-full blur-2xl" />

            {/* Server name header */}
            <div className="mb-4 p-2 px-1 flex flex-col justify-center items-center relative">
                {/* Server Actions Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div className="flex items-center justify-between w-full group cursor-pointer hover:bg-muted-foreground/5 p-3.5 -my-1 rounded-sm transition-all duration-200">
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

                            {/* Dropdown Indicator */}
                            <ChevronDown className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-all duration-200 flex-shrink-0" />
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" sideOffset={-2} alignOffset={0} className="w-[310px] rounded bg-background border border-border/50 shadow-lg">
                        <DropdownMenuItem
                            onClick={() => {
                                const inviteLink = `${window.location.origin}/#/invite/${activeServerId}`;
                                navigator.clipboard.writeText(inviteLink);
                                toast.success("Invite link copied to clipboard");
                            }}
                            className="cursor-pointer p-3 hover:bg-muted/50 focus:bg-muted/50"
                        >
                            <div className="flex items-center gap-3 w-full">
                                <div className="w-8 h-8 rounded-sm bg-blue-500/10 flex items-center justify-center">
                                    <Link className="w-4 h-4 text-blue-500" />
                                </div>
                                <div className="flex flex-col flex-1 min-w-0">
                                    <span className="font-medium text-sm text-foreground">Copy Invite Link</span>
                                    <span className="text-xs text-muted-foreground">Share this server with others</span>
                                </div>
                            </div>
                        </DropdownMenuItem>

                        {/* Show creation options only if user is server owner */}
                        {server.ownerId === useWallet.getState().address && (
                            <>
                                <DropdownMenuItem
                                    onClick={() => setCreateCategoryOpen(true)}
                                    className="cursor-pointer p-3 hover:bg-muted/50 focus:bg-muted/50"
                                >
                                    <div className="flex items-center gap-3 w-full">
                                        <div className="w-8 h-8 rounded-sm bg-green-500/10 flex items-center justify-center">
                                            <Plus className="w-4 h-4 text-green-500" />
                                        </div>
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <span className="font-medium text-sm text-foreground">Create Category</span>
                                            <span className="text-xs text-muted-foreground">Add a new category</span>
                                        </div>
                                    </div>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                    onClick={() => setCreateChannelOpen(true)}
                                    className="cursor-pointer p-3 hover:bg-muted/50 focus:bg-muted/50"
                                >
                                    <div className="flex items-center gap-3 w-full">
                                        <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center">
                                            <Hash className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <span className="font-medium text-sm text-foreground">Create Channel</span>
                                            <span className="text-xs text-muted-foreground">Add a new channel</span>
                                        </div>
                                    </div>
                                </DropdownMenuItem>
                            </>
                        )}

                        {/* Show server settings only if user is server owner */}
                        {server.ownerId === useWallet.getState().address && (
                            <>
                                <DropdownMenuSeparator className="my-1" />
                                <DropdownMenuItem
                                    onClick={() => navigate(`/app/${activeServerId}/settings`)}
                                    className="cursor-pointer p-3 hover:bg-muted/50 focus:bg-muted/50"
                                >
                                    <div className="flex items-center gap-3 w-full">
                                        <div className="w-8 h-8 rounded-sm bg-orange-500/10 flex items-center justify-center">
                                            <Settings className="w-4 h-4 text-orange-500" />
                                        </div>
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <span className="font-medium text-sm text-foreground">Server Settings</span>
                                            <span className="text-xs text-muted-foreground">Configure server options</span>
                                        </div>
                                    </div>
                                </DropdownMenuItem>
                            </>
                        )}

                        <DropdownMenuSeparator className="my-1" />

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
                            className="cursor-pointer p-3 hover:bg-red-500/10 focus:bg-red-500/10 text-red-500 focus:text-red-500"
                        >
                            <div className="flex items-center gap-3 w-full">
                                <div className="w-8 h-8 rounded-sm bg-red-500/10 flex items-center justify-center">
                                    <LogOut className="w-4 h-4 text-red-500" />
                                </div>
                                <div className="flex flex-col flex-1 min-w-0">
                                    <span className="font-medium text-sm">Leave Server</span>
                                    <span className="text-xs text-red-400">Remove yourself from this server</span>
                                </div>
                            </div>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
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
                    const categoryChannels = categorizedChannels.get(category.categoryId.toString()) || []
                    const isExpanded = expandedCategories.has(category.categoryId.toString())

                    return (
                        <div key={category.categoryId.toString()} className="space-y-1">
                            {/* Category Header */}
                            <div
                                className={cn(
                                    "w-full h-8 px-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider transition-all duration-200",
                                    "text-muted-foreground hover:text-foreground",
                                    "hover:bg-muted/50 rounded-md cursor-pointer"
                                )}
                                onClick={() => toggleCategory(category.categoryId.toString())}
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

            {/* Create Category Dialog */}
            <Dialog open={createCategoryOpen} onOpenChange={setCreateCategoryOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Create Category</DialogTitle>
                        <DialogDescription>
                            Add a new category to organize your channels.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="category-name">Category Name</Label>
                            <Input
                                id="category-name"
                                placeholder="e.g. General Discussion"
                                value={categoryName}
                                onChange={(e) => setCategoryName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && categoryName.trim()) {
                                        handleCreateCategory();
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCreateCategoryOpen(false)}
                            disabled={isCreatingCategory}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleCreateCategory}
                            disabled={isCreatingCategory || !categoryName.trim()}
                        >
                            {isCreatingCategory ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create Category"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Channel Dialog */}
            <Dialog open={createChannelOpen} onOpenChange={setCreateChannelOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Create Channel</DialogTitle>
                        <DialogDescription>
                            Add a new channel to your server.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="channel-name">Channel Name</Label>
                            <Input
                                id="channel-name"
                                placeholder="e.g. general"
                                value={channelName}
                                onChange={(e) => setChannelName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && channelName.trim()) {
                                        handleCreateChannel();
                                    }
                                }}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="category-select">Parent Category (Optional)</Label>
                            <Select
                                value={selectedCategoryId}
                                onValueChange={setSelectedCategoryId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a category or leave uncategorized" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Category (Uncategorized)</SelectItem>
                                    {categories.map((category) => (
                                        <SelectItem key={category.categoryId} value={category.categoryId.toString()}>
                                            {category.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCreateChannelOpen(false)}
                            disabled={isCreatingChannel}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleCreateChannel}
                            disabled={isCreatingChannel || !channelName.trim()}
                        >
                            {isCreatingChannel ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create Channel"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}