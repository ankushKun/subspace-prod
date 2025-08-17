/**
 * Server List Component
 * 
 * IMPROVED SERVER FETCHING LOGIC:
 * 1. INITIAL LOAD: Fetches all servers concurrently when app loads
 * 2. ACTIVE SERVER: Fetches specific server when it becomes active
 * 2.5. ACTIVE SERVER MEMBERS: Automatically fetches members when server becomes active
 * 3. HOME CLICK: Refetches all servers when home is clicked
 * 4. ALWAYS FRESH: Always fetches servers even if cached to get latest data
 * 5. FAST LOADING: Concurrent fetching for maximum speed and efficiency
 * 6. SILENT OPERATION: All operations happen in background without UI indicators
 * 7. ERROR HANDLING: Graceful handling of failed server loads
 * 8. SMART SKELETONS: Shows skeletons only for servers not in cache, decrements as they load
 * 9. CACHE-AWARE: Automatically detects cached vs uncached servers for accurate skeleton count
 * 10. MEMBER AUTO-FETCH: Automatically loads member lists when servers become active
 */

import { Button } from "@/components/ui/button";
import { cn, uploadFileTurbo } from "@/lib/utils";
import {
    Home,
    Plus,
    Download,
    WalletCards,
    Loader2,
    Users,
    AlertCircle
} from "lucide-react";
import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { FileDropzone } from "@/components/ui/file-dropzone";

import type { Server } from "@subspace-protocol/sdk";
import { ConnectionStrategies, useWallet } from "@/hooks/use-wallet";
import { useSubspace } from "@/hooks/use-subspace";
import { useGlobalState } from "@/hooks/use-global-state";
import { useNavigate } from "react-router";
import { usePWA } from "@/hooks/use-pwa";
import { Constants } from "@/lib/constants";
import { useSessionStorage } from "usehooks-ts";
import alien from "@/assets/subspace/alien-black.svg"
import alienGreen from "@/assets/subspace/alien-green.svg"

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

