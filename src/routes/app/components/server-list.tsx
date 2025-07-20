import { Button } from "@/components/ui/button";
import { cn, uploadFileTurbo } from "@/lib/utils";
import {
    Home,
    Plus,
    Download,
    WalletCards,
    Loader2,
    Users
} from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { toast } from "sonner";

import type { Server } from "@subspace-protocol/sdk";
import { useSubspace } from "@/hooks/use-subspace";
import { useGlobalState } from "@/hooks/use-global-state";
import { useNavigate } from "react-router";

import alien from "@/assets/subspace/alien-black.svg"
import alienGreen from "@/assets/subspace/alien-green.svg"

import { Constants } from "@/lib/constants";

interface ServerButtonProps {
    server: Server;
    isActive?: boolean;
    onClick?: () => void;
    isUpdating?: boolean;
    unreadCount?: number;
}

interface HomeButtonProps {
    isActive?: boolean;
    onClick?: () => void;
    unreadCount?: number;
}

interface AddServerButtonProps {
    onServerJoined?: (data: any) => void;
}

// Server Button Component
const ServerButton = ({ server, isActive = false, onClick, isUpdating = false, unreadCount = 0 }: ServerButtonProps) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div className="relative group mb-3">
            {/* Glow effect for active state */}
            {isActive && (
                <div className="absolute inset-0 bg-primary/30 rounded-2xl blur-xl scale-110 animate-pulse" />
            )}

            {/* Active/Hover indicator pill with glow */}
            <div
                className={cn(
                    "absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 rounded-r-full transition-all duration-300 ease-out",
                    isActive
                        ? "h-10 bg-gradient-to-b from-primary via-primary to-primary/80 shadow-lg shadow-primary/50"
                        : isHovered
                            ? "h-6 bg-gradient-to-b from-foreground/80 to-foreground/60 shadow-md shadow-foreground/30"
                            : "h-0"
                )}
            />

            <div className="flex justify-center relative">
                <div
                    className={cn(
                        "w-12 h-12 p-0 transition-all duration-300 ease-out group relative cursor-pointer",
                        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-background/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
                        isActive ? "rounded-2xl shadow-lg shadow-primary/20" : "rounded-3xl hover:rounded-2xl hover:shadow-md hover:shadow-foreground/10",
                        "hover:bg-muted/50"
                    )}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onClick={onClick}
                >
                    <div className={cn(
                        "w-12 h-12 overflow-hidden transition-all duration-300 ease-out relative pointer-events-none",
                        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:via-transparent before:to-transparent before:opacity-0 group-hover:before:opacity-100 before:transition-opacity before:duration-300",
                        isActive ? "rounded-2xl" : "rounded-xl group-hover:rounded-2xl"
                    )}>
                        <img
                            src={`https://arweave.net/${server.logo || Constants.Icons.DefaultServerIcon}`}
                            alt={server.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 pointer-events-none"
                            draggable={false}
                        />
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out pointer-events-none" />
                    </div>
                </div>

                {/* Unread count badge */}
                {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 z-10 pointer-events-none">
                        <div className={cn(
                            "flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[10px] font-semibold text-white rounded-full aspect-square",
                            "bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/30",
                            "border border-background/20 backdrop-blur-sm",
                            "transition-all duration-200 ease-out",
                            "animate-in zoom-in-50 duration-300"
                        )}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </div>
                    </div>
                )}

                {/* Loading indicator */}
                {isUpdating && (
                    <div className="absolute -bottom-1 -right-1 z-10 pointer-events-none">
                        <div className={cn(
                            "flex items-center justify-center w-[18px] h-[18px] rounded-full",
                            "bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/30",
                            "border border-background/20 backdrop-blur-sm"
                        )}>
                            <Loader2 className="h-3 w-3 animate-spin text-primary-foreground" />
                        </div>
                    </div>
                )}

                {/* Tooltip */}
                <div className={cn(
                    "absolute left-full ml-4 top-1/2 -translate-y-1/2 transition-all duration-200 pointer-events-none z-[100]",
                    isHovered ? "opacity-100 visible translate-x-0" : "opacity-0 invisible -translate-x-2"
                )}>
                    <div className="bg-popover text-popover-foreground text-sm px-3 py-2 rounded-lg shadow-xl border border-border whitespace-nowrap">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-primary rounded-full" />
                            <span className="font-medium">{server.name}</span>
                            {unreadCount > 0 && (
                                <div className="flex items-center gap-1 ml-2 px-1.5 py-0.5 bg-red-500/10 text-red-600 rounded text-xs">
                                    <span>{unreadCount}</span>
                                    <span className="text-red-500/70">mention{unreadCount !== 1 ? 's' : ''}</span>
                                </div>
                            )}
                            {isUpdating && (
                                <div className="flex items-center gap-1 ml-2 px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs">
                                    <Loader2 className="w-2 h-2 animate-spin" />
                                    <span>Updating...</span>
                                </div>
                            )}
                        </div>
                        <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-l-[8px] border-transparent border-l-popover" />
                    </div>
                </div>
            </div>
        </div>
    );
};

