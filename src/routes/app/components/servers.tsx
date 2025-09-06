import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useProfileServers, useServers, useSubspaceActions } from "@/hooks/use-subspace";
import { ConnectionStrategies, useWallet } from "@/hooks/use-wallet";
import { useGlobalState } from "@/hooks/use-global-state";
import { useServerDialogs } from "@/hooks/use-server-dialogs";
import type { Inputs, IServer } from "@subspace-protocol/sdk/types";
import { ProfileAvatar } from "@/components/profile";
import {
    Home,
    Plus,
    Settings,
    LogOut,
    Download,
    Wallet,
    Users,
    Server,
    Upload,
    Camera,
    ExternalLink,
    Compass
} from "lucide-react";
import { cn, uploadFileTurbo } from "@/lib/utils";
import { useState, useReducer, useEffect, useCallback } from "react";
import alienGreen from "@/assets/subspace/alien-green.svg";
import { usePWA } from "@/hooks/use-pwa";

// Dialog state types
interface DialogState {
    isJoinDialogOpen: boolean;
    isCreateDialogOpen: boolean;
    joinServerInput: string;
    createServerName: string;
    createServerDescription: string;
    serverIcon: string | null;
    serverIconFile: File | null;
    isLoading: boolean;
    isUploading: boolean;
    isFetchingServer: boolean;
    serverPreview: IServer | null; // IServer type from SDK
    error: string | null;
    progressSteps: {
        uploadingImage?: 'pending' | 'active' | 'completed';
        creatingServer?: 'pending' | 'active' | 'completed';
        joiningServer?: 'pending' | 'active' | 'completed';
        refreshingProfile?: 'pending' | 'active' | 'completed';
    };
}

type DialogAction =
    | { type: 'OPEN_JOIN_DIALOG' }
    | { type: 'CLOSE_JOIN_DIALOG' }
    | { type: 'OPEN_CREATE_DIALOG' }
    | { type: 'CLOSE_CREATE_DIALOG' }
    | { type: 'SET_JOIN_INPUT'; payload: string }
    | { type: 'SET_SERVER_NAME'; payload: string }
    | { type: 'SET_SERVER_DESCRIPTION'; payload: string }
    | { type: 'SET_SERVER_ICON'; payload: string | null }
    | { type: 'SET_SERVER_ICON_FILE'; payload: File | null }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_UPLOADING'; payload: boolean }
    | { type: 'SET_FETCHING_SERVER'; payload: boolean }
    | { type: 'SET_SERVER_PREVIEW'; payload: any | null }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'SET_PROGRESS_STEP'; payload: { step: keyof DialogState['progressSteps']; status: 'pending' | 'active' | 'completed' } }
    | { type: 'RESET_PROGRESS_STEPS' }
    | { type: 'RESET_JOIN_FORM' }
    | { type: 'RESET_CREATE_FORM' };

const initialDialogState: DialogState = {
    isJoinDialogOpen: false,
    isCreateDialogOpen: false,
    joinServerInput: "",
    createServerName: "",
    createServerDescription: "",
    serverIcon: null,
    serverIconFile: null,
    isLoading: false,
    isUploading: false,
    isFetchingServer: false,
    serverPreview: null,
    error: null,
    progressSteps: {},
};

