import { useGlobalState } from "@/hooks/use-global-state";
import { useChannels, useCategories, useServer, useSubspaceActions, useMember, useRecentDms, useProfile, usePrimaryName } from "@/hooks/use-subspace";
import { useWallet } from "@/hooks/use-wallet";
import { cn } from "@/lib/utils";
import { Hash, MessageSquare, ChevronDown, ChevronRight, Settings, Copy, Users, LogOut, Plus, FolderPlus, Check } from "lucide-react";
import { shortenAddress } from "@/lib/utils";
import { ProfileAvatar } from "@/components/profile";
import type { IChannel, ICategory } from "@subspace-protocol/sdk/types";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { Permissions, EPermissions } from "@subspace-protocol/sdk/permissions"

interface ChannelItemProps {
    channel: IChannel;
    isActive: boolean;
    onClick: () => void;
}

interface DmItemProps {
    friendId: string;
    isActive: boolean;
    onClick: () => void;
}

function ChannelItem({ channel, isActive, onClick }: ChannelItemProps) {
    // For now, all channels are text channels (Hash icon)
    // Voice channels and other types can be added when the backend supports them
    const getChannelIcon = () => {
        return <Hash className="w-4 h-4 shrink-0 text-muted-foreground" />;
    };

    return (
        <div
            className={cn(
                "group relative flex items-center mx-2 px-2 py-1 mb-1 rounded cursor-pointer transition-all duration-75",
                "hover:bg-muted/60 active:bg-muted/80",
                isActive && "bg-muted text-foreground"
            )}
            onClick={onClick}
        >


            <div className="flex items-center min-w-0 flex-1">
                {getChannelIcon()}
                <span className={cn(
                    "ml-1.5 text-sm font-medium truncate transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                )}>
                    {channel.name}
                </span>
            </div>
        </div>
    );
}

function DmItem({ friendId, isActive, onClick }: DmItemProps) {
    const profile = useProfile(friendId);
    const primaryName = usePrimaryName(friendId);
    const displayName = primaryName || shortenAddress(friendId);

    return (
        <div
            className={cn(
                "group relative flex items-center mx-2 px-2 py-1 mb-1 rounded cursor-pointer transition-all duration-75",
                "hover:bg-muted/60 active:bg-muted/80",
                isActive && "bg-muted text-foreground"
            )}
            onClick={onClick}
        >
            <div className="flex items-center min-w-0 flex-1">
                <ProfileAvatar tx={profile?.pfp} className="w-10 h-10 shrink-0 p-0" />
                <span className={cn(
                    "ml-2 text-sm font-medium truncate transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                )}>
                    {displayName}
                </span>
            </div>
        </div>
    );
}

interface CategorySectionProps {
    category: ICategory;
    channels: IChannel[];
    activeChannelId: string;
    onChannelClick: (channelId: string) => void;
}

function CategorySection({ category, channels, activeChannelId, onChannelClick }: CategorySectionProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className="mb-2">
            <div
                className="group flex items-center px-2 py-1 hover:text-foreground cursor-pointer transition-colors"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <span className="text-xs font-semibold ml-1 text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
                    {category.name}
                </span>
                {isCollapsed ? (
                    <ChevronRight className="w-3 h-3 ml-1 text-muted-foreground group-hover:text-foreground transition-colors" />
                ) : (
                    <ChevronDown className="w-3 h-3 ml-1 text-muted-foreground group-hover:text-foreground transition-colors" />
                )}
            </div>
            {!isCollapsed && (
                <div className="mt-1">
                    {channels.map((channel) => (
                        <ChannelItem
                            key={channel.id}
                            channel={channel}
                            isActive={activeChannelId === channel.id}
                            onClick={() => onChannelClick(channel.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function Channels() {
    const { activeServerId, activeChannelId, activeFriendId, actions: globalStateActions } = useGlobalState();
    const { address } = useWallet();
    const channels = useChannels(activeServerId);
    const categories = useCategories(activeServerId);
    const activeServer = useServer(activeServerId);
    const currentMember = useMember(activeServerId, address);
    const subspaceActions = useSubspaceActions();
    const currentUserProfile = useProfile(address);
    const allRecentDms = useRecentDms();
    const recentDms = currentUserProfile?.dm_process ? allRecentDms[currentUserProfile.dm_process] || {} : {};
    const navigate = useNavigate();

    // Dialog states
    const [isCreateChannelDialogOpen, setIsCreateChannelDialogOpen] = useState(false);
    const [isCreateCategoryDialogOpen, setIsCreateCategoryDialogOpen] = useState(false);
    const [isLeaveServerDialogOpen, setIsLeaveServerDialogOpen] = useState(false);
    const [channelName, setChannelName] = useState("");
    const [categoryName, setCategoryName] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("none");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChannelClick = (channelId: string) => {
        navigate(`/app/${activeServerId}/${channelId}`);
    };

    const handleDmClick = (friendId: string) => {
        navigate(`/app/dm/${friendId}`);
    };

    const handleCopyInvite = () => {
        // TODO: Implement invite generation and copying
        navigator.clipboard.writeText(`${window.location.origin}/#/invite/${activeServerId}`);
        // Could add a toast notification here
        toast.success("Invite copied", {});
        const copyIcon = document.getElementById("copy-invite-icon");
        const tickIcon = document.getElementById("tick-icon");
        copyIcon.style.display = "none";
        tickIcon.style.display = "block";
        setTimeout(() => {
            copyIcon.style.display = "block";
            tickIcon.style.display = "none";
        }, 2000);
    };

    const handleServerSettings = () => {
        // TODO: Open server settings modal/page
        // console.log("Open server settings");
        navigate(`/app/${activeServerId}/settings`);
    };

    const handleLeaveServer = () => {
        setIsLeaveServerDialogOpen(true);
    };

    const handleConfirmLeaveServer = async () => {
        if (!activeServerId) return;

        setIsLoading(true);
        try {
            clearTimeout(window.fetchMessageTimeout)
            const success = await subspaceActions.servers.leave(activeServerId);
            subspaceActions.profiles.get(address);
            if (success) {
                toast.success("Left server successfully");
                setIsLeaveServerDialogOpen(false);
                // Navigate back to home since the server is no longer available
                navigate("/app");
            } else {

            }
        } catch (error) {
            console.error("Error leaving server:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateChannel = () => {
        setIsCreateChannelDialogOpen(true);
        setError(null);
    };

    const handleCreateCategory = () => {
        setIsCreateCategoryDialogOpen(true);
        setError(null);
    };

    const handleCreateChannelSubmit = async () => {
        if (!activeServerId || !channelName.trim()) return;

        setIsLoading(true);
        setError(null);

        try {
            const result = await subspaceActions.servers.createChannel({
                serverId: activeServerId,
                channelName: channelName.trim(),
                categoryId: selectedCategoryId === "none" ? undefined : selectedCategoryId,
                channelOrder: Object.keys(channels || {}).length,
                allowMessaging: 1,
                allowAttachments: 1
            });

            if (result) {
                console.log("Channel created successfully:", result);
                await subspaceActions.servers.get(activeServerId);
                setIsCreateChannelDialogOpen(false);
                setChannelName("");
                setSelectedCategoryId("none");
            } else {
                setError("Failed to create channel. Please try again.");
            }
        } catch (error) {
            console.error("Error creating channel:", error);
            setError("An error occurred while creating the channel. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateCategorySubmit = async () => {
        if (!activeServerId || !categoryName.trim()) return;

        setIsLoading(true);
        setError(null);

        try {
            const result = await subspaceActions.servers.createCategory({
                serverId: activeServerId,
                categoryName: categoryName.trim(),
                categoryOrder: Object.keys(categories || {}).length
            });

            if (result) {
                console.log("Category created successfully:", result);
                await subspaceActions.servers.get(activeServerId);
                setIsCreateCategoryDialogOpen(false);
                setCategoryName("");
            } else {
                setError("Failed to create category. Please try again.");
            }
        } catch (error) {
            console.error("Error creating category:", error);
            setError("An error occurred while creating the category. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const resetChannelForm = () => {
        setChannelName("");
        setSelectedCategoryId("none");
        setError(null);
    };

    const resetCategoryForm = () => {
        setCategoryName("");
        setError(null);
    };

    // Permission checks
    const canManageChannels = activeServer && currentMember ?
        Permissions.memberHasAny(currentMember, activeServer, [
            EPermissions.MANAGE_CHANNELS,
            EPermissions.MANAGE_SERVER,
            EPermissions.ADMINISTRATOR
        ]) : false;

    const canManageServer = activeServer && currentMember ?
        Permissions.memberHasAny(currentMember, activeServer, [
            EPermissions.MANAGE_SERVER,
            EPermissions.ADMINISTRATOR
        ]) : false;

    const canViewMembers = activeServer && currentMember ?
        Permissions.memberHasAny(currentMember, activeServer, [
            EPermissions.MANAGE_MEMBERS,
            EPermissions.KICK_MEMBERS,
            EPermissions.BAN_MEMBERS,
            EPermissions.MANAGE_SERVER,
            EPermissions.ADMINISTRATOR
        ]) : false;

    // If no server is active, show DMs
    if (!activeServerId || activeServerId === "") {
        return (
            <div className="flex flex-col h-full">
                {/* Friends header */}
                <Link to="/app" className="w-full p-2">
                    <Button variant="ghost" className={cn(
                        "flex items-center justify-start px-4 py-3 w-full transition-colors",
                        activeFriendId ? "bg-transparent hover:bg-muted/50" : "bg-secondary"
                    )}>
                        <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="text-sm font-semibold text-foreground">Friends</span>
                    </Button>
                </Link>

                {/* DM Header */}
                <div className="flex items-center justify-start px-4 py-1 pb-3 border-border/50">
                    <MessageSquare className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">Direct Messages</span>
                </div>

                {/* DM List */}
                <div className="flex-1 overflow-y-auto py-2 border-t">
                    {Object.keys(recentDms).length > 0 ? (
                        <div className="space-y-1">
                            {Object.entries(recentDms)
                                .filter(([friendId]) => friendId !== address) // Filter out user's own ID
                                .sort(([, a], [, b]) => b - a) // Sort by timestamp descending
                                .map(([friendId, timestamp]) => (
                                    <DmItem
                                        key={friendId}
                                        friendId={friendId}
                                        isActive={activeFriendId === friendId}
                                        onClick={() => handleDmClick(friendId)}
                                    />
                                ))}
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground px-4 py-2">
                            No direct messages yet. DM functionality will be available soon.
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // If no channels data is available yet
    if (!channels) {
        return (
            <div className="flex flex-col h-full">
                <div className="flex items-center px-4 py-3 border-b border-border/50">
                    <div className="text-sm text-muted-foreground">
                        Loading channels...
                    </div>
                </div>
            </div>
        );
    }

    // Organize channels by category
    const channelsList = Object.values(channels);
    const categoriesList = categories ? Object.values(categories) : [];

    // Sort categories by order
    const sortedCategories = categoriesList.sort((a, b) => a.order - b.order);

    // Group channels by category
    const channelsByCategory: Record<string, IChannel[]> = {};
    const uncategorizedChannels: IChannel[] = [];

    channelsList.forEach((channel) => {
        if (channel.category_id) {
            if (!channelsByCategory[channel.category_id]) {
                channelsByCategory[channel.category_id] = [];
            }
            channelsByCategory[channel.category_id].push(channel);
        } else {
            uncategorizedChannels.push(channel);
        }
    });

    // Sort channels within each category by order
    Object.keys(channelsByCategory).forEach((categoryId) => {
        channelsByCategory[categoryId].sort((a, b) => a.order - b.order);
    });
    uncategorizedChannels.sort((a, b) => a.order - b.order);

    return (
        <div className="flex flex-col h-full">
            {/* Server Header */}
            <div className="border-b border-border/50 shadow-sm">
                <Popover>
                    <PopoverTrigger className="w-full">
                        <div className="flex items-center justify-between px-4 py-4 hover:bg-muted/50 cursor-pointer transition-colors group">
                            <span className="text-sm font-semibold text-foreground truncate font-ocr capitalize">
                                {activeServer?.profile.name || "Loading..."}
                            </span>
                            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                    </PopoverTrigger>
                    <PopoverContent sideOffset={0} className="rounded-t-none w-74 overflow-clip p-1">
                        <div className="flex flex-col gap-1">
                            <Button
                                variant="ghost"
                                className="h-auto p-2 justify-start text-left hover:bg-accent/50 w-full"
                                onClick={handleCopyInvite}
                            >
                                <div className="flex items-center gap-4 w-full min-w-0">
                                    <div id="copy-invite-icon" className="p-2 rounded-md flex-shrink-0 bg-blue-500/10 text-blue-500">
                                        <Copy size={14} />
                                    </div>
                                    <div id="tick-icon" style={{ display: "none" }} className="p-2 rounded-md flex-shrink-0 bg-blue-500/10 text-blue-500">
                                        <Check size={14} />
                                    </div>
                                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                                        <div className="font-medium text-sm truncate">Copy Invite</div>
                                    </div>
                                </div>
                            </Button>

                            {canManageChannels && (
                                <>
                                    <div className="discord-separator" />

                                    <Button
                                        variant="ghost"
                                        className="h-auto p-2 justify-start text-left hover:bg-accent/50 w-full"
                                        onClick={handleCreateChannel}
                                    >
                                        <div className="flex items-center gap-4 w-full min-w-0">
                                            <div className="p-2 rounded-md flex-shrink-0 bg-green-500/10 text-green-500">
                                                <Plus size={14} />
                                            </div>
                                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                                                <div className="font-medium text-sm truncate">Create Channel</div>
                                            </div>
                                        </div>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="h-auto p-2 justify-start text-left hover:bg-accent/50 w-full"
                                        onClick={handleCreateCategory}
                                    >
                                        <div className="flex items-center gap-4 w-full min-w-0">
                                            <div className="p-2 rounded-md flex-shrink-0 bg-green-500/10 text-green-500">
                                                <FolderPlus size={16} />
                                            </div>
                                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                                                <div className="font-medium text-sm truncate">Create Category</div>
                                            </div>
                                        </div>
                                    </Button>
                                </>
                            )}

                            {(canManageServer) && (
                                <>
                                    <div className="discord-separator" />

                                    {canManageServer && (
                                        <Button
                                            variant="ghost"
                                            className="h-auto p-2 justify-start text-left hover:bg-accent/50 w-full"
                                            onClick={handleServerSettings}
                                        >
                                            <div className="flex items-center gap-4 w-full min-w-0">
                                                <div className="p-2 rounded-md flex-shrink-0 bg-gray-500/10 text-gray-400">
                                                    <Settings size={14} />
                                                </div>
                                                <div className="flex flex-col gap-1 min-w-0 flex-1">
                                                    <div className="font-medium text-sm truncate">Server Settings</div>
                                                </div>
                                            </div>
                                        </Button>
                                    )}
                                </>
                            )}

                            <div className="discord-separator" />

                            <Button
                                variant="ghost"
                                className="h-auto p-2 justify-start text-left hover:bg-accent/50 w-full"
                                onClick={handleLeaveServer}
                            >
                                <div className="flex items-center gap-4 w-full min-w-0">
                                    <div className="p-2 rounded-md flex-shrink-0 bg-red-500/10 text-red-400">
                                        <LogOut size={14} />
                                    </div>
                                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                                        <div className="font-medium text-sm truncate">Leave Server</div>
                                    </div>
                                </div>
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Channels List */}
            <div className="flex-1 overflow-y-auto py-2">
                {/* Uncategorized channels first */}
                {uncategorizedChannels.length > 0 && (
                    <div className="mb-2">
                        {uncategorizedChannels.map((channel) => (
                            <ChannelItem
                                key={channel.id}
                                channel={channel}
                                isActive={activeChannelId === channel.id}
                                onClick={() => handleChannelClick(channel.id)}
                            />
                        ))}
                    </div>
                )}

                {/* Categorized channels */}
                {sortedCategories.map((category) => {
                    const categoryChannels = channelsByCategory[category.id] || [];
                    if (categoryChannels.length === 0) return null;

                    return (
                        <CategorySection
                            key={category.id}
                            category={category}
                            channels={categoryChannels}
                            activeChannelId={activeChannelId}
                            onChannelClick={handleChannelClick}
                        />
                    );
                })}
            </div>

            {/* Create Channel Dialog */}
            <Dialog open={isCreateChannelDialogOpen} onOpenChange={(open) => {
                if (open) {
                    setIsCreateChannelDialogOpen(true);
                } else {
                    setIsCreateChannelDialogOpen(false);
                    resetChannelForm();
                }
            }}>
                <DialogContent className="sm:max-w-md bg-background">
                    <DialogHeader className="text-center">
                        <DialogTitle className="text-2xl font-bold">Create Channel</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Create a new channel for your server
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Error Display */}
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {/* Channel Name */}
                        <div className="space-y-2">
                            <Label htmlFor="channel-name" className="text-sm font-semibold text-foreground">
                                Channel Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="channel-name"
                                placeholder="general"
                                value={channelName}
                                onChange={(e) => setChannelName(e.target.value)}
                                className="bg-background border-input"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Category Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="category-select" className="text-sm font-semibold text-foreground">
                                Category (Optional)
                            </Label>
                            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId} disabled={isLoading}>
                                <SelectTrigger className="bg-background border-input">
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Category</SelectItem>
                                    {categories && Object.values(categories).map((category) => (
                                        <SelectItem key={category.id} value={category.id}>
                                            {category.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="flex-row justify-between items-center pt-4">
                        <div></div>
                        <div>
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setIsCreateChannelDialogOpen(false);
                                    resetChannelForm();
                                }}
                                className="text-muted-foreground hover:text-foreground"
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateChannelSubmit}
                                disabled={!channelName.trim() || isLoading}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
                            >
                                {isLoading ? "Creating..." : "Create Channel"}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Category Dialog */}
            <Dialog open={isCreateCategoryDialogOpen} onOpenChange={(open) => {
                if (open) {
                    setIsCreateCategoryDialogOpen(true);
                } else {
                    setIsCreateCategoryDialogOpen(false);
                    resetCategoryForm();
                }
            }}>
                <DialogContent className="sm:max-w-md bg-background">
                    <DialogHeader className="text-center">
                        <DialogTitle className="text-2xl font-bold">Create Category</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Create a new category to organize your channels
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Error Display */}
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {/* Category Name */}
                        <div className="space-y-2">
                            <Label htmlFor="category-name" className="text-sm font-semibold text-foreground">
                                Category Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="category-name"
                                placeholder="General"
                                value={categoryName}
                                onChange={(e) => setCategoryName(e.target.value)}
                                className="bg-background border-input"
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex-row justify-between items-center pt-4">
                        <div></div>
                        <div>
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setIsCreateCategoryDialogOpen(false);
                                    resetCategoryForm();
                                }}
                                className="text-muted-foreground hover:text-foreground"
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateCategorySubmit}
                                disabled={!categoryName.trim() || isLoading}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
                            >
                                {isLoading ? "Creating..." : "Create Category"}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Leave Server Confirmation Dialog */}
            <AlertDialog open={isLeaveServerDialogOpen} onOpenChange={setIsLeaveServerDialogOpen}>
                <AlertDialogContent className="bg-background">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold">Leave Server</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                            Are you sure you want to leave <span className="font-semibold text-foreground">{activeServer?.profile.name}</span>?
                            You will need to be re-invited to rejoin this server.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
                        <Button
                            onClick={handleConfirmLeaveServer}
                            disabled={isLoading}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isLoading ? "Leaving..." : "Leave Server"}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}