interface JoinServerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
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
                        "w-12 h-12 overflow-hidden transition-all duration-300 ease-out relative border pointer-events-none",
                        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:via-transparent before:to-transparent before:opacity-0 group-hover:before:opacity-100 before:transition-opacity before:duration-300",
                        isActive ? "rounded-2xl" : "rounded-xl group-hover:rounded-2xl",
                        server.logo ? "" : "border-primary/30 bg-primary/20"
                    )}>
                        <img
                            src={`https://arweave.net/${server.logo || Constants.Icons.DefaultServerIcon}`}
                            alt={server.name}
                            className={cn("w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 pointer-events-none", server.logo ? "" : "opacity-60")}
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
const AddServerButton = ({ onServerJoined }: { onServerJoined?: (data: any) => void }) => {
    const [isHovered, setIsHovered] = useState(false)
    const [popoverOpen, setPopoverOpen] = useState(false)
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [joinDialogOpen, setJoinDialogOpen] = useState(false)
    const [serverName, setServerName] = useState("")
    const [serverIcon, setServerIcon] = useState<File | null>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [isUploadingIcon, setIsUploadingIcon] = useState(false)
    const [creationStep, setCreationStep] = useState<string>("")
    const { connected } = useWallet()
    const { actions } = useSubspace()

    const handleCreateServer = async () => {
        if (!serverName.trim()) return

        setIsCreating(true)
        setCreationStep("Preparing...")

        try {
            // Upload server icon to Arweave or use default
            let logoUrl = ""

            if (serverIcon) {
                try {
                    setIsUploadingIcon(true)
                    setCreationStep("Uploading icon...")

                    // Show uploading toast
                    // toast.loading("Uploading server icon...", {
                    //     richColors: true,
                    //     style: {
                    //         backgroundColor: "var(--background)",
                    //         color: "var(--foreground)",
                    //         border: "1px solid var(--border)",
                    //         borderRadius: "12px",
                    //         boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                    //         backdropFilter: "blur(8px)",
                    //     },
                    //     className: "font-medium",
                    //     duration: Infinity,
                    // })

                    // Upload the file to Arweave
                    logoUrl = await uploadFileTurbo(serverIcon)

                    // toast.dismiss()
                    // toast.success("Icon uploaded successfully", {
                    //     richColors: true,
                    //     style: {
                    //         backgroundColor: "var(--background)",
                    //         color: "var(--foreground)",
                    //         border: "1px solid var(--border)",
                    //         borderRadius: "12px",
                    //         boxShadow: "0 10px 25px -5px rgba(34, 197, 94, 0.15), 0 4px 6px -2px rgba(34, 197, 94, 0.1)",
                    //         backdropFilter: "blur(8px)",
                    //     },
                    //     className: "font-medium",
                    //     duration: 3000,
                    // })
                } catch (uploadError) {
                    console.warn("Failed to upload server icon, using default:", uploadError)
                    // toast.dismiss()
                    // toast.error("Failed to upload icon. Creating server without icon.", {
                    //     richColors: true,
                    //     style: {
                    //         backgroundColor: "var(--background)",
                    //         color: "var(--foreground)",
                    //         border: "1px solid var(--border)",
                    //         borderRadius: "12px",
                    //         boxShadow: "0 10px 25px -5px rgba(239, 68, 68, 0.15), 0 4px 6px -2px rgba(239, 68, 68, 0.1)",
                    //         backdropFilter: "blur(8px)",
                    //     },
                    //     className: "font-medium",
                    //     duration: 4000,
                    // })
                    logoUrl = ""
                } finally {
                    setIsUploadingIcon(false)
                }
            }

            setCreationStep("Creating server...")

            // Show creating server toast
            // toast.loading("Creating server... Don't close this window!", {
            //     richColors: true,
            //     style: {
            //         backgroundColor: "var(--background)",
            //         color: "var(--foreground)",
            //         border: "1px solid var(--border)",
            //         borderRadius: "12px",
            //         boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            //         backdropFilter: "blur(8px)",
            //     },
            //     className: "font-medium",
            //     duration: Infinity,
            // })

            const server = await actions.servers.create({
                name: serverName.trim(),
                logo: logoUrl
            })

            // toast.dismiss()
            setCreationStep("Server created successfully!")

            if (server) {
                // toast.success("Server created successfully!", {
                //     richColors: true,
                //     style: {
                //         backgroundColor: "var(--background)",
                //         color: "var(--foreground)",
                //         border: "1px solid var(--border)",
                //         borderRadius: "12px",
                //         boxShadow: "0 10px 25px -5px rgba(34, 197, 94, 0.15), 0 4px 6px -2px rgba(34, 197, 94, 0.1)",
                //         backdropFilter: "blur(8px)",
                //     },
                //     className: "font-medium",
                //     duration: 4000,
                // })

                // Clear form and close dialog
                setServerName("")
                setServerIcon(null)
                setCreateDialogOpen(false)
                setPopoverOpen(false)

                // Notify parent component
                onServerJoined?.({
                    serverId: server.serverId,
                    serverName: server.name,
                    memberCount: server.memberCount || 0
                })
            } else {
                throw new Error("Server creation returned null")
            }
        } catch (error) {
            console.error("Failed to create server:", error)
            // toast.dismiss()
            setCreationStep("Creation failed")
            // toast.error("Failed to create server", {
            //     description: error instanceof Error ? error.message : "An unexpected error occurred",
            //     richColors: true,
            //     style: {
            //         backgroundColor: "var(--background)",
            //         color: "var(--foreground)",
            //         border: "1px solid var(--border)",
            //         borderRadius: "12px",
            //         boxShadow: "0 10px 25px -5px rgba(239, 68, 68, 0.15), 0 4px 6px -2px rgba(239, 68, 68, 0.1)",
            //         backdropFilter: "blur(8px)",
            //     },
            //     className: "font-medium",
            //     duration: 4000,
            // })
        } finally {
            setIsCreating(false)
            setCreationStep("")
        }
    }

    return (
        <div className="relative group mb-3">
            {/* Hover indicator pill */}
            <div
                className={cn(
                    "absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 rounded-r-full transition-all duration-300 ease-out",
                    isHovered
                        ? "h-6 bg-gradient-to-b from-primary/80 to-primary/60 shadow-md shadow-primary/30"
                        : "h-0"
                )}
            />

            <div className="flex justify-center relative">
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild disabled={!connected}>
                        <Button
                            size="icon"
                            variant="ghost"
                            className={cn(
                                "w-12 h-12 p-0 transition-all duration-300 ease-out hover:bg-transparent group relative overflow-hidden",
                                "before:absolute before:inset-0 before:bg-gradient-to-br before:from-background/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
                                "rounded-3xl hover:rounded-2xl bg-muted/30 hover:bg-gradient-to-br hover:from-primary hover:to-primary hover:shadow-md hover:shadow-primary/20",
                                "border-2 border-dashed border-muted-foreground/30 hover:border-primary/50"
                            )}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                        >
                            <Plus
                                className={cn(
                                    "w-5 h-5 transition-all duration-300",
                                    "text-muted-foreground group-hover:text-black group-hover:scale-110 group-hover:rotate-90"
                                )}
                            />
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
                                <p className="text-xs text-muted-foreground mt-1">
                                    Join an existing server or create your own
                                </p>
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
                                    onClick={() => {
                                        setJoinDialogOpen(true)
                                        setPopoverOpen(false)
                                    }}
                                >
                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                                            <Users className="w-4 h-4 text-blue-500" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-sm text-foreground">
                                                Join Server
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Connect to an existing community
                                            </div>
                                        </div>
                                    </div>
                                </Button>

                                <AlertDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            className={cn(
                                                "w-full h-12 p-2.5 justify-start text-left transition-all duration-200 group relative overflow-hidden",
                                                "hover:bg-gradient-to-r hover:from-green-500/10 hover:to-green-400/5",
                                                "border border-border/30 hover:border-green-400/30",
                                                "before:absolute before:inset-0 before:bg-gradient-to-r before:from-green-500/5 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300"
                                            )}
                                        >
                                            <div className="flex items-center gap-3 relative z-10">
                                                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                                                    <Plus className="w-4 h-4 text-green-500" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm text-foreground">
                                                        Create Server
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Start your own community
                                                    </div>
                                                </div>
                                            </div>
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="max-w-lg w-[95vw] sm:w-full p-0 max-h-[90vh] overflow-hidden flex flex-col bg-background border border-primary/30 shadow-2xl">
                                        <AlertDialogHeader className="relative px-4 sm:px-6 pt-6 pb-4 border-b border-primary/20">
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-8 bg-primary/5 rounded-full blur-xl" />
                                            <AlertDialogTitle className="text-xl font-ocr flex items-center gap-3 relative tracking-wide">
                                                <div className="w-8 h-8 bg-primary/20 flex items-center justify-center rounded-lg">
                                                    <Plus className="w-4 h-4 text-primary" />
                                                </div>
                                                <div>
                                                    <div className="text-primary font-bold">
                                                        Create Server
                                                    </div>
                                                    <div className="text-sm font-ocr font-normal text-muted-foreground mt-1 tracking-normal">
                                                        Start your own community
                                                    </div>
                                                </div>
                                            </AlertDialogTitle>
                                        </AlertDialogHeader>

                                        <AlertDialogDescription asChild>
                                            <div className="px-4 sm:px-6 space-y-6 mt-4 overflow-y-auto max-h-[60vh] relative">
                                                <div className="flex flex-col sm:flex-row gap-4 relative">
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
                                                            <label className="text-sm font-ocr text-primary tracking-wide font-medium">
                                                                Server Name *
                                                            </label>
                                                            <Input
                                                                type="text"
                                                                placeholder="My Awesome Server"
                                                                value={serverName}
                                                                onChange={(e) => setServerName(e.target.value)}
                                                                className="font-ocr bg-primary/10 border-primary/30 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Info note */}
                                                <div className="px-4 py-3 mt-4 bg-primary/5 border border-primary/20 rounded-lg">
                                                    <div className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                                                        <p className="text-xs text-muted-foreground">
                                                            Server creation may take 30-60 seconds as we initialize your server on the permaweb.
                                                            Please be patient during this process.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </AlertDialogDescription>

                                        <AlertDialogFooter className="px-4 sm:px-6 pb-6 pt-4 gap-3 border-t border-primary/20 bg-background">
                                            <AlertDialogCancel
                                                disabled={isCreating || isUploadingIcon}
                                                className="bg-primary/10 border-primary/30 text-muted-foreground hover:bg-primary/20 hover:border-primary/50"
                                            >
                                                Cancel
                                            </AlertDialogCancel>
                                            <Button
                                                onClick={handleCreateServer}
                                                disabled={!serverName.trim() || isCreating || isUploadingIcon}
                                                className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                            >
                                                {(isCreating || isUploadingIcon) ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        {creationStep ? creationStep : "Creating..."}
                                                    </>
                                                ) : (
                                                    "Create Server"
                                                )}
                                            </Button>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Tooltip */}
                <div
                    className={cn(
                        "absolute left-full ml-4 top-1/2 -translate-y-1/2 transition-all duration-200 pointer-events-none z-[100]",
                        isHovered ? "opacity-100 visible translate-x-0" : "opacity-0 invisible -translate-x-2"
                    )}
                >
                    <div className="bg-popover text-popover-foreground text-sm px-3 py-2 rounded-lg shadow-xl border border-border whitespace-nowrap">
                        <div className="flex items-center gap-2">
                            <Plus className="w-3 h-3 text-primary" />
                            <span className="font-medium">Add Server</span>
                        </div>
                        <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-l-[8px] border-transparent border-l-popover" />
                    </div>
                </div>
            </div>

            {/* Join Server Dialog */}
            <JoinServerModal
                open={joinDialogOpen}
                onOpenChange={setJoinDialogOpen}
                onServerJoined={onServerJoined}
            />
        </div>
    )
}