function dialogReducer(state: DialogState, action: DialogAction): DialogState {
    switch (action.type) {
        case 'OPEN_JOIN_DIALOG':
            return { ...state, isJoinDialogOpen: true };
        case 'CLOSE_JOIN_DIALOG':
            return { ...state, isJoinDialogOpen: false };
        case 'OPEN_CREATE_DIALOG':
            return { ...state, isCreateDialogOpen: true };
        case 'CLOSE_CREATE_DIALOG':
            return { ...state, isCreateDialogOpen: false };
        case 'SET_JOIN_INPUT':
            return { ...state, joinServerInput: action.payload };
        case 'SET_SERVER_NAME':
            return { ...state, createServerName: action.payload };
        case 'SET_SERVER_DESCRIPTION':
            return { ...state, createServerDescription: action.payload };
        case 'SET_SERVER_ICON':
            return { ...state, serverIcon: action.payload };
        case 'SET_SERVER_ICON_FILE':
            return { ...state, serverIconFile: action.payload };
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'SET_UPLOADING':
            return { ...state, isUploading: action.payload };
        case 'SET_FETCHING_SERVER':
            return { ...state, isFetchingServer: action.payload };
        case 'SET_SERVER_PREVIEW':
            return { ...state, serverPreview: action.payload };
        case 'SET_ERROR':
            return { ...state, error: action.payload };
        case 'SET_PROGRESS_STEP':
            return {
                ...state,
                progressSteps: {
                    ...state.progressSteps,
                    [action.payload.step]: action.payload.status
                }
            };
        case 'RESET_PROGRESS_STEPS':
            return { ...state, progressSteps: {} };
        case 'RESET_JOIN_FORM':
            return { ...state, joinServerInput: "", serverPreview: null, error: null, progressSteps: {} };
        case 'RESET_CREATE_FORM':
            return {
                ...state,
                createServerName: "",
                createServerDescription: "",
                serverIcon: null,
                serverIconFile: null,
                error: null,
                progressSteps: {}
            };
        default:
            return state;
    }
}

interface ServerIconProps {
    server: any;
    isActive?: boolean;
    hasNotification?: boolean;
    onClick?: () => void;
}

function ServerIcon({ server, isActive = false, hasNotification = false, onClick }: ServerIconProps) {
    const serverIcon = server?.profile?.pfp ? `https://arweave.net/${server.profile.pfp}` : null;
    const serverName = server?.profile?.name || "Unknown Server";
    const fallbackLetter = serverName.charAt(0).toUpperCase();

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="relative group">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "w-12 h-12 rounded-2xl transition-all duration-200 relative overflow-hidden",
                            "hover:rounded-xl hover:bg-primary/10 hover:shadow-md",
                            isActive && "rounded-xl bg-primary/20 shadow-sm",
                            "group-hover:scale-105"
                        )}
                        onClick={onClick}
                    >
                        {serverIcon ? (
                            <img
                                src={serverIcon}
                                alt={serverName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-semibold text-lg">
                                {fallbackLetter}
                            </div>
                        )}
                    </Button>

                    {/* Active indicator */}
                    {isActive && (
                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                    )}

                    {/* Notification badge */}
                    {hasNotification && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 w-5 h-5 p-0 text-xs flex items-center justify-center rounded-full"
                        >
                            !
                        </Badge>
                    )}
                </div>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
                <p className="capitalize">{serverName}</p>
            </TooltipContent>
        </Tooltip>
    );
}

function HomeButton({ isActive = false, onClick }: { isActive?: boolean; onClick?: () => void }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="relative group">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "w-12 h-12 rounded-2xl transition-all duration-200",
                            "hover:rounded-xl hover:bg-primary/10 hover:shadow-md",
                            isActive && "rounded-xl bg-primary/20 shadow-sm",
                            "group-hover:scale-105"
                        )}
                        onClick={onClick}
                    >
                        <img src={alienGreen} alt="Home" className="w-8 h-8" />
                    </Button>

                    {/* Active indicator */}
                    {isActive && (
                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                    )}
                </div>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
                <p>Direct Messages</p>
            </TooltipContent>
        </Tooltip>
    );
}

function AddServerButton({ onJoinServer, onCreateServer }: { onJoinServer: () => void; onCreateServer: () => void }) {
    return (
        <Popover>
            <Tooltip>
                <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "w-12 h-12 rounded-2xl transition-all duration-200 mt-2",
                                "hover:rounded-xl hover:bg-green-500/20 hover:text-green-500",
                                "border-2 border-dashed border-muted-foreground/30 hover:border-green-500/50",
                                "group-hover:shadow-md"
                            )}
                        >
                            <Plus className="w-6 h-6" />
                        </Button>
                    </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                    <p>Add a Server</p>
                </TooltipContent>
            </Tooltip>
            <PopoverContent side="right" sideOffset={8} className=" p-2">
                <div className="flex flex-col gap-1">
                    <ServerOptionButton
                        icon={<Users className="w-4 h-4" />}
                        title="Join a Server"
                        description="Join an existing server with an invite"
                        onClick={onJoinServer}
                        variant="join"
                    />
                    <ServerOptionButton
                        icon={<Server className="w-4 h-4" />}
                        title="Create Server"
                        description="Create your own server"
                        onClick={onCreateServer}
                        variant="create"
                    />
                </div>
            </PopoverContent>
        </Popover>
    );
}