// Home Button Component
const HomeButton = ({ isActive = false, onClick, unreadCount = 0 }: HomeButtonProps) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div className="relative group mb-3">
            {/* Glow effect for active state */}
            {isActive && (
                <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl scale-110 animate-pulse" />
            )}

            {/* Active/Hover indicator pill with glow */}
            <div
                className={cn(
                    "absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 rounded-r-full transition-all duration-300 ease-out",
                    isActive
                        ? "h-10 bg-gradient-to-b from-primary via-primary to-primary/80 shadow-lg shadow-primary/50"
                        : isHovered
                            ? "h-6 bg-gradient-to-b from-foreground/80 to-foreground/60 shadow-md shadow-foreground/30"
                            : "h-0"
                )}
            />

            <div className="flex justify-center relative">
                <div
                    className={cn(
                        "w-12 h-12 p-0 transition-all duration-300 ease-out group relative overflow-hidden cursor-pointer rounded-2xl",
                        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
                        isActive
                            ? "bg-gradient-to-br from-primary via-primary to-primary/90 shadow-lg shadow-primary/40"
                            : "bg-gradient-to-br from-primary/20 to-primary/10 hover:from-primary hover:to-primary/90 hover:shadow-lg hover:shadow-primary/30",
                        "border border-primary/20 hover:border-primary/40"
                    )}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onClick={onClick}
                >
                    <div className={cn(
                        "w-12 h-12 flex items-center justify-center transition-all duration-300 ease-out relative pointer-events-none",
                        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:via-transparent before:to-transparent before:opacity-0 group-hover:before:opacity-100 before:transition-opacity before:duration-300",
                    )}>
                        <img
                            src={alienGreen}
                            alt="Home"
                            className={cn(
                                "w-8 h-8 object-cover transition-all duration-300 pointer-events-none",
                                isActive
                                    ? "filter brightness-0 scale-100 drop-shadow-sm"
                                    : "filter brightness-100 group-hover:brightness-0 group-hover:scale-110 group-hover:drop-shadow-sm"
                            )}
                            draggable={false}
                        />
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out pointer-events-none" />

                        {/* Glow effect for active state */}
                        {isActive && (
                            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-md scale-110 animate-pulse pointer-events-none" />
                        )}
                    </div>
                </div>

                {/* Unread count badge */}
                {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 z-10">
                        <div className={cn(
                            "flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[10px] font-semibold text-white rounded-full",
                            "bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/30",
                            "border border-background/20 backdrop-blur-sm",
                            "transition-all duration-200 ease-out",
                            "animate-in zoom-in-50 duration-300"
                        )}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </div>
                    </div>
                )}

                {/* Tooltip */}
                <div className={cn(
                    "absolute left-full ml-4 top-1/2 -translate-y-1/2 transition-all duration-200 pointer-events-none z-[100]",
                    isHovered ? "opacity-100 visible translate-x-0" : "opacity-0 invisible -translate-x-2"
                )}>
                    <div className="bg-popover text-popover-foreground text-sm px-3 py-2 rounded-lg shadow-xl border border-border whitespace-nowrap">
                        <div className="flex items-center gap-2">
                            <Home className="w-3 h-3 text-primary" />
                            <span className="font-medium">Home</span>
                            {unreadCount > 0 && (
                                <div className="flex items-center gap-1 ml-2 px-1.5 py-0.5 bg-red-500/10 text-red-600 rounded text-xs">
                                    <span>{unreadCount}</span>
                                    <span className="text-red-500/70">mention{unreadCount !== 1 ? 's' : ''}</span>
                                </div>
                            )}
                        </div>
                        <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-l-[8px] border-transparent border-l-popover" />
                    </div>
                </div>
            </div>
        </div>
    );
};

