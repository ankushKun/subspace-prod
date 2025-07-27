import { createRoot } from 'react-dom/client'
import './index.css'
import { HashRouter, Route, Routes, useParams } from "react-router";
import { ThemeProvider, useTheme } from '@/components/theme-provider';
import SubspaceLanding from './routes/landing';
import App from '@/routes/app';
import Settings from '@/routes/settings';
import ServerSettings from '@/routes/app/server-settings';
import { ConnectionStrategies, useWallet } from '@/hooks/use-wallet';
import { useEffect, useState } from 'react';
import { useCallback } from 'react';
import { useGlobalState } from '@/hooks/use-global-state';
import { useSubspace } from '@/hooks/use-subspace';
import React, { Component } from 'react';
import type { ReactNode } from 'react';
import { PostHogProvider } from 'posthog-js/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import alien from '@/assets/subspace/alien-green.svg';
import { Toaster } from 'sonner';
import Invite from '@/routes/invite';

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
    showDetails: boolean;
}

const skipErrors = [
    "no wallets added",
    "profile already exists",
    "user cancelled the authrequest",
    "profile not found",
    "session password not available - please reconnect",
    "removeChild"
]

class ErrorBoundary extends Component<{ children: ReactNode; onError?: (error: Error) => void }, ErrorBoundaryState> {
    constructor(props: { children: ReactNode; onError?: (error: Error) => void }) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            showDetails: false
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.setState({
            error,
            errorInfo
        });

        // Log error to console for debugging
        console.error('Error Boundary caught an error:', error, errorInfo);

        // Call the onError callback if provided
        if (this.props.onError) {
            this.props.onError(error);
        }
    }

    // Public method to set errors from outside the component tree
    setError = (error: Error) => {
        this.setState({
            hasError: true,
            error,
            errorInfo: null
        });
    }

    handleReload = () => {
        window.location.reload();
    };

    toggleDetails = () => {
        this.setState(prev => ({ showDetails: !prev.showDetails }));
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen w-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
                    {/* Background effects */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary)/0.03)_0%,transparent_50%)] pointer-events-none" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(var(--primary)/0.03)_0%,transparent_50%)] pointer-events-none" />

                    <Card className="w-full max-w-2xl bg-card border-primary/30 shadow-2xl backdrop-blur-sm relative">
                        {/* Card glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-xl pointer-events-none" />

                        <div className="relative z-10 p-8 space-y-6">
                            {/* Header */}
                            <div className="text-center space-y-4">
                                <div className="flex items-center justify-center">
                                    <div className="relative">
                                        <div className="flex items-center justify-center w-16 h-16 bg-destructive/20 rounded-full border border-destructive/30">
                                            <img src={alien} alt="alien" className="w-8 h-8 opacity-80 filter" />
                                        </div>
                                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-destructive/80 rounded-full flex items-center justify-center">
                                            <AlertTriangle className="w-3 h-3 text-white" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h1 className="text-2xl font-freecam text-destructive tracking-wide">
                                        SYSTEM MALFUNCTION
                                    </h1>
                                    <p className="text-primary/80 font-ocr text-sm leading-relaxed max-w-lg mx-auto">
                                        The subspace communication array has encountered an unexpected error.
                                        Our alien technicians are standing by to assist with diagnostics.
                                    </p>
                                </div>
                            </div>

                            {/* Error Message */}
                            <div className="p-4 bg-destructive/10 rounded-sm border border-destructive/30">
                                <p className="text-destructive font-ocr text-sm break-words">
                                    <strong>Error:</strong> {this.state.error?.message || 'Unknown error occurred'}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Button
                                    onClick={this.handleReload}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-ocr gap-2"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    RESTART SYSTEM
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={this.toggleDetails}
                                    className="border-primary/30 text-primary hover:bg-primary/10 font-ocr gap-2"
                                >
                                    {this.state.showDetails ? (
                                        <ChevronDown className="w-4 h-4" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4" />
                                    )}
                                    DIAGNOSTIC DATA
                                </Button>
                            </div>

                            {/* Expandable Error Details */}
                            {this.state.showDetails && (
                                <div className="space-y-4 border-t border-primary/20 pt-6">
                                    <h3 className="text-primary font-freecam text-sm tracking-wide">
                                        TECHNICAL ANALYSIS
                                    </h3>

                                    <div className="space-y-3">
                                        {this.state.error && (
                                            <div className="p-3 bg-background border border-primary/20 rounded-sm">
                                                <h4 className="text-xs font-ocr text-primary/80 mb-2">Error Stack:</h4>
                                                <pre className="text-xs font-mono text-primary/70 whitespace-pre-wrap break-words overflow-auto max-h-40 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                                                    {this.state.error.stack}
                                                </pre>
                                            </div>
                                        )}

                                        {this.state.errorInfo && (
                                            <div className="p-3 bg-background border border-primary/20 rounded-sm">
                                                <h4 className="text-xs font-ocr text-primary/80 mb-2">Component Stack:</h4>
                                                <pre className="text-xs font-mono text-primary/70 whitespace-pre-wrap break-words overflow-auto max-h-40 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                                                    {this.state.errorInfo.componentStack}
                                                </pre>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-3 bg-primary/5 rounded-sm border border-primary/20">
                                        <p className="text-xs text-primary/80 font-ocr leading-relaxed">
                                            <strong className="text-primary">Mission Control:</strong> Please report this error to the development team
                                            with the diagnostic data above for faster resolution.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}

// Create a ref to the ErrorBoundary so we can call setError from async code
let errorBoundaryRef: ErrorBoundary | null = null;

// Global error handler for uncaught async errors
const handleAsyncError = (error: Error) => {
    console.error('Async error caught:', error);
    if (`${error}`.includes("password not available")) {
        // localStorage.removeItem("pocketbase_auth")
        // sessionStorage.removeItem("wauth_encrypted_password")
        // sessionStorage.removeItem("wauth_session_key")
    }
    if (skipErrors.some(error => `${error}`.toLowerCase().includes(error))) return
    if (errorBoundaryRef) {
        errorBoundaryRef.setError(error);
    }
};

// Set up global error handlers for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault(); // Prevent the default browser error handling
    if (skipErrors.some(error => `${event.reason}`.toLowerCase().includes(error))) return
    handleAsyncError(new Error(event.reason?.message || event.reason || 'Unhandled promise rejection'));
});

// Set up global error handler for uncaught errors
window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
    handleAsyncError(event.error || new Error(event.message));
});