// Install PWA Button Component
const InstallPWAButton = () => {
    const [isHovered, setIsHovered] = useState(false);
    const { showInstallPrompt, isInstallable, isInstalled, debugInfo } = usePWA();

    if (isInstalled || !isInstallable) {
        return null;
    }

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
                    onClick={showInstallPrompt}
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
const WalletButton = ({ onClick }: { onClick: () => void }) => {
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
                    onClick={onClick}
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

// Join Server Dialog Component
const JoinServerModal = ({ open, onOpenChange, onServerJoined }: JoinServerModalProps) => {
    const [inviteCode, setInviteCode] = useState("")
    const [isJoining, setIsJoining] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [serverInfo, setServerInfo] = useState<Server | null>(null)
    const { connected, address } = useWallet()
    const { actions } = useSubspace()
    const navigate = useNavigate()

    // Sample invites for user guidance
    const sampleInvites = [
        Constants.SubspaceServer,
        `subspace.ar.io/#/invite/${Constants.SubspaceServer}`,
    ]

    // Parse invite code/link with comprehensive validation
    const parseInviteCode = (input: string): string | null => {
        const trimmed = input.trim()

        // Direct server ID - must be exactly 43 characters
        if (trimmed.length === 43 && /^[a-zA-Z0-9_-]+$/.test(trimmed)) {
            return trimmed
        }

        // URL formats - extract exactly 43 character server ID
        const inviteMatch = trimmed.match(/(?:.*[/#])?invite[/#]([a-zA-Z0-9_-]{43})(?:[^a-zA-Z0-9_-]|$)/)
        if (inviteMatch) {
            return inviteMatch[1]
        }

        // Extract any 43-character sequence that looks like a server ID
        const serverIdMatch = trimmed.match(/[a-zA-Z0-9_-]{43}/)
        if (serverIdMatch && serverIdMatch[0].length === 43) {
            return serverIdMatch[0]
        }

        return null
    }

    // Fetch server info with proper error handling
    const fetchServerInfo = async (code: string) => {
        const serverId = parseInviteCode(code)
        if (!serverId) {
            setServerInfo(null)
            setError("")
            return
        }

        setIsLoading(true)
        setError("")

        try {
            const details = await actions.servers.get(serverId)
            if (details) {
                setServerInfo(details)
                setError("")
            } else {
                setServerInfo(null)
                setError("Server not found or invite is invalid")
            }
        } catch (error) {
            console.error("Error fetching server info:", error)
            setServerInfo(null)
            setError("Failed to load server information")
        } finally {
            setIsLoading(false)
        }
    }

    // Handle input change with debouncing for better UX
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setInviteCode(value)

        // Clear previous states
        setError("")
        setServerInfo(null)

        if (value.trim()) {
            // Add small delay for better UX to avoid excessive API calls
            const timeoutId = setTimeout(() => {
                fetchServerInfo(value)
            }, 300)

            return () => clearTimeout(timeoutId)
        }
    }

    // Handle paste with immediate fetch for better responsiveness
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const value = e.clipboardData.getData('text')
        if (value.trim()) {
            // Immediate fetch on paste without changing the input value
            // The input value will be updated by the onChange handler
            fetchServerInfo(value)
        }
    }

    // Clear state when dialog opens/closes
    useEffect(() => {
        if (!open) {
            setInviteCode("")
            setServerInfo(null)
            setError("")
            setIsLoading(false)
            setIsJoining(false)
        }
    }, [open])

    // Handle server joining with comprehensive feedback
    const handleJoinServer = async () => {
        const serverId = parseInviteCode(inviteCode)
        if (!serverId || !connected || !address || !serverInfo) return

        setIsJoining(true)
        try {
            // Show loading toast
            // toast.loading("Joining server...", {
            //     richColors: true,
            //     style: {
            //         backgroundColor: "var(--background)",
            //         color: "var(--foreground)",
            //         border: "1px solid var(--border)",
            //         borderRadius: "12px",
            //         boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            //         backdropFilter: "blur(8px)",
            //     },
            //     className: "font-medium",
            //     duration: Infinity,
            // })

            // Use the new hook's join method
            const success = await actions.servers.join(serverId)
            // toast.dismiss()

            if (success) {
                // Success toast with enhanced styling
                // toast.success("Successfully joined server!", {
                //     richColors: true,
                //     style: {
                //         backgroundColor: "var(--background)",
                //         color: "var(--foreground)",
                //         border: "1px solid var(--border)",
                //         borderRadius: "12px",
                //         boxShadow: "0 10px 25px -5px rgba(34, 197, 94, 0.15), 0 4px 6px -2px rgba(34, 197, 94, 0.1)",
                //         backdropFilter: "blur(8px)",
                //     },
                //     className: "font-medium",
                //     duration: 4000,
                // })

                // Close dialog
                onOpenChange(false)

                // Navigate to the server
                navigate(`/app/${serverId}`)

                // Notify parent component for welcome popup
                if (onServerJoined) {
                    onServerJoined({
                        serverId,
                        serverName: serverInfo.name,
                        memberCount: serverInfo.memberCount || 0
                    })
                }
            } else {
                // Enhanced error feedback
                // toast.error("Failed to join server", {
                //     description: "The server may not exist or you may already be a member",
                //     richColors: true,
                //     style: {
                //         backgroundColor: "var(--background)",
                //         color: "var(--foreground)",
                //         border: "1px solid var(--border)",
                //         borderRadius: "12px",
                //         boxShadow: "0 10px 25px -5px rgba(239, 68, 68, 0.15), 0 4px 6px -2px rgba(239, 68, 68, 0.1)",
                //         backdropFilter: "blur(8px)",
                //     },
                //     className: "font-medium",
                //     duration: 4000,
                // })
            }
        } catch (error) {
            console.error("Error joining server:", error)
            // toast.dismiss()
            // toast.error("Failed to join server", {
            //     description: error instanceof Error ? error.message : "An unexpected error occurred",
            //     richColors: true,
            //     style: {
            //         backgroundColor: "var(--background)",
            //         color: "var(--foreground)",
            //         border: "1px solid var(--border)",
            //         borderRadius: "12px",
            //         boxShadow: "0 10px 25px -5px rgba(239, 68, 68, 0.15), 0 4px 6px -2px rgba(239, 68, 68, 0.1)",
            //         backdropFilter: "blur(8px)",
            //     },
            //     className: "font-medium",
            //     duration: 4000,
            // })
        } finally {
            setIsJoining(false)
        }
    }

    // Validation for join button state
    const isValidInvite = inviteCode.trim() && parseInviteCode(inviteCode)
    const canJoinServer = connected && serverInfo && !isJoining && isValidInvite

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-lg w-[95vw] sm:w-full p-0 bg-background border border-primary/30 shadow-2xl">
                <AlertDialogHeader className="relative px-4 sm:px-6 pt-6 pb-4 border-b border-primary/20">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-8 bg-primary/5 rounded-full blur-xl" />
                    <AlertDialogTitle className="text-xl font-ocr flex items-center gap-3 relative tracking-wide">
                        <div className="w-8 h-8 bg-primary/20 flex items-center justify-center rounded-lg">
                            <Users className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <div className="text-primary font-bold">
                                Join Server
                            </div>
                            <div className="text-sm font-ocr font-normal text-muted-foreground mt-1 tracking-normal">
                                Connect to an existing community
                            </div>
                        </div>
                    </AlertDialogTitle>
                </AlertDialogHeader>

                <AlertDialogDescription asChild>
                    <div className="px-4 sm:px-6 space-y-4 mt-4 relative">
                        <div className="space-y-2 relative">
                            <label className="text-sm font-ocr text-primary tracking-wide font-medium">
                                Invite Code or Link
                            </label>
                            <Input
                                type="text"
                                placeholder="Enter server ID or paste invite link..."
                                value={inviteCode}
                                onChange={handleInputChange}
                                onPaste={handlePaste}
                                disabled={isJoining}
                                className={cn(
                                    "bg-primary/10 border-primary/30 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 transition-all duration-200",
                                    error && "border-destructive/50 focus:border-destructive focus:ring-destructive/20",
                                    serverInfo && "border-primary focus:border-primary focus:ring-primary/20",
                                    isLoading && "border-primary/60 focus:border-primary focus:ring-primary/20"
                                )}
                            />

                            {/* Input Status Indicator */}
                            {inviteCode.trim() && (
                                <div className="flex items-center gap-2 text-xs font-ocr">
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                            <span className="text-muted-foreground">Validating invite...</span>
                                        </>
                                    ) : parseInviteCode(inviteCode) ? (
                                        serverInfo ? (
                                            <>
                                                <div className="w-3 h-3 bg-primary rounded-full" />
                                                <span className="text-primary">Valid server found</span>
                                            </>
                                        ) : error ? (
                                            <>
                                                <AlertCircle className="w-3 h-3 text-destructive" />
                                                <span className="text-destructive">Invalid invite</span>
                                            </>
                                        ) : null
                                    ) : (
                                        <>
                                            <AlertCircle className="w-3 h-3 text-yellow-500" />
                                            <span className="text-yellow-500">Invalid format</span>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Server Preview */}
                            {isLoading ? (
                                <div className="p-4 space-y-4 bg-primary/5 border border-primary/20 rounded-lg animate-pulse">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-lg">
                                            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 animate-pulse rounded-lg" />
                                        </div>
                                        <div className="space-y-2 flex-1">
                                            <div className="h-5 w-32 bg-primary/10 animate-pulse rounded" />
                                            <div className="h-4 w-24 bg-primary/10 animate-pulse rounded" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                        <span>Loading server information...</span>
                                    </div>
                                </div>
                            ) : serverInfo ? (
                                <div className="p-4 space-y-4 bg-primary/5 border border-primary/20 rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 overflow-hidden bg-primary/20 flex items-center justify-center border border-primary/30 rounded-lg">
                                            {serverInfo.logo ? (
                                                <img
                                                    src={`https://arweave.net/${serverInfo.logo}`}
                                                    alt={serverInfo.name}
                                                    className="w-full h-full object-cover rounded-lg"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement
                                                        target.style.display = 'none'
                                                        target.nextElementSibling?.classList.remove('hidden')
                                                    }}
                                                />
                                            ) : null}
                                            <img
                                                src={alien}
                                                alt="default server icon"
                                                className={cn("w-8 h-8 opacity-80", serverInfo.logo && "hidden")}
                                            />
                                        </div>
                                        <div className="space-y-1 flex-1">
                                            <h3 className="text-lg font-ocr font-bold text-primary truncate tracking-wide">{serverInfo.name}</h3>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Users className="w-4 h-4" />
                                                <span>{serverInfo.memberCount || 0} members</span>
                                                <div className="w-1 h-1 bg-primary rounded-full" />
                                                <span>online</span>
                                            </div>
                                            {serverInfo.description && (
                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                    {serverInfo.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : error ? (
                                <div className="p-4 space-y-2 bg-destructive/10 border border-destructive/20 rounded-lg">
                                    <div className="flex items-center gap-2 text-destructive">
                                        <AlertCircle className="w-4 h-4" />
                                        <p className="text-sm font-medium tracking-wide">{error}</p>
                                    </div>
                                    <p className="text-xs text-destructive/80">
                                        Please check the invite link or server ID and try again.
                                    </p>
                                </div>
                            ) : inviteCode.trim() && !parseInviteCode(inviteCode) ? (
                                <div className="p-4 space-y-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                    <div className="flex items-center gap-2 text-yellow-500">
                                        <AlertCircle className="w-4 h-4" />
                                        <p className="text-sm font-medium tracking-wide">Invalid invite format</p>
                                    </div>
                                    <p className="text-xs text-yellow-500/80">
                                        Server IDs must be exactly 43 characters long.
                                    </p>
                                </div>
                            ) : null}

                            {/* How to join section */}
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-base font-ocr font-medium text-foreground mb-2 mt-4">How to join:</h4>
                                    <ul className="space-y-1 text-xs ml-2">
                                        <li className="flex items-start gap-1.5">
                                            <div className="w-1 h-1 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                                            <span className="text-muted-foreground">Paste a server ID (exactly 43 characters)</span>
                                        </li>
                                        <li className="flex items-start gap-1.5">
                                            <div className="w-1 h-1 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                                            <span className="text-muted-foreground">Paste an invite link from a server member</span>
                                        </li>
                                        <li className="flex items-start gap-1.5">
                                            <div className="w-1 h-1 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                                            <span className="text-muted-foreground">Server IDs contain only letters, numbers, hyphens, and underscores</span>
                                        </li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="text-base font-ocr font-medium text-foreground mb-4">Example invites:</h4>
                                    <div className="space-y-3">
                                        {sampleInvites.map((sample, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => {
                                                    setInviteCode(sample)
                                                    fetchServerInfo(sample)
                                                }}
                                                className="w-full p-4 cursor-pointer bg-muted/20 hover:bg-primary/10 rounded-lg border border-border/50 hover:border-border transition-all duration-200 text-left group"
                                                title="Click to use this example"
                                            >
                                                <code className="text-sm text-muted-foreground group-hover:text-foreground font-mono block break-all transition-colors">
                                                    {sample}
                                                </code>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </AlertDialogDescription>

                <AlertDialogFooter className="px-4 sm:px-6 pb-6 pt-4 gap-3 border-t border-primary/20 bg-background">
                    <AlertDialogCancel
                        disabled={isJoining}
                        className="bg-primary/10 border-primary/30 text-muted-foreground hover:bg-primary/20 hover:border-primary/50"
                    >
                        Cancel
                    </AlertDialogCancel>
                    <Button
                        onClick={handleJoinServer}
                        disabled={!canJoinServer}
                        className={cn(
                            "min-w-[120px] transition-all duration-200",
                            "bg-primary text-primary-foreground hover:bg-primary/90",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                    >
                        {isJoining ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Joining...</span>
                            </div>
                        ) : !connected ? (
                            "Connect Wallet to Join"
                        ) : (
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                <span>Join Server</span>
                            </div>
                        )}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

// Skeleton Loader Component
const ServerSkeleton = () => (
    <div className="relative group mb-3">
        <div className="absolute inset-0 bg-muted/20 rounded-2xl blur-xl animate-pulse" />
        <div className="flex justify-center relative">
            <div className="w-12 h-12 p-0 rounded-3xl bg-muted/50 relative overflow-hidden">
                {/* Enhanced shimmer animation */}
                <div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-shimmer"
                    style={{
                        animation: 'shimmer 2s ease-in-out infinite',
                        transform: 'translateX(-100%)'
                    }}
                />
                <div className="w-full h-full rounded-xl bg-muted/30 flex items-center justify-center animate-pulse">
                    <div className="w-6 h-6 bg-muted-foreground/20 rounded animate-pulse" />
                </div>
            </div>
        </div>

        {/* Loading indicator */}
        <div className="absolute -bottom-1 -right-1 z-10 pointer-events-none">
            <div className="flex items-center justify-center w-[18px] h-[18px] rounded-full bg-gradient-to-br from-primary/60 to-primary/40 shadow-lg shadow-primary/30 border border-background/20 backdrop-blur-sm">
                <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
            </div>
        </div>
    </div>
);

export default function ServerList({ className, onServerJoined }: {
    className?: string
    onServerJoined?: (data: any) => void
}) {
    const { profile, servers, actions, isLoadingProfile, loadingServers } = useSubspace()
    const { activeServerId } = useGlobalState()
    const navigate = useNavigate()
    const { connected, address, wanderInstance } = useWallet()
    const [_, setShowPfpPrompt] = useSessionStorage("show-pfp-prompt", true, { initializeWithValue: true })
    const [sortedServerIds, setSortedServerIds] = useState<string[]>([])
    const [skeletonsToShow, setSkeletonsToShow] = useState(0)

    // Update sorted server IDs when profile changes - ONLY approved servers
    useEffect(() => {
        if (!profile) return

        const sortedServers = Object.keys(profile.serversJoined)
            .filter((serverId) => {
                const serverData = profile.serversJoined[serverId]
                // Only include servers that are approved (serverApproved === true)
                return serverData?.serverApproved === true
            })
            .sort((a, b) => {
                const aOrder = profile.serversJoined[a]?.orderId ?? 0
                const bOrder = profile.serversJoined[b]?.orderId ?? 0
                return aOrder - bOrder
            })

        setSortedServerIds(sortedServers)
    }, [profile])

    // Get servers from profile's joined list (now a KV map) - ONLY approved servers
    const displayServers = connected && address && profile?.serversJoined
        ? Object.keys(profile.serversJoined)
            .filter((serverId) => {
                const serverData = profile.serversJoined[serverId]
                // Only include servers that are approved (serverApproved === true)
                return serverData?.serverApproved === true
            })
            .sort((a, b) => {
                const aOrder = profile.serversJoined[a]?.orderId ?? 0
                const bOrder = profile.serversJoined[b]?.orderId ?? 0
                return aOrder - bOrder
            })
            .map((serverId) => {
                const serverInstance = servers[serverId]
                return serverInstance || null
            })
            .filter(server => server !== null)
        : []

    // Get expected server IDs from profile - ONLY approved servers
    const expectedServerIds = connected && address && profile?.serversJoined
        ? Object.keys(profile.serversJoined).filter((serverId) => {
            const serverData = profile.serversJoined[serverId]
            // Only include servers that are approved (serverApproved === true)
            return serverData?.serverApproved === true
        })
        : []

    // Determine skeletons to show - smart system based on cache status
    useEffect(() => {
        let skeletonsToShow = 0

        if (connected && address) {
            if (isLoadingProfile && !profile) {
                // Initial profile load - show a few placeholder skeletons
                skeletonsToShow = 2
            } else if (profile?.serversJoined && expectedServerIds.length > 0) {
                // Calculate how many servers are NOT in cache
                const cachedServersCount = expectedServerIds.filter(serverId => servers[serverId]).length
                const uncachedServersCount = expectedServerIds.length - cachedServersCount

                if (uncachedServersCount > 0) {
                    // Show skeletons only for servers that are not cached
                    skeletonsToShow = uncachedServersCount
                }
            }
        }

        // Always update the skeleton count
        setSkeletonsToShow(skeletonsToShow)
    }, [connected, address, isLoadingProfile, profile, expectedServerIds, servers])

    // 1. INITIAL LOAD: Fetch all servers at once when profile first loads - ONLY approved servers
    useEffect(() => {
        if (!connected || !address || !profile?.serversJoined) return

        const fetchAllServersConcurrently = async () => {
            // Only fetch approved servers
            const serverIds = Object.keys(profile.serversJoined).filter((serverId) => {
                const serverData = profile.serversJoined[serverId]
                return serverData?.serverApproved === true
            })
            const failedServers: string[] = []

            // Fetch all approved servers concurrently instead of one by one
            const fetchPromises = serverIds.map(async (serverId) => {
                // Skip if server is already loading
                if (loadingServers.has(serverId)) return

                try {
                    await actions.servers.get(serverId)
                } catch (error) {
                    failedServers.push(serverId)
                }
            })

            // Wait for all servers to finish fetching
            await Promise.all(fetchPromises)
        }

        fetchAllServersConcurrently()
    }, [connected, address, profile?.serversJoined, loadingServers, actions.servers])

    // 2. ACTIVE SERVER: Fetch specific server when it becomes active - ONLY if approved
    useEffect(() => {
        if (!connected || !address || !activeServerId || !profile?.serversJoined) return

        // Check if the active server is approved before fetching
        const serverData = profile.serversJoined[activeServerId]
        if (!serverData || serverData.serverApproved !== true) {
            // Server is not approved, don't fetch it
            return
        }

        // Only fetch active server if it's not already loaded
        const activeServer = servers[activeServerId]
        const isActiveServerLoaded = !!activeServer
        const isActiveServerLoading = loadingServers.has(activeServerId)

        if (!isActiveServerLoaded && !isActiveServerLoading) {
            // Server not loaded, fetch it
            const fetchActiveServer = async () => {
                try {
                    await actions.servers.get(activeServerId)
                } catch (error) {
                    // Silent error handling
                }
            }

            fetchActiveServer()
        }
    }, [connected, address, activeServerId, profile?.serversJoined, servers, loadingServers, actions.servers])

    // 2.5. ACTIVE SERVER MEMBERS: Fetch members when server becomes active - ONLY if approved
    useEffect(() => {
        if (!connected || !address || !activeServerId || !profile?.serversJoined) return

        // Check if the active server is approved before fetching members
        const serverData = profile.serversJoined[activeServerId]
        if (!serverData || serverData.serverApproved !== true) {
            // Server is not approved, don't fetch members
            return
        }

        const activeServer = servers[activeServerId]
        if (activeServer && (!activeServer.members || Object.keys(activeServer.members || {}).length === 0)) {
            // Fetch members if they don't exist or if empty
            console.log('Fetching members for server:', activeServerId)
            actions.servers.getMembers(activeServerId).catch(err => {
                console.error('Failed to fetch server members:', err)
            })
        }
    }, [connected, address, activeServerId, profile?.serversJoined, servers, actions.servers])

    // 3. HOME CLICK: Refetch all servers when home is clicked
    const handleHomeClick = () => {
        setTimeout(() => { setShowPfpPrompt(true) }, 250)
        navigate("/app")
    }

    function handleServerJoined(data: any) {
        // Navigate to the new server
        if (data?.serverId) {
            navigate(`/app/${data.serverId}`)
        }

        // Call parent callback if provided
        if (onServerJoined) {
            onServerJoined(data)
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
                onClick={handleHomeClick}
                unreadCount={0}
            />

            {/* Separator */}
            <div className="relative mx-auto mb-0">
                <div className="w-8 h-[2px] bg-gradient-to-r from-transparent via-border to-transparent rounded-full" />
                <div className="absolute inset-0 w-8 h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent rounded-full blur-sm" />
            </div>

            {/* Server Buttons */}
            <div className="space-y-1 py-3">
                {displayServers.map((server, index) => {
                    const isServerLoading = loadingServers.has(server.serverId)
                    return (
                        <div
                            key={server.serverId}
                            style={{ animationDelay: `${index * 100}ms` }}
                            className="animate-in slide-in-from-left-5 fade-in duration-500"
                        >
                            <ServerButton
                                server={server}
                                isActive={server.serverId === activeServerId}
                                isUpdating={isServerLoading}
                                onClick={() => {
                                    navigate(`/app/${server.serverId}`)
                                }}
                            />
                        </div>
                    )
                })}

                {/* Skeleton loaders for servers being loaded */}
                {Array.from({ length: skeletonsToShow }, (_, index) => (
                    <div
                        key={`skeleton-${index}`}
                        className="relative group mb-3 animate-in slide-in-from-left-5 fade-in duration-500"
                        style={{
                            animationDelay: `${(displayServers.length + index) * 100}ms`,
                        }}
                    >
                        <ServerSkeleton />
                    </div>
                ))}
            </div>

            {/* Add Server Button */}
            <AddServerButton onServerJoined={handleServerJoined} />

            {/* Spacer */}
            <div className="grow" />

            {/* Wallet Button */}
            {wanderInstance && <WalletButton onClick={() => wanderInstance?.open()} />}

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