// Add Server Button Component
const AddServerButton = ({ onServerJoined }: AddServerButtonProps) => {
    const [isHovered, setIsHovered] = useState(false);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [joinDialogOpen, setJoinDialogOpen] = useState(false);
    const [serverName, setServerName] = useState("");
    const [serverIcon, setServerIcon] = useState<File | null>(null);
    const [inviteCode, setInviteCode] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [isUploadingIcon, setIsUploadingIcon] = useState(false);
    const [creationStep, setCreationStep] = useState<string>("");
    const { actions } = useSubspace();

    const handleCreateServer = async () => {
        if (!serverName.trim()) return;

        setIsCreating(true);
        setCreationStep("Preparing...");

        try {
            // Upload server icon to Arweave or use default
            let logoUrl = "";

            if (serverIcon) {
                try {
                    setIsUploadingIcon(true);
                    setCreationStep("Uploading icon...");
                    // Upload the file to Arweave
                    logoUrl = await uploadFileTurbo(serverIcon);
                } catch (uploadError) {
                    console.warn("Failed to upload server icon, using default:", uploadError);
                    // Continue with default icon if upload fails
                } finally {
                    setIsUploadingIcon(false);
                }
            }

            setCreationStep("Creating server...");
            const server = await actions.servers.create({
                name: serverName.trim(),
                logo: logoUrl
            });

            setCreationStep("Server created successfully!");

            // Clear form and close dialog
            setServerName("");
            setServerIcon(null);
            setCreateDialogOpen(false);
            setPopoverOpen(false);

            // Notify parent component
            onServerJoined?.(server);
        } catch (error) {
            console.error("Failed to create server:", error);
            setCreationStep("Creation failed");
            // TODO: Add toast notification for error
        } finally {
            setIsCreating(false);
            setCreationStep("");
        }
    };

    const handleJoinServer = async () => {
        if (!inviteCode.trim()) return;

        setIsJoining(true);
        try {
            // Parse the invite code/link to extract the server ID
            const serverId = parseInviteCode(inviteCode.trim());

            if (!serverId) {
                console.error("Invalid invite code or link");
                toast.error("Invalid invite code or link", {
                    description: "Please provide a valid server ID or invite link",
                    duration: 4000
                });
                return;
            }

            // Use the new joinServer method from the useSubspace hook
            const success = await actions.servers.join(serverId);

            if (success) {
                toast.success("Successfully joined server!", {
                    description: "You can now access the server from the sidebar",
                    duration: 4000
                });

                // Clear form and close dialogs
                setInviteCode("");
                setJoinDialogOpen(false);
                setPopoverOpen(false);

                // Notify parent component
                onServerJoined?.({ serverId, serverName: serverId.substring(0, 8) + "...", memberCount: 0 });
            } else {
                console.error("Failed to join server");
                toast.error("Failed to join server", {
                    description: "The server may not exist or you may already be a member",
                    duration: 4000
                });
            }
        } catch (error) {
            console.error("Failed to join server:", error);
            toast.error("Failed to join server", {
                description: error instanceof Error ? error.message : "An unexpected error occurred",
                duration: 4000
            });
        } finally {
            setIsJoining(false);
        }
    };

    // Helper function to parse invite codes/links
    const parseInviteCode = (input: string): string | null => {
        // Remove any whitespace
        const trimmed = input.trim();

        // If it's a direct server ID (43 characters for Arweave transaction ID)
        if (trimmed.length === 43 && /^[a-zA-Z0-9_-]+$/.test(trimmed)) {
            return trimmed;
        }

        // If it's a URL, try to extract the server ID from various formats
        // Format: subspace.ar.io/#/invite/SERVER_ID
        // Format: https://subspace.ar.io/#/invite/SERVER_ID
        // Format: /invite/SERVER_ID
        const inviteMatch = trimmed.match(/(?:.*[/#])?invite[/#]([a-zA-Z0-9_-]{43})/);
        if (inviteMatch) {
            return inviteMatch[1];
        }

        // If it's a server ID with extra characters, try to extract it
        const serverIdMatch = trimmed.match(/[a-zA-Z0-9_-]{43}/);
        if (serverIdMatch) {
            return serverIdMatch[0];
        }

        return null;
    };

    return (
        <div className="relative group mb-3">
            {/* Hover indicator pill */}
            <div
                className={cn(
                    "absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 rounded-r-full transition-all duration-300 ease-out",
                    isHovered
                        ? "h-6 bg-gradient-to-b from-green-500/80 to-green-400/60 shadow-md shadow-green-500/30"
                        : "h-0"
                )}
            />

            <div className="flex justify-center relative">
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            size="icon"
                            variant="ghost"
                            className={cn(
                                "w-12 h-12 p-0 transition-all duration-300 ease-out hover:bg-transparent group relative overflow-hidden",
                                "before:absolute before:inset-0 before:bg-gradient-to-br before:from-background/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
                                "rounded-3xl hover:rounded-2xl bg-muted/30 hover:bg-gradient-to-br hover:from-green-500 hover:to-green-400 hover:shadow-md hover:shadow-green-500/20",
                                "border-2 border-dashed border-muted-foreground/30 hover:border-green-400/50"
                            )}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                        >
                            <Plus className={cn(
                                "w-5 h-5 transition-all duration-300",
                                "text-muted-foreground group-hover:text-white group-hover:scale-110 group-hover:rotate-90"
                            )} />
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent side="right" className="w-72 p-0 shadow-xl border-border/50">
                        <div className="relative overflow-hidden rounded-lg">
                            <div className="px-4 py-3 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 border-b border-border/50">
                                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                    <Plus className="w-4 h-4 text-primary" />
                                    Server Actions
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">Join an existing server or create your own</p>
                            </div>

                            <div className="p-2 space-y-2">
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "w-full h-12 p-2.5 justify-start text-left transition-all duration-200 group relative overflow-hidden",
                                        "hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-blue-400/5",
                                        "border border-border/30 hover:border-blue-400/30",
                                        "before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-500/5 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300"
                                    )}
                                    onClick={() => setJoinDialogOpen(true)}
                                >
                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                                            <Users className="w-4 h-4 text-blue-500" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-sm text-foreground">Join Server</div>
                                            <div className="text-xs text-muted-foreground">Connect to an existing community</div>
                                        </div>
                                    </div>
                                </Button>

                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "w-full h-12 p-2.5 justify-start text-left transition-all duration-200 group relative overflow-hidden",
                                        "hover:bg-gradient-to-r hover:from-green-500/10 hover:to-green-400/5",
                                        "border border-border/30 hover:border-green-400/30",
                                        "before:absolute before:inset-0 before:bg-gradient-to-r before:from-green-500/5 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300"
                                    )}
                                    onClick={() => setCreateDialogOpen(true)}
                                >
                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                                            <Plus className="w-4 h-4 text-green-500" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-sm text-foreground">Create Server</div>
                                            <div className="text-xs text-muted-foreground">Start your own community</div>
                                        </div>
                                    </div>
                                </Button>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Tooltip */}
                <div className={cn(
                    "absolute left-full ml-4 top-1/2 -translate-y-1/2 transition-all duration-200 pointer-events-none z-[100]",
                    isHovered ? "opacity-100 visible translate-x-0" : "opacity-0 invisible -translate-x-2"
                )}>
                    <div className="bg-popover text-popover-foreground text-sm px-3 py-2 rounded-lg shadow-xl border border-border whitespace-nowrap">
                        <div className="flex items-center gap-2">
                            <Plus className="w-3 h-3 text-green-500" />
                            <span className="font-medium">Add Server</span>
                        </div>
                        <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-l-[8px] border-transparent border-l-popover" />
                    </div>
                </div>
            </div>

            {/* Create Server Dialog */}
            <AlertDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <AlertDialogContent className="max-w-lg w-[95vw] sm:w-full p-0 max-h-[90vh] overflow-hidden flex flex-col">
                    <AlertDialogHeader className="relative px-4 sm:px-6 pt-6 pb-4">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-green-500/5 rounded-t-lg" />
                        <AlertDialogTitle className="text-xl font-bold flex items-center gap-3 relative">
                            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                                <Plus className="w-5 h-5 text-green-500" />
                            </div>
                            <div>
                                <div>Create Server</div>
                                <div className="text-sm font-normal text-muted-foreground mt-1">
                                    Start your own community
                                </div>
                            </div>
                        </AlertDialogTitle>
                    </AlertDialogHeader>

                    <AlertDialogDescription asChild>
                        <div className="px-4 sm:px-6 space-y-6 mt-4 overflow-y-auto max-h-[60vh]">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="w-full sm:w-1/3">
                                    <FileDropzone
                                        onFileChange={setServerIcon}
                                        label="Server Icon"
                                        placeholder="Upload icon"
                                        accept={{ 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] }}
                                        previewType="square"
                                    />
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">
                                            Server Name *
                                        </label>
                                        <Input
                                            type="text"
                                            placeholder="My Awesome Server"
                                            value={serverName}
                                            onChange={(e) => setServerName(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Info note */}
                            <div className="px-4 py-3 mt-4 bg-muted/30 rounded-lg border border-border/30">
                                <div className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                                    <p className="text-xs text-muted-foreground">
                                        Server creation may take 30-60 seconds as we initialize your server on the permaweb.
                                        Please be patient during this process.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </AlertDialogDescription>

                    <AlertDialogFooter className="px-4 sm:px-6 pb-6 pt-4 gap-3">
                        <AlertDialogCancel disabled={isCreating || isUploadingIcon}>Cancel</AlertDialogCancel>
                        <Button
                            onClick={handleCreateServer}
                            disabled={!serverName.trim() || isCreating || isUploadingIcon}
                            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                        >
                            {(isCreating || isUploadingIcon) ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {creationStep || "Creating..."}
                                </>
                            ) : (
                                "Create Server"
                            )}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Join Server Dialog */}
            <AlertDialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
                <AlertDialogContent className="max-w-lg w-[95vw] sm:w-full p-0">
                    <AlertDialogHeader className="relative px-4 sm:px-6 pt-6 pb-4">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-blue-500/5 rounded-t-lg" />
                        <AlertDialogTitle className="text-xl font-bold flex items-center gap-3 relative">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <div>Join Server</div>
                                <div className="text-sm font-normal text-muted-foreground mt-1">
                                    Connect to an existing community
                                </div>
                            </div>
                        </AlertDialogTitle>
                    </AlertDialogHeader>

                    <AlertDialogDescription asChild>
                        <div className="px-4 sm:px-6 space-y-4 mt-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">
                                    Invite Code or Link
                                </label>
                                <Input
                                    type="text"
                                    placeholder="wLedDuEphwwvxLS-ftFb4mcXhqu4jwkYtIM4txCx2V8"
                                    value={inviteCode}
                                    onChange={(e) => setInviteCode(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Enter a server ID or invite link. Examples:
                                </p>
                                <div className="text-xs text-muted-foreground space-y-1">
                                    <div>• Server ID: <code className="bg-muted px-1 rounded">wLedDuEphwwvxLS-ftFb4mcXhqu4jwkYtIM4txCx2V8</code></div>
                                    <div>• Invite link: <code className="bg-muted px-1 rounded">subspace.ar.io/#/invite/wLedDuEphwwvxLS-ftFb4mcXhqu4jwkYtIM4txCx2V8</code></div>
                                </div>
                            </div>
                        </div>
                    </AlertDialogDescription>

                    <AlertDialogFooter className="px-4 sm:px-6 pb-6 pt-4 gap-3">
                        <AlertDialogCancel disabled={isJoining}>Cancel</AlertDialogCancel>
                        <Button
                            onClick={handleJoinServer}
                            disabled={!inviteCode.trim() || isJoining}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                        >
                            {isJoining ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Joining...
                                </>
                            ) : (
                                "Join Server"
                            )}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

// Install PWA Button Component
const InstallPWAButton = () => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div className="relative group mb-3">
            <div
                className={cn(
                    "absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 rounded-r-full transition-all duration-300 ease-out",
                    isHovered
                        ? "h-6 bg-gradient-to-b from-primary/80 to-primary/60 shadow-md shadow-primary/30"
                        : "h-0"
                )}
            />

            <div className="flex justify-center relative">
                <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                        "w-12 h-12 p-0 transition-all duration-300 ease-out hover:bg-transparent group relative overflow-hidden",
                        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-background/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
                        "rounded-3xl hover:rounded-2xl bg-muted/30 hover:bg-gradient-to-br hover:from-primary hover:to-primary/80 hover:shadow-md hover:shadow-primary/20"
                    )}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <Download className={cn(
                        "w-5 h-5 transition-all duration-300",
                        "text-muted-foreground group-hover:text-primary-foreground group-hover:scale-110 group-hover:-translate-y-0.5"
                    )} />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
                </Button>

                {/* Tooltip */}
                <div className={cn(
                    "absolute left-full ml-4 top-1/2 -translate-y-1/2 transition-all duration-200 pointer-events-none z-[100]",
                    isHovered ? "opacity-100 visible translate-x-0" : "opacity-0 invisible -translate-x-2"
                )}>
                    <div className="bg-popover text-popover-foreground text-sm px-3 py-2 rounded-lg shadow-xl border border-border whitespace-nowrap">
                        <div className="flex items-center gap-2">
                            <Download className="w-3 h-3 text-primary" />
                            <span className="font-medium">Install App</span>
                        </div>
                        <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-l-[8px] border-transparent border-l-popover" />
                    </div>
                </div>
            </div>
        </div>
    );
};

