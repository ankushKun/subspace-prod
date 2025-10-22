import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubspaceActions, useProfile } from "@/hooks/use-subspace";
import { useWallet } from "@/hooks/use-wallet";
import { useGlobalState } from "@/hooks/use-global-state";
import { useNavigate, useSearchParams } from "react-router";
import { useState, useReducer, useEffect, useCallback } from "react";
import {
    Server,
    Users,
    CheckCircle,
    AlertCircle,
    Loader2,
    ExternalLink,
    ArrowLeft,
    Compass
} from "lucide-react";
import { cn } from "@/lib/utils";
import alienGreen from "@/assets/subspace/alien-green.svg";

// State management for invite page
interface InviteState {
    serverId: string;
    serverPreview: any | null;
    isLoading: boolean;
    isFetchingServer: boolean;
    isJoining: boolean;
    error: string | null;
    success: boolean;
    progressSteps: {
        fetchingServer?: 'pending' | 'active' | 'completed';
        joiningServer?: 'pending' | 'active' | 'completed';
        refreshingProfile?: 'pending' | 'active' | 'completed';
    };
}

type InviteAction =
    | { type: 'SET_SERVER_ID'; payload: string }
    | { type: 'SET_SERVER_PREVIEW'; payload: any | null }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_FETCHING_SERVER'; payload: boolean }
    | { type: 'SET_JOINING'; payload: boolean }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'SET_SUCCESS'; payload: boolean }
    | { type: 'SET_PROGRESS_STEP'; payload: { step: keyof InviteState['progressSteps']; status: 'pending' | 'active' | 'completed' } }
    | { type: 'RESET_PROGRESS_STEPS' }
    | { type: 'RESET_STATE' };

const initialInviteState: InviteState = {
    serverId: "",
    serverPreview: null,
    isLoading: false,
    isFetchingServer: false,
    isJoining: false,
    error: null,
    success: false,
    progressSteps: {},
};

function inviteReducer(state: InviteState, action: InviteAction): InviteState {
    switch (action.type) {
        case 'SET_SERVER_ID':
            return { ...state, serverId: action.payload };
        case 'SET_SERVER_PREVIEW':
            return { ...state, serverPreview: action.payload };
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'SET_FETCHING_SERVER':
            return { ...state, isFetchingServer: action.payload };
        case 'SET_JOINING':
            return { ...state, isJoining: action.payload };
        case 'SET_ERROR':
            return { ...state, error: action.payload };
        case 'SET_SUCCESS':
            return { ...state, success: action.payload };
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
        case 'RESET_STATE':
            return initialInviteState;
        default:
            return state;
    }
}

function ProgressSteps({
    steps,
    progressSteps
}: {
    steps: Array<{ key: keyof InviteState['progressSteps']; label: string }>;
    progressSteps: InviteState['progressSteps'];
}) {
    const activeStep = steps.find(step => progressSteps[step.key] === 'active');
    const completedSteps = steps.filter(step => progressSteps[step.key] === 'completed');

    return (
        <div className="flex items-center gap-2">
            {steps.map((step, index) => (
                <div key={step.key} className="flex items-center gap-2">
                    <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                        progressSteps[step.key] === 'completed' && "bg-green-500 text-white",
                        progressSteps[step.key] === 'active' && "bg-primary text-primary-foreground animate-pulse",
                        progressSteps[step.key] === 'pending' && "bg-muted text-muted-foreground"
                    )}>
                        {progressSteps[step.key] === 'completed' ? (
                            <CheckCircle className="w-3 h-3" />
                        ) : (
                            index + 1
                        )}
                    </div>
                    <span className={cn(
                        "text-sm",
                        progressSteps[step.key] === 'active' && "text-primary font-medium",
                        progressSteps[step.key] === 'completed' && "text-green-600 font-medium"
                    )}>
                        {step.label}
                    </span>
                    {index < steps.length - 1 && (
                        <div className={cn(
                            "w-8 h-px",
                            progressSteps[step.key] === 'completed' ? "bg-green-500" : "bg-muted"
                        )} />
                    )}
                </div>
            ))}
        </div>
    );
}