// Component to render the themed toaster inside the theme provider
function ThemedToaster() {
    const { theme } = useTheme();

    return (
        <Toaster
            theme={theme === "system" ? undefined : theme as "light" | "dark"}
            // richColors
            style={{
                "--normal-bg": "var(--background)",
                "--normal-text": "var(--foreground)",
                "--normal-border": "var(--border)",
            } as React.CSSProperties}
        />
    );
}

function Main() {
    const { actions: subspaceActions } = useSubspace()
    const { jwk, address, connected, connectionStrategy, provider, actions: walletActions } = useWallet()
    const [errorBoundary, setErrorBoundary] = useState<ErrorBoundary | null>(null);

    // Set the global error boundary reference
    useEffect(() => {
        errorBoundaryRef = errorBoundary;
        return () => {
            errorBoundaryRef = null;
        };
    }, [errorBoundary]);

    const handleConnection = async function () {
        if (!connectionStrategy) return

        try {
            // For WAuth strategy, wait for initialization to complete first
            if (connectionStrategy === ConnectionStrategies.WAuth) {
                await walletActions.waitForWAuthInit();
            }

            if (connectionStrategy === ConnectionStrategies.ScannedJWK) {
                await walletActions.connect({ strategy: connectionStrategy, jwk })
            } else if (connectionStrategy === ConnectionStrategies.WAuth) {
                await walletActions.connect({ strategy: connectionStrategy, provider })
            } else {
                await walletActions.connect({ strategy: connectionStrategy })
            }
        } catch (error) {
            console.error("Connection failed:", error)
            handleAsyncError(error as Error)
        }
    }

    useEffect(() => {
        handleConnection().catch((error) => {
            console.error("Connection effect failed:", error);
            handleAsyncError(error);
        });
    }, [])

    useEffect(() => {
        if (connected && address) {
            try {
                subspaceActions.init()
            } catch (error) {
                console.error("Subspace initialization failed:", error)
                handleAsyncError(error as Error)
            }
        }
    }, [connected, address])

    return (
        <ErrorBoundary
            ref={setErrorBoundary}
            onError={handleAsyncError}
        >
            <ThemeProvider defaultTheme="dark">
                <ThemedToaster />
                <HashRouter>
                    <Routes>
                        <Route path="/" element={<SubspaceLanding />} />
                        <Route path="/app" element={<App />} />
                        <Route path="/invite/:invite" element={<Invite />} />
                        <Route path="/app/settings" element={<Settings />} />
                        <Route path="/app/:serverId" element={<App />} />
                        <Route path="/app/:serverId/:channelId" element={<App />} />
                        <Route path="/app/:serverId/settings" element={<ServerSettings />} />
                    </Routes>
                </HashRouter>
            </ThemeProvider>
        </ErrorBoundary>
    )
}

createRoot(document.getElementById('root')!).render(
    <PostHogProvider
        apiKey="phc_SqWBgq3YjrOdX1UmcMh3OtYlxoSfjA5cqJbq0IGrCz1"
        options={{
            api_host: "https://eu.i.posthog.com",
            defaults: '2025-05-24',
            capture_exceptions: true,
            debug: import.meta.env.MODE === "development",
        }}
    >
        <Main />
    </PostHogProvider>
)