// Wallet Button Component
const WalletButton = () => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div className="relative group mb-3">
            <div
                className={cn(
                    "absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 rounded-r-full transition-all duration-300 ease-out",
                    isHovered
                        ? "h-6 bg-gradient-to-b from-primary/80 to-primary/60 shadow-md shadow-primary/30"
                        : "h-0"
                )}
            />

            <div className="flex justify-center relative">
                <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                        "w-12 h-12 p-0 transition-all duration-300 ease-out hover:bg-transparent group relative overflow-hidden",
                        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-background/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
                        "rounded-3xl hover:rounded-2xl bg-muted/30 hover:bg-gradient-to-br hover:from-primary hover:to-primary/80 hover:shadow-md hover:shadow-primary/20"
                    )}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <WalletCards className={cn(
                        "w-5 h-5 transition-all duration-300",
                        "text-muted-foreground group-hover:text-primary-foreground group-hover:scale-110"
                    )} />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
                </Button>

                {/* Tooltip */}
                <div className={cn(
                    "absolute left-full ml-4 top-1/2 -translate-y-1/2 transition-all duration-200 pointer-events-none z-[100]",
                    isHovered ? "opacity-100 visible translate-x-0" : "opacity-0 invisible -translate-x-2"
                )}>
                    <div className="bg-popover text-popover-foreground text-sm px-3 py-2 rounded-lg shadow-xl border border-border whitespace-nowrap">
                        <div className="flex items-center gap-2">
                            <WalletCards className="w-3 h-3 text-primary" />
                            <span className="font-medium">Wallet</span>
                        </div>
                        <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-l-[8px] border-transparent border-l-popover" />
                    </div>
                </div>
            </div>
        </div>
    );
};

