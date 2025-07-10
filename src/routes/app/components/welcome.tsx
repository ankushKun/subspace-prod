import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import LoginDialog from "@/components/login-dialog"
import { useWallet } from "@/hooks/use-wallet"
import alien from "@/assets/subspace/alien-black.svg"

export default function Welcome({ className }: { className?: string }) {
    const { connected } = useWallet()

    return <div className={cn("flex flex-col items-center justify-center h-screen w-screen text-center relative overflow-hidden", className)}>
        <div className="max-w-4xl mx-auto text-center space-y-8">

            <div className="font-freecam text-2xl flex flex-col items-center justify-center gap-6">

                <div className="flex flex-col lg:flex-row items-center justify-center gap-3">
                    <div className="text-2xl">Welcome to</div>
                    <div className="text-primary text-4xl">Subspace</div>
                </div>

                <div className="flex items-center justify-center gap-2 text-center text-base text-muted-foreground">
                    Connect with communities,<br /> join conversations, and share<br />
                    ideas in a decentralized space
                </div>
            </div>

            {/* Action hints */}
            <div className="flex flex-col items-center space-y-4 sm:space-y-6 mt-12 md:mt-16 px-4">
                <div className="text-muted-foreground max-w-2xl mx-auto font-freecam text-sm sm:text-base leading-relaxed">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="text-primary">👥</span>
                        <span className="font-ocr">Join a server to connect with communities</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-primary">💬</span>
                        <span className="font-ocr">Start a direct message conversation</span>
                    </div>
                </div>

                {/* Login Button - only show if not connected */}
                {!connected && (
                    <div className="mt-8">
                        <LoginDialog>
                            <Button
                                variant="outline"
                                className="flex items-center gap-3 px-6 py-3 h-auto hover:bg-primary/10 transition-colors font-ocr text-primary border-primary/30 hover:border-primary/50 bg-primary/5 backdrop-blur-sm shadow-lg"
                            >
                                {/* Alien Avatar */}
                                <div className="relative flex-shrink-0">
                                    <div className="w-8 h-8 rounded-sm overflow-hidden bg-primary/20 flex items-center justify-center border border-primary/30">
                                        <img src={alien} alt="alien" className="w-5 h-5 opacity-80" />
                                    </div>
                                    {/* Disconnected status indicator */}
                                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-sm border border-background animate-pulse"></div>
                                </div>

                                {/* Login Text */}
                                <div className="flex flex-col text-left">
                                    <span className="text-sm font-medium text-primary">
                                        Sign In
                                    </span>
                                    <span className="text-xs text-primary/60">
                                        Join the conversation
                                    </span>
                                </div>
                            </Button>
                        </LoginDialog>
                    </div>
                )}
            </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-primary/20 rounded-full animate-pulse"></div>
            <div className="absolute top-1/3 right-1/3 w-0.5 h-0.5 bg-primary/30 rounded-full animate-pulse delay-1000"></div>
            <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-primary/10 rounded-full animate-pulse delay-2000"></div>
            <div className="absolute bottom-1/4 right-1/4 w-0.5 h-0.5 bg-primary/40 rounded-full animate-pulse delay-1500"></div>
        </div>
    </div>
}