export default function Invite() {
    const { address, connected } = useWallet();
    const { servers, profiles } = useSubspaceActions();
    const { actions: globalStateActions } = useGlobalState();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [state, dispatch] = useReducer(inviteReducer, initialInviteState);

    // Get server ID from URL params
    const serverIdFromUrl = searchParams.get('id') || '';

    useEffect(() => {
        if (serverIdFromUrl) {
            dispatch({ type: 'SET_SERVER_ID', payload: serverIdFromUrl });
            fetchServerDetails(serverIdFromUrl);
        }
    }, [serverIdFromUrl]);

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

            const serverDetails = await servers.get(cleanServerId);

            if (serverDetails) {
                dispatch({ type: 'SET_SERVER_PREVIEW', payload: serverDetails });
                dispatch({ type: 'SET_SERVER_ID', payload: cleanServerId });
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
    }, [servers]);

    const handleJoinServer = async () => {
        if (!state.serverPreview || !connected) return;

        dispatch({ type: 'SET_JOINING', payload: true });
        dispatch({ type: 'SET_ERROR', payload: null });

        try {
            const serverId = state.serverPreview.profile.id;

            // Join server
            dispatch({ type: 'SET_PROGRESS_STEP', payload: { step: 'joiningServer', status: 'active' } });
            const success = await servers.join(serverId);

            if (success) {
                dispatch({ type: 'SET_PROGRESS_STEP', payload: { step: 'joiningServer', status: 'completed' } });

                // Refetch user profile to update server list
                if (address) {
                    dispatch({ type: 'SET_PROGRESS_STEP', payload: { step: 'refreshingProfile', status: 'active' } });
                    await profiles.get(address);
                    dispatch({ type: 'SET_PROGRESS_STEP', payload: { step: 'refreshingProfile', status: 'completed' } });
                }

                dispatch({ type: 'SET_SUCCESS', payload: true });

                // Navigate to the server after a short delay
                setTimeout(() => {
                    navigate(`/app/${serverId}`);
                }, 2000);
            } else {
                dispatch({ type: 'SET_ERROR', payload: 'Failed to join server. Please try again.' });
            }
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: 'An error occurred while joining the server. Please try again.' });
        } finally {
            dispatch({ type: 'SET_JOINING', payload: false });
        }
    };

    const handleBackToApp = () => {
        navigate('/app');
    };

    const handleTryAgain = () => {
        if (state.serverId) {
            fetchServerDetails(state.serverId);
        }
    };

    if (!connected) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                            <img src={alienGreen} alt="Subspace" className="w-10 h-10" />
                        </div>
                        <CardTitle className="text-2xl">Connect to Join</CardTitle>
                        <CardDescription>
                            You need to connect your wallet to join this server
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button
                            onClick={handleBackToApp}
                            className="w-full"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Go to App
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                        <img src={alienGreen} alt="Subspace" className="w-10 h-10" />
                    </div>
                    <CardTitle className="text-2xl">Server Invite</CardTitle>
                    <CardDescription>
                        {state.success
                            ? "Successfully joined the server!"
                            : "You've been invited to join a server"
                        }
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Error Display */}
                    {state.error && (
                        <Alert variant="destructive">
                            <AlertCircle className="w-4 h-4" />
                            <AlertDescription>{state.error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Success State */}
                    {state.success && (
                        <Alert className="border-green-200 bg-green-50">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <AlertDescription className="text-green-800">
                                You've successfully joined the server! Redirecting you now...
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Server Preview */}
                    {state.isFetchingServer && (
                        <div className="bg-muted/30 rounded-lg p-6 border border-dashed border-muted-foreground/30">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-muted rounded-full animate-pulse" />
                                <div className="flex-1 space-y-3">
                                    <div className="h-5 bg-muted rounded animate-pulse" />
                                    <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
                                    <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                                </div>
                            </div>
                        </div>
                    )}

                    {state.serverPreview && !state.isFetchingServer && (
                        <div className="bg-primary/5 rounded-lg p-6 border border-primary/20">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex-shrink-0">
                                    {state.serverPreview.profile?.pfp ? (
                                        <img
                                            src={`https://arweave.net/${state.serverPreview.profile.pfp}`}
                                            alt={state.serverPreview.profile?.name || "Server"}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-semibold text-xl">
                                            {(state.serverPreview.profile?.name || "S").charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-semibold text-lg text-foreground truncate">
                                            {state.serverPreview.profile?.name || "Unnamed Server"}
                                        </h3>
                                        <Badge variant="secondary" className="text-xs">
                                            <Server className="w-3 h-3 mr-1" />
                                            Server
                                        </Badge>
                                    </div>
                                    {state.serverPreview.profile?.description && (
                                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                            {state.serverPreview.profile.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        {state.serverPreview.member_count > 0 && (
                                            <div className="flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {state.serverPreview.member_count} members
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1 text-green-600">
                                            <CheckCircle className="w-3 h-3" />
                                            Server found
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* No Server Found */}
                    {!state.serverPreview && !state.isFetchingServer && !state.error && (
                        <div className="bg-muted/30 rounded-lg p-6 border border-dashed border-muted-foreground/30 text-center">
                            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                                <Compass className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <h3 className="font-medium text-foreground mb-2">Server Not Found</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                The invite link appears to be invalid or the server no longer exists.
                            </p>
                            <Button variant="outline" onClick={handleTryAgain} size="sm">
                                Try Again
                            </Button>
                        </div>
                    )}

                    {/* Progress Steps */}
                    {(state.isJoining || state.serverPreview) && (
                        <div className="space-y-4">
                            <div className="text-sm font-medium text-foreground">Progress</div>
                            <ProgressSteps
                                steps={[
                                    { key: 'fetchingServer', label: 'Fetching server' },
                                    { key: 'joiningServer', label: 'Joining server' },
                                    { key: 'refreshingProfile', label: 'Updating profile' }
                                ]}
                                progressSteps={state.progressSteps}
                            />
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={handleBackToApp}
                            className="flex-1"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to App
                        </Button>

                        {state.serverPreview && !state.success && (
                            <Button
                                onClick={handleJoinServer}
                                disabled={state.isJoining || state.isFetchingServer}
                                className="flex-1"
                            >
                                {state.isJoining ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Joining...
                                    </>
                                ) : (
                                    <>
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        Join Server
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}