// Skeleton Loader Component
const ServerSkeleton = () => (
    <div className="relative group mb-3 animate-pulse">
        <div className="absolute inset-0 bg-muted/20 rounded-2xl blur-xl scale-110" />
        <div className="flex justify-center relative">
            <div className="w-12 h-12 p-0 rounded-3xl bg-muted/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-muted-foreground/10 to-transparent -translate-x-full animate-shimmer" />
                <div className="w-full h-full rounded-xl bg-muted/30 flex items-center justify-center">
                    <div className="w-6 h-6 bg-muted-foreground/20 rounded animate-pulse" />
                </div>
            </div>
        </div>
    </div>
);

export default function ServerList({ className }: { className?: string }) {
    const { profile, servers, actions } = useSubspace()
    const { activeServerId } = useGlobalState()
    const navigate = useNavigate()

    const displayServers = (profile?.serversJoined || [])
        .map(server => {
            // Handle both string and object server identifiers
            const serverId = typeof server === 'string' ? server : (server as any).serverId
            if (!serverId) return null

            // Try to get the full server instance first, then fall back to persisted data
            const serverInstance = servers[serverId]
            if (serverInstance) {
                return serverInstance
            }
            // If no instance, check if we have persisted data
            const persistedData = servers[serverId]
            if (persistedData) {
                return persistedData
            }
            return null
        })
        .filter(server => server !== null)

    function onServerJoined(data: any) {
        // Server was created and is already in the state
        // Navigate to the new server
        if (data?.serverId) {
            navigate(`/app/${data.serverId}`)
        }
    }

    return (
        <div
            className={cn(
                "flex flex-col h-full py-4 pb-2 px-3 relative !z-20",
                "bg-gradient-to-b from-background via-background/95 to-background/90",
                "border-r border-border/50 backdrop-blur-sm",
                "scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/40",
                "before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.02)_0%,transparent_50%)] before:pointer-events-none",
                className
            )}
        >
            {/* Ambient glow at top */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 bg-primary/5 rounded-full blur-2xl" />

            {/* Home Button */}
            <HomeButton
                isActive={!activeServerId}
                onClick={() => navigate("/app")}
                unreadCount={0}
            />

            {/* Separator */}
            <div className="relative mx-auto mb-0">
                <div className="w-8 h-[2px] bg-gradient-to-r from-transparent via-border to-transparent rounded-full" />
                <div className="absolute inset-0 w-8 h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent rounded-full blur-sm" />
            </div>

            {/* Server Buttons */}
            <div className="space-y-1 py-3">
                {displayServers.map((server, index) => (
                    <div
                        key={server.serverId}
                        style={{ animationDelay: `${index * 100}ms` }}
                        className="animate-in slide-in-from-left-5 fade-in duration-500"
                    >
                        <ServerButton
                            server={server}
                            isActive={server.serverId === activeServerId}
                            onClick={() => {
                                navigate(`/app/${server.serverId}`)
                            }}
                        // unreadCount={Math.floor(Math.random() * 5)} // Mock unread count
                        />
                    </div>
                ))}
            </div>

            {/* Add Server Button */}
            <AddServerButton onServerJoined={onServerJoined} />

            {/* Spacer */}
            <div className="grow" />

            {/* Wallet Button */}
            {/* {showWalletButton && <WalletButton />} */}

            {/* Install PWA Button */}
            <InstallPWAButton />

            {/* Version */}
            <div className="h-5 text-xs text-muted-foreground/40 mx-auto text-center">
                {/* @ts-ignore */}
                {__VERSION__}
            </div>
        </div>
    );
}