import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Users, Hash, CheckCircle, Sparkles } from "lucide-react"
import alien from "@/assets/subspace/alien-black.svg"

interface ServerWelcomeDialogProps {
    isOpen: boolean
    onClose: () => void
    serverName: string
    serverLogo?: string
    memberCount: number
}

export default function ServerWelcomeDialog({
    isOpen,
    onClose,
    serverName,
    serverLogo,
    memberCount
}: ServerWelcomeDialogProps) {
    const [showConfetti, setShowConfetti] = useState(false)

    useEffect(() => {
        if (isOpen) {
            // Trigger confetti animation after a brief delay
            const timer = setTimeout(() => setShowConfetti(true), 300)
            return () => clearTimeout(timer)
        }
    }, [isOpen])

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-gradient-to-br backdrop-blur-sm from-background via-background/95 to-background/90 border-2 border-primary/10">
                {/* Confetti effect */}
                {showConfetti && (
                    <div className="absolute inset-0 z-20 pointer-events-none overflow-visible">
                        <div className="absolute top-10 left-1/4 transform">
                            <Sparkles className="w-4 h-4 text-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        </div>
                        <div className="absolute top-20 right-1/4 transform">
                            <Sparkles className="w-4 h-4 text-yellow-400 animate-bounce" style={{ animationDelay: '200ms' }} />
                        </div>
                        <div className="absolute top-1/2 right-10 transform">
                            <Sparkles className="w-4 h-4 text-green-400 animate-bounce" style={{ animationDelay: '400ms' }} />
                        </div>
                    </div>
                )}

                <DialogHeader className="text-center space-y-6">
                    {/* Server Icon with success indicator */}
                    <div className="flex justify-center">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border-2 border-primary/30">
                                {serverLogo ? (
                                    <img
                                        src={serverLogo}
                                        alt={serverName}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <img src={alien} alt="server" className="w-10 h-10 opacity-80" />
                                )}
                            </div>
                            {/* Success checkmark */}
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 p-0 bg-green-500 rounded-full flex items-center justify-center border-2 border-background shadow-lg">
                                <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 text-center">
                        <DialogTitle className="text-2xl font-bold text-primary font-ocr">
                            Welcome to {serverName}!
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground text-sm">
                            You've successfully joined the server. <br />Get ready to connect with the community!
                        </DialogDescription>
                    </div>

                    {/* Server Stats */}
                    <div className="flex items-center justify-center gap-6 py-4">
                        <div className="flex items-center gap-2 text-sm">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                <Users className="w-4 h-4 text-primary" />
                            </div>
                            <span className="text-muted-foreground">
                                {memberCount} {memberCount === 1 ? 'member' : 'members'}
                            </span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-green-500" />
                        <span className="text-green-500 text-sm font-medium">You're in!</span>
                    </div>

                    {/* Getting Started Tips */}
                    <div className="space-y-4 text-center bg-card/30 rounded-xl p-4 border border-border/20">
                        <h4 className="font-semibold text-foreground text-center text-sm">Getting Started</h4>
                        <div className="space-y-2">
                            <div className="flex items-center justify-center gap-3">
                                <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Hash className="w-3 h-3 text-primary" />
                                </div>
                                <span className="text-muted-foreground text-xs">
                                    Browse channels in the sidebar to join conversations
                                </span>
                            </div>
                            <div className="flex items-center justify-center gap-3">
                                <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Users className="w-3 h-3 text-primary" />
                                </div>
                                <span className="text-muted-foreground text-xs">
                                    Check the member list to see who's online and active
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <Button
                        onClick={onClose}
                        className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-medium py-2"
                    >
                        Start Exploring
                    </Button>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    )
}