function ServerOptionButton({
    icon,
    title,
    description,
    onClick,
    variant
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick: () => void;
    variant: 'join' | 'create';
}) {
    return (
        <Button
            variant="ghost"
            className="h-auto p-3 justify-start text-left hover:bg-accent/50 w-full"
            onClick={onClick}
        >
            <div className="flex items-start gap-3 w-full min-w-0">
                <div className={cn(
                    "p-2 rounded-md flex-shrink-0",
                    variant === 'join' ? "bg-blue-500/10 text-blue-500" : "bg-green-500/10 text-green-500"
                )}>
                    {icon}
                </div>
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{title}</div>
                    <div className="text-xs text-muted-foreground leading-tight break-words">{description}</div>
                </div>
            </div>
        </Button>
    );
}

function ProgressSteps({
    steps,
    progressSteps
}: {
    steps: Array<{ key: keyof DialogState['progressSteps']; label: string }>;
    progressSteps: DialogState['progressSteps'];
}) {
    // Find the current active step
    const activeStep = steps.find(step => progressSteps[step.key] === 'active');

    if (!activeStep) return null;

    return (
        <div className="flex items-center">
            <span className="text-sm font-medium animate-pulse text-primary/80">
                {activeStep.label}
            </span>
        </div>
    );
}

