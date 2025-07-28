import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, User, Sparkles, Check, X } from "lucide-react"
import alien from "@/assets/subspace/alien-green.svg"
import { useState, useEffect } from "react"
import { useSubspace } from "@/hooks/use-subspace"
import { useWallet } from "@/hooks/use-wallet"
import { toast } from "sonner"

interface NicknameSettingDialogProps {
    isOpen: boolean
    serverId: string | null
    serverName?: string
    onClose: () => void
    onSkip: (serverId: string) => void
}

export default function NicknameSettingDialog({
    isOpen,
    serverId,
    serverName,
    onClose,
    onSkip
}: NicknameSettingDialogProps) {
    const [nickname, setNickname] = useState("")
    const [isSkipping, setIsSkipping] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const { actions } = useSubspace()
    const { address } = useWallet()

    // Reset states when dialog opens or serverId changes
    useEffect(() => {
        if (isOpen) {
            setNickname("")
            setIsSkipping(false)
            setIsSaving(false)
        }
    }, [isOpen, serverId])

    const handleSetNickname = async () => {
        if (!serverId || !address) return

        setIsSaving(true)
        try {
            const trimmedNickname = nickname.trim()
            const success = await actions.servers.updateMember(serverId, {
                userId: address,
                nickname: trimmedNickname  // Allow empty strings to clear nickname
            })

            if (success) {
                const message = trimmedNickname === "" ? "Nickname cleared successfully!" : "Nickname set successfully!"
                toast.success(message, {
                    richColors: true,
                    style: {
                        backgroundColor: "var(--background)",
                        color: "var(--foreground)",
                        border: "1px solid var(--border)",
                        borderRadius: "12px",
                        boxShadow: "0 10px 25px -5px rgba(34, 197, 94, 0.15), 0 4px 6px -2px rgba(34, 197, 94, 0.1)",
                    },
                })

                // Refresh member data to ensure parent component can detect the change
                try {
                    await actions.servers.refreshMembers(serverId)
                } catch (error) {
                    console.warn("Failed to refresh members after setting nickname:", error)
                }

                onClose()
            } else {
                toast.error("Failed to set nickname")
            }
        } catch (error) {
            console.error("Error setting nickname:", error)
            toast.error("Failed to set nickname")
        } finally {
            setIsSaving(false)
        }
    }

    const handleSkip = () => {
        if (!serverId) return

        setIsSkipping(true)
        // Small delay for better UX
        setTimeout(() => {
            onSkip(serverId)
        }, 300)
    }

    const handleDialogClose = (open: boolean) => {
        // If dialog is being closed (open = false), treat it as skip
        if (!open) {
            handleSkip()
        }
    }

    const handleInputKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !isSaving) {
            handleSetNickname()
        } else if (e.key === "Escape" && !isSaving) {
            handleSkip()
        }
    }

    if (!isOpen || !serverId) return null

    return (
        <Dialog open={true} onOpenChange={handleDialogClose}>
            <DialogContent removeCloseButton className="max-w-md w-[95vw] p-6 outline-0 overflow-hidden flex flex-col bg-background border border-primary/30 shadow-2xl">
                {/* Close button */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSkip}
                    disabled={isSaving || isSkipping}
                    className="absolute right-4 top-4 h-8 w-8 p-0 text-primary/60 hover:text-primary hover:bg-primary/10"
                >
                    <X className="h-4 w-4" />
                </Button>

                <div className="flex flex-col items-center justify-center py-4 gap-6">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-sm overflow-hidden bg-primary/20 flex items-center justify-center border-2 border-primary/30">
                            <img src={alien} alt="alien" className="w-10 h-10 opacity-80" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-primary text-black rounded-sm p-2 shadow-lg border border-primary/30">
                            <User className="h-4 w-4" />
                        </div>
                    </div>

                    <div className="text-center space-y-3">
                        <h2 className="text-lg font-freecam text-primary">Set Your Nickname</h2>
                        <p className="text-sm text-primary/80 font-ocr">
                            {serverName ? `Choose how you'd like to appear in ${serverName}` : "Choose how you'd like to appear in this server"}
                        </p>
                    </div>

                    <div className="w-full space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="nickname" className="text-sm font-ocr text-primary/90">
                                Nickname
                            </Label>
                            <Input
                                id="nickname"
                                type="text"
                                placeholder="Enter your nickname..."
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                onKeyDown={handleInputKeyDown}
                                className="font-ocr border-primary/30 focus:border-primary/60"
                                maxLength={32}
                                disabled={isSaving}
                            />
                            <p className="text-xs text-primary/60 font-ocr">
                                {nickname.trim() === "" ? "Leave empty to skip setting a nickname" : "This will be your display name in this server"}
                            </p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="outline"
                                onClick={handleSkip}
                                disabled={isSaving || isSkipping}
                                className="flex-1 font-ocr border-primary/30 text-primary/80 hover:bg-primary/10"
                            >
                                {isSkipping ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Skipping...
                                    </>
                                ) : (
                                    "Skip for now"
                                )}
                            </Button>
                            <Button
                                onClick={handleSetNickname}
                                disabled={isSaving || nickname.trim() == ""}
                                className="flex-1 font-ocr bg-primary hover:bg-primary/90 text-black"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Setting...
                                    </>
                                ) : (
                                    <>
                                        <Check className="h-4 w-4 mr-2" />
                                        Set Nickname
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="text-center space-y-2">
                        <p className="text-xs text-primary/50 font-ocr">
                            You can change this later in server settings
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
} 