import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Loader2, Sparkles } from "lucide-react"
import alien from "@/assets/subspace/alien-black.svg"
import { useSubspace } from "@/hooks/use-subspace"

export default function ProfileCreationDialog() {
    const { isCreatingProfile } = useSubspace()

    // Only show dialog when actually creating a profile
    if (!isCreatingProfile) return null

    return (
        <Dialog open={true} onOpenChange={() => { }}>
            <DialogContent className="max-w-md w-[95vw] p-6 outline-0 overflow-hidden flex flex-col bg-background border border-primary/30 shadow-2xl">
                <div className="flex flex-col items-center justify-center py-8 gap-6">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-sm overflow-hidden bg-primary/20 flex items-center justify-center border-2 border-primary/30">
                            <img src={alien} alt="alien" className="w-12 h-12 opacity-60 animate-pulse" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-primary text-black rounded-sm p-2 shadow-lg border border-primary/30">
                            <Sparkles className="h-4 w-4 animate-spin" />
                        </div>
                    </div>
                    <div className="text-center space-y-4">
                        <h2 className="text-xl font-freecam text-primary">Creating Your Profile</h2>
                        <p className="text-sm text-primary/80 font-ocr">
                            Please wait while we set up your profile on the Permaweb.
                        </p>
                        <p className="text-xs text-primary/60 font-ocr">
                            Do not close this tab or refresh the page.
                        </p>
                        <div className="flex items-center justify-center gap-2 text-primary/80">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm font-ocr">Initializing...</span>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
} 