export default function Servers() {
    const { address, connected, connectionStrategy } = useWallet();
    const servers = useProfileServers(address);
    const { servers: serverActions, profiles: profileActions } = useSubspaceActions();
    const { activeServerId, actions: globalStateActions } = useGlobalState();
    const [isHomeActive, setIsHomeActive] = useState(true);
    const [dialogState, dispatch] = useReducer(dialogReducer, initialDialogState);
    const { isInstallable, isInstalled, showInstallPrompt, installPromptOutcome, isStandalone, debugInfo } = usePWA();
    const { isJoinDialogOpen, isCreateDialogOpen, actions: dialogActions } = useServerDialogs();

    // Sync isHomeActive with global state
    useEffect(() => {
        setIsHomeActive(!activeServerId || activeServerId === "");
    }, [activeServerId]);

    useEffect(() => {
        async function fetchServers() {
            const serverIds = Object.keys(servers || {});
            // fetch server in batches of 10
            for (let i = 0; i < serverIds.length; i += 10) {
                const batch = serverIds.slice(i, i + 10).filter(serverId => serverId);
                const promises = batch.map(serverId => serverActions.get(serverId));
                await Promise.all(promises);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        fetchServers();
    }, []);


    const handleHomeClick = () => {
        globalStateActions.setActiveServerId("");
        globalStateActions.setActiveChannelId(""); // Clear active channel when going home
    };

    const handleServerClick = (serverId: string) => {
        globalStateActions.setActiveServerId(serverId);
        globalStateActions.setActiveChannelId(""); // Clear active channel when switching servers
    };

    const handleJoinServer = () => {
        dispatch({ type: 'RESET_PROGRESS_STEPS' });
        dispatch({ type: 'OPEN_JOIN_DIALOG' });
        dialogActions.openJoinDialog();
    };

    const handleCreateServer = () => {
        dispatch({ type: 'RESET_PROGRESS_STEPS' });
        dispatch({ type: 'OPEN_CREATE_DIALOG' });
        dialogActions.openCreateDialog();
    };

    const handleJoinServerSubmit = async () => {
        if (!dialogState.joinServerInput.trim() || !dialogState.serverPreview) return;

        dispatch({ type: 'SET_LOADING', payload: true });
        dispatch({ type: 'SET_ERROR', payload: null });

        try {
            const serverId = dialogState.serverPreview.profile.id;

            // Join server
            dispatch({ type: 'SET_PROGRESS_STEP', payload: { step: 'joiningServer', status: 'active' } });
            const success = await serverActions.join(serverId);

            if (success) {
                dispatch({ type: 'SET_PROGRESS_STEP', payload: { step: 'joiningServer', status: 'completed' } });

                // Refetch user profile to update server list
                if (address) {
                    dispatch({ type: 'SET_PROGRESS_STEP', payload: { step: 'refreshingProfile', status: 'active' } });
                    await profileActions.get(address);
                    dispatch({ type: 'SET_PROGRESS_STEP', payload: { step: 'refreshingProfile', status: 'completed' } });
                }

                // Small delay to show completed state
                setTimeout(() => {
                    dispatch({ type: 'CLOSE_JOIN_DIALOG' });
                    dispatch({ type: 'RESET_JOIN_FORM' });
                    dialogActions.closeJoinDialog();
                }, 500);
            } else {
                dispatch({ type: 'SET_ERROR', payload: 'Failed to join server. Please try again.' });
            }
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: 'An error occurred while joining the server. Please try again.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const handleCreateServerSubmit = async () => {
        if (!dialogState.createServerName.trim()) return;

        dispatch({ type: 'SET_LOADING', payload: true });
        dispatch({ type: 'SET_ERROR', payload: null });

        try {
            let serverPfp: string | undefined = undefined;

            // Upload profile picture if one is selected
            if (dialogState.serverIconFile) {
                dispatch({ type: 'SET_PROGRESS_STEP', payload: { step: 'uploadingImage', status: 'active' } });
                dispatch({ type: 'SET_UPLOADING', payload: true });
                const uploadedTxId = await uploadFileTurbo(dialogState.serverIconFile);
                dispatch({ type: 'SET_UPLOADING', payload: false });

                if (uploadedTxId) {
                    serverPfp = uploadedTxId;
                    dispatch({ type: 'SET_PROGRESS_STEP', payload: { step: 'uploadingImage', status: 'completed' } });
                } else {
                    dispatch({ type: 'SET_ERROR', payload: 'Failed to upload server image. Please try again.' });
                    return;
                }
            }

            // Create server
            dispatch({ type: 'SET_PROGRESS_STEP', payload: { step: 'creatingServer', status: 'active' } });
            const serverData: Inputs.ICreateServer = {
                serverName: dialogState.createServerName.trim(),
                serverDescription: dialogState.createServerDescription.trim() || undefined,
                serverPfp: serverPfp,
            };

            const newServer = await serverActions.create(serverData);

            if (newServer) {
                dispatch({ type: 'SET_PROGRESS_STEP', payload: { step: 'creatingServer', status: 'completed' } });

                // Join the newly created server
                dispatch({ type: 'SET_PROGRESS_STEP', payload: { step: 'joiningServer', status: 'active' } });
                const joinSuccess = await serverActions.join(newServer.profile.id);

                if (joinSuccess) {
                    dispatch({ type: 'SET_PROGRESS_STEP', payload: { step: 'joiningServer', status: 'completed' } });

                    // Refetch user profile to update server list
                    if (address) {
                        dispatch({ type: 'SET_PROGRESS_STEP', payload: { step: 'refreshingProfile', status: 'active' } });
                        await profileActions.get(address);
                        dispatch({ type: 'SET_PROGRESS_STEP', payload: { step: 'refreshingProfile', status: 'completed' } });
                    }

                    // Small delay to show completed state
                    setTimeout(() => {
                        dispatch({ type: 'CLOSE_CREATE_DIALOG' });
                        dispatch({ type: 'RESET_CREATE_FORM' });
                        dialogActions.closeCreateDialog();
                        // Navigate to the new server
                        globalStateActions.setActiveServerId(newServer.profile.id);
                    }, 500);
                } else {
                    dispatch({ type: 'SET_ERROR', payload: 'Server created but failed to join. Please try joining manually.' });
                }
            } else {
                dispatch({ type: 'SET_ERROR', payload: 'Failed to create server. Please try again.' });
            }
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: 'An error occurred while creating the server. Please try again.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    const handleIconUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Store the actual file for upload
            dispatch({ type: 'SET_SERVER_ICON_FILE', payload: file });

            // Create preview URL for display
            const reader = new FileReader();
            reader.onload = (e) => {
                dispatch({ type: 'SET_SERVER_ICON', payload: e.target?.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const fetchServerDetails = useCallback(async (serverId: string) => {
        if (!serverId.trim()) {
            dispatch({ type: 'SET_SERVER_PREVIEW', payload: null });
            return;
        }

        dispatch({ type: 'SET_FETCHING_SERVER', payload: true });
        dispatch({ type: 'SET_ERROR', payload: null });

        try {
            // Extract server ID from invite link or use as-is if it's already an ID
            let cleanServerId = serverId.trim();

            // Handle different invite formats
            if (cleanServerId.includes('subspace.ar.io/#/invite/')) {
                cleanServerId = cleanServerId.split('subspace.ar.io/#/invite/')[1];
            } else if (cleanServerId.includes('subspace.com/invite/')) {
                cleanServerId = cleanServerId.split('subspace.com/invite/')[1];
            } else if (cleanServerId.includes('/invite/')) {
                cleanServerId = cleanServerId.split('/invite/')[1];
            }

            const serverDetails = await serverActions.get(cleanServerId);

            if (serverDetails) {
                dispatch({ type: 'SET_SERVER_PREVIEW', payload: serverDetails });
            } else {
                dispatch({ type: 'SET_SERVER_PREVIEW', payload: null });
                dispatch({ type: 'SET_ERROR', payload: 'Server not found. Please check the invite link.' });
            }
        } catch (error) {
            dispatch({ type: 'SET_SERVER_PREVIEW', payload: null });
            dispatch({ type: 'SET_ERROR', payload: 'Failed to fetch server details. Please try again.' });
        } finally {
            dispatch({ type: 'SET_FETCHING_SERVER', payload: false });
        }
    }, [serverActions]);

    // Debounced server fetching
    useEffect(() => {
        if (!dialogState.isJoinDialogOpen) return;

        const timeoutId = setTimeout(() => {
            if (dialogState.joinServerInput) {
                fetchServerDetails(dialogState.joinServerInput);
            } else {
                // Clear server preview when input is empty
                dispatch({ type: 'SET_SERVER_PREVIEW', payload: null });
                dispatch({ type: 'SET_ERROR', payload: null });
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
    }, [dialogState.joinServerInput, dialogState.isJoinDialogOpen, fetchServerDetails]);

    return (
        <div className="flex flex-col h-full bg-background/50 p-3 gap-2">
            {/* Home/DM Button */}
            <HomeButton
                isActive={isHomeActive}
                onClick={handleHomeClick}
            />

            {/* Separator */}
            <div className="w-8 h-px bg-border mx-auto my-1" />

            {/* Server List */}
            <div className="flex flex-col gap-2 overflow-y-scroll w-fit p-3 -m-3 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/40 transition-colors">
                {servers && Object.values(servers).map((server) => (
                    <ServerIcon
                        key={server?.profile?.id}
                        server={server}
                        isActive={activeServerId === server?.profile?.id}
                        hasNotification={false} // TODO: Implement notification logic
                        onClick={() => handleServerClick(server?.profile?.id)}
                    />
                ))}

                {/* Empty state when no servers */}
                {servers && Object.values(servers).length === 0 && (
                    <div className="flex flex-col items-center justify-center py-2 text-center">
                        <p className="text-xs text-muted-foreground px-2">
                            No servers yet. Join or create one!
                        </p>
                    </div>
                )}

                {/* Add Server Button */}
                <AddServerButton onJoinServer={handleJoinServer} onCreateServer={handleCreateServer} />
            </div>

            {/* Spacer to push user controls to bottom */}
            <div className="flex-1" />

            {/* Separator - only show if there are user controls below */}
            {(connected && connectionStrategy == ConnectionStrategies.WanderConnect || isInstallable) && (
                <div className="w-8 h-px bg-border mx-auto my-1" />
            )}

            {/* User Controls */}
            <div className="flex flex-col gap-2">

                {connected && connectionStrategy == ConnectionStrategies.WanderConnect && <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-12 h-12 rounded-2xl hover:rounded-xl hover:bg-primary/10 transition-all duration-200"
                        >
                            <Wallet className="w-5 h-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                        <p>Wallet</p>
                    </TooltipContent>
                </Tooltip>}

                {isInstallable && <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-12 h-12 rounded-2xl hover:rounded-xl hover:bg-primary/10 transition-all duration-200"
                            onClick={showInstallPrompt}
                        >
                            <Download className="w-5 h-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                        <p>Install App</p>
                    </TooltipContent>
                </Tooltip>}
            </div>

            {/* Join Server Dialog */}
            <Dialog open={isJoinDialogOpen || dialogState.isJoinDialogOpen} onOpenChange={(open) => {
                dispatch({ type: 'RESET_PROGRESS_STEPS' });
                if (open) {
                    dispatch({ type: 'OPEN_JOIN_DIALOG' });
                    dialogActions.openJoinDialog();
                } else {
                    dispatch({ type: 'CLOSE_JOIN_DIALOG' });
                    dispatch({ type: 'RESET_JOIN_FORM' });
                    dialogActions.closeJoinDialog();
                }
            }}>
                <DialogContent className="sm:max-w-md bg-background">
                    <DialogHeader className="text-center">
                        <DialogTitle className="text-2xl font-bold">Join a Server</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Enter an invite below to join an existing server
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Error Display */}
                        {dialogState.error && (
                            <Alert variant="destructive">
                                <AlertDescription>{dialogState.error}</AlertDescription>
                            </Alert>
                        )}

                        {/* Invite Input */}
                        <div className="space-y-2">
                            <Label htmlFor="server-invite" className="text-sm font-semibold text-foreground">
                                Invite Link <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="server-invite"
                                placeholder="https://subspace.com/hTKzmak"
                                value={dialogState.joinServerInput}
                                onChange={(e) => dispatch({ type: 'SET_JOIN_INPUT', payload: e.target.value })}
                                className="bg-background border-input"
                                disabled={dialogState.isLoading || dialogState.isFetchingServer}
                            />
                        </div>

                        {/* Server Preview */}
                        {dialogState.isFetchingServer && (
                            <div className="bg-muted/30 rounded-lg p-4 border border-dashed border-muted-foreground/30">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-muted rounded-full animate-pulse" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-muted rounded animate-pulse" />
                                        <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {dialogState.serverPreview && !dialogState.isFetchingServer && (
                            <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex-shrink-0">
                                        {dialogState.serverPreview.profile?.pfp ? (
                                            <img
                                                src={`https://arweave.net/${dialogState.serverPreview.profile.pfp}`}
                                                alt={dialogState.serverPreview.profile?.name || "Server"}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-semibold">
                                                {(dialogState.serverPreview.profile?.name || "S").charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm text-foreground truncate">
                                            {dialogState.serverPreview.profile?.name || "Unnamed Server"}
                                        </div>
                                        {dialogState.serverPreview.profile?.description && (
                                            <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                                {dialogState.serverPreview.profile.description}
                                            </div>
                                        )}
                                        {dialogState.serverPreview.member_count > 0 && (
                                            <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                                {dialogState.serverPreview.member_count} members
                                            </div>
                                        )}
                                        <div className="text-xs text-green-600 mt-1 font-medium">
                                            ✓ Server found
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Invite Examples - only show when not fetching and no server preview */}
                        {!dialogState.isFetchingServer && !dialogState.serverPreview && (
                            <>
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-foreground">Invites should look like</p>
                                    <div className="space-y-1 text-sm text-muted-foreground">
                                        <div>hTKzmak</div>
                                        <div>https://subspace.ar.io/#/invite/hTKzmak</div>
                                    </div>
                                </div>

                                {/* Server Discovery */}
                                <div className="bg-muted/70 rounded-lg p-4 mr-2 cursor-pointer hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                                            <Compass className="w-5 h-5 text-green-500" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-sm">Don't have an invite?</div>
                                            <div className="text-xs text-muted-foreground">Ask for one lol.</div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <DialogFooter className="flex-row justify-between items-center pt-4">
                        <div className="flex items-center gap-4 mr-auto">
                            <ProgressSteps
                                steps={[
                                    { key: 'joiningServer', label: 'Joining server' },
                                    { key: 'refreshingProfile', label: 'Refreshing profile' }
                                ]}
                                progressSteps={dialogState.progressSteps}
                            />
                        </div>
                        <div>
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    dispatch({ type: 'RESET_PROGRESS_STEPS' });
                                    dispatch({ type: 'CLOSE_JOIN_DIALOG' });
                                    dispatch({ type: 'RESET_JOIN_FORM' });
                                    dialogActions.closeJoinDialog();
                                }}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                Back
                            </Button>
                            <Button
                                onClick={handleJoinServerSubmit}
                                disabled={!dialogState.joinServerInput.trim() || !dialogState.serverPreview || dialogState.isLoading || dialogState.isFetchingServer}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
                            >
                                {dialogState.isFetchingServer
                                    ? "Checking..."
                                    : dialogState.isLoading
                                        ? "Joining..."
                                        : "Join Server"
                                }
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Server Dialog */}
            <Dialog open={isCreateDialogOpen || dialogState.isCreateDialogOpen} onOpenChange={(open) => {
                dispatch({ type: 'RESET_PROGRESS_STEPS' });
                if (open) {
                    dispatch({ type: 'OPEN_CREATE_DIALOG' });
                    dialogActions.openCreateDialog();
                } else {
                    dispatch({ type: 'CLOSE_CREATE_DIALOG' });
                    dispatch({ type: 'RESET_CREATE_FORM' });
                    dialogActions.closeCreateDialog();
                }
            }}>
                <DialogContent className="sm:max-w-md bg-background">
                    <DialogHeader className="text-center">
                        <DialogTitle className="text-2xl font-bold">Customize Your Server</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Give your new server a personality with a name and an icon. You can always change it later.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Error Display */}
                        {dialogState.error && (
                            <Alert variant="destructive">
                                <AlertDescription>{dialogState.error}</AlertDescription>
                            </Alert>
                        )}

                        {/* Server Icon Upload */}
                        <div className="flex justify-center">
                            <div className="relative">
                                <div className={cn(
                                    "w-20 h-20 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors",
                                    dialogState.serverIcon && "border-solid border-primary/20"
                                )}>
                                    {dialogState.serverIcon ? (
                                        <img
                                            src={dialogState.serverIcon}
                                            alt="Server icon"
                                            className="w-full h-full rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center gap-1">
                                            <Camera className="w-6 h-6 text-muted-foreground" />
                                            <span className="text-xs text-muted-foreground font-medium">UPLOAD</span>
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleIconUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    disabled={dialogState.isLoading || dialogState.isUploading}
                                />
                                {dialogState.serverIcon && (
                                    <Button
                                        size="icon"
                                        variant="secondary"
                                        className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                                        onClick={() => {
                                            dispatch({ type: 'SET_SERVER_ICON', payload: null });
                                            dispatch({ type: 'SET_SERVER_ICON_FILE', payload: null });
                                        }}
                                    >
                                        <Plus className="w-3 h-3 rotate-45" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Server Name */}
                        <div className="space-y-2">
                            <Label htmlFor="server-name" className="text-sm font-semibold text-foreground">
                                Server Name
                            </Label>
                            <Input
                                id="server-name"
                                placeholder="My Awesome Server"
                                value={dialogState.createServerName}
                                onChange={(e) => dispatch({ type: 'SET_SERVER_NAME', payload: e.target.value })}
                                className="bg-background border-input"
                                disabled={dialogState.isLoading || dialogState.isUploading}
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex-row justify-between items-center pt-4">
                        <div className="flex items-center gap-4 mr-auto">
                            <ProgressSteps
                                steps={[
                                    { key: 'uploadingImage', label: 'Uploading image' },
                                    { key: 'creatingServer', label: 'Creating server' },
                                    { key: 'joiningServer', label: 'Joining server' },
                                    { key: 'refreshingProfile', label: 'Refreshing profile' }
                                ]}
                                progressSteps={dialogState.progressSteps}
                            />
                        </div>
                        <div>
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    dispatch({ type: 'RESET_PROGRESS_STEPS' });
                                    dispatch({ type: 'CLOSE_CREATE_DIALOG' });
                                    dispatch({ type: 'RESET_CREATE_FORM' });
                                    dialogActions.closeCreateDialog();
                                }}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                Back
                            </Button>
                            <Button
                                onClick={handleCreateServerSubmit}
                                disabled={!dialogState.createServerName.trim() || dialogState.isLoading || dialogState.isUploading}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
                            >
                                {dialogState.isUploading
                                    ? "Uploading..."
                                    : dialogState.isLoading
                                        ? "Creating..."
                                        : "Create"
                                }
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}