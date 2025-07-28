import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Upload, X, Loader2, Save, RotateCcw } from "lucide-react"
import { useSubspace } from "@/hooks/use-subspace"
import { useGlobalState } from "@/hooks/use-global-state"
import { useWallet } from "@/hooks/use-wallet"
import { toast } from "sonner"

export default function ServerProfile() {
    const { activeServerId } = useGlobalState()
    const { servers, actions: subspaceActions } = useSubspace()
    const { address: walletAddress } = useWallet()

    // Get the current server
    const server = servers[activeServerId]

    // Form state
    const [serverName, setServerName] = useState("")
    const [serverDescription, setServerDescription] = useState("")
    const [serverIcon, setServerIcon] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // Initialize form with server data
    useEffect(() => {
        if (server) {
            setServerName(server.name || "")
            setServerDescription(server.description || "")
            setServerIcon(server.logo ? `https://arweave.net/${server.logo}` : null)
        }
    }, [server])

    // Check if user is server owner
    const isOwner = server?.ownerId === walletAddress

    // Check if form has changes
    const hasChanges = server && (
        serverName !== (server.name || "") ||
        serverDescription !== (server.description || "") ||
        (serverIcon && !serverIcon.startsWith('https://arweave.net/')) // New uploaded image
    )

    const handleIconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be smaller than 5MB")
            return
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error("Please select a valid image file")
            return
        }

        setIsUploading(true)
        try {
            // Create FormData for upload
            const formData = new FormData()
            formData.append('file', file)

            // Upload to Arweave (you'll need to implement this endpoint)
            // For now, we'll use a data URL as placeholder
            const reader = new FileReader()
            reader.onload = (e) => {
                setServerIcon(e.target?.result as string)
                setIsUploading(false)
            }
            reader.readAsDataURL(file)
        } catch (error) {
            console.error("Failed to upload image:", error)
            toast.error("Failed to upload image")
            setIsUploading(false)
        }
    }

    const removeIcon = () => {
        setServerIcon(null)
    }

    const resetForm = () => {
        if (server) {
            setServerName(server.name || "")
            setServerDescription(server.description || "")
            setServerIcon(server.logo ? `https://arweave.net/${server.logo}` : null)
        }
    }

    const handleSave = async () => {
        if (!server || !activeServerId || !isOwner) {
            toast.error("You don't have permission to update this server")
            return
        }

        if (!serverName.trim()) {
            toast.error("Server name is required")
            return
        }

        setIsSaving(true)
        try {
            // Prepare update parameters
            const updateParams: { name?: string; logo?: string; description?: string } = {}

            if (serverName !== server.name) {
                updateParams.name = serverName.trim()
            }

            if (serverDescription !== (server.description || "")) {
                updateParams.description = serverDescription.trim()
            }

            // Handle logo update (this would need proper Arweave upload implementation)
            if (serverIcon && !serverIcon.startsWith('https://arweave.net/')) {
                // For now, we'll skip logo updates since it requires Arweave upload
                // updateParams.logo = "uploaded-logo-hash"
                toast.warning("Logo upload coming soon. Name and description will be updated.")
            }

            const success = await subspaceActions.servers.update(activeServerId, updateParams)

            if (success) {
                toast.success("Server profile updated successfully!")
            } else {
                toast.error("Failed to update server profile")
            }
        } catch (error) {
            console.error("Failed to save server profile:", error)
            toast.error("Failed to update server profile")
        } finally {
            setIsSaving(false)
        }
    }

    if (!server) {
        return (
            <div className="flex items-center justify-center min-h-[600px] relative">
                {/* Background decoration */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary)/0.01)_0%,transparent_50%)] pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(var(--primary)/0.01)_0%,transparent_50%)] pointer-events-none" />

                <div className="text-center space-y-4 relative z-10">
                    <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    </div>
                    <div>
                        <h3 className="font-freecam text-sm uppercase tracking-wide text-primary">Loading Server</h3>
                        <p className="text-xs text-primary/60 mt-1 font-ocr">
                            Fetching server data...
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    if (!isOwner) {
        return (
            <div className="flex items-center justify-center min-h-[600px] relative">
                {/* Background decoration */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(red/0.01)_0%,transparent_50%)] pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(red/0.01)_0%,transparent_50%)] pointer-events-none" />

                <div className="text-center space-y-4 relative z-10">
                    <div className="w-12 h-12 mx-auto bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                        <X className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                        <h3 className="font-freecam text-sm uppercase tracking-wide text-red-500">Access Denied</h3>
                        <p className="text-xs text-red-500/80 mt-1 font-ocr">
                            Only the server owner can edit server settings.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6 relative">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary)/0.01)_0%,transparent_50%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(var(--primary)/0.01)_0%,transparent_50%)] pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                {/* Server Name */}
                <Card className="border-primary/10 shadow-md backdrop-blur-sm bg-card/30 relative">
                    {/* Card glow effect */}
                    <div className="absolute inset-0 from-primary/2 via-transparent to-primary/2 rounded-xl pointer-events-none" />

                    <CardHeader className="relative z-10 pb-3">
                        <CardTitle className="font-freecam text-primary/80 tracking-wide text-sm uppercase">SERVER NAME</CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <Input
                            value={serverName}
                            onChange={(e) => setServerName(e.target.value)}
                            placeholder="Enter server name"
                            className="font-ocr bg-background/80 border-primary/20 focus:border-primary/40 focus:ring-primary/15"
                            maxLength={100}
                        />
                        <p className="text-xs text-primary/60 mt-2 font-ocr">
                            {serverName.length}/100 characters
                        </p>
                    </CardContent>
                </Card>

                {/* Server Icon */}
                <Card className="border-primary/10 shadow-md backdrop-blur-sm bg-card/30 relative">
                    {/* Card glow effect */}
                    <div className="absolute inset-0 from-primary/2 via-transparent to-primary/2 rounded-xl pointer-events-none" />

                    <CardHeader className="relative z-10 pb-3">
                        <CardTitle className="font-freecam text-primary/80 tracking-wide text-sm uppercase">SERVER ICON</CardTitle>
                        <CardDescription className="font-ocr text-primary/60 text-xs">
                            We recommend an image of at least 512x512. (Logo upload coming soon)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="relative z-10 space-y-4">
                        <div className="flex items-center gap-4">
                            {serverIcon ? (
                                <div className="relative">
                                    <img
                                        src={serverIcon}
                                        alt="Server icon"
                                        className="w-20 h-20 rounded-full object-cover border-2 border-primary/30"
                                    />
                                    <Button
                                        size="icon"
                                        variant="destructive"
                                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full"
                                        onClick={removeIcon}
                                        disabled={isUploading}
                                    >
                                        <X className="w-3 h-3" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-dashed border-primary/30 flex items-center justify-center">
                                    {isUploading ? (
                                        <Loader2 className="w-6 h-6 text-primary/60 animate-spin" />
                                    ) : (
                                        <Upload className="w-6 h-6 text-primary/60" />
                                    )}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="icon-upload" className="font-ocr">
                                    <Button
                                        variant="outline"
                                        asChild
                                        className="cursor-pointer font-ocr border-primary/20 hover:border-primary/40 text-primary/80 hover:bg-primary/5"
                                        disabled={isUploading}
                                    >
                                        <span>
                                            {isUploading ? "Uploading..." : "Change Server Icon"}
                                        </span>
                                    </Button>
                                </Label>
                                <input
                                    id="icon-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleIconUpload}
                                    disabled={isUploading}
                                />
                                {serverIcon && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={removeIcon}
                                        className="font-ocr"
                                        disabled={isUploading}
                                    >
                                        Remove Icon
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Server Description */}
                <Card className="border-primary/10 shadow-md backdrop-blur-sm bg-card/30 relative">
                    {/* Card glow effect */}
                    <div className="absolute inset-0 from-primary/2 via-transparent to-primary/2 rounded-xl pointer-events-none" />

                    <CardHeader className="relative z-10 pb-3">
                        <CardTitle className="font-freecam text-primary/80 tracking-wide text-sm uppercase">SERVER DESCRIPTION</CardTitle>
                        <CardDescription className="font-ocr text-primary/60 text-xs">
                            Help others discover your server by providing a description.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <textarea
                            value={serverDescription}
                            onChange={(e) => setServerDescription(e.target.value)}
                            placeholder="Write a short description about your server..."
                            className="w-full min-h-[100px] p-3 rounded-md border border-primary/20 bg-background/80 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 font-ocr text-foreground placeholder:text-primary/50"
                            maxLength={500}
                        />
                        <p className="text-xs text-primary/60 mt-2 font-ocr">
                            {serverDescription.length}/500 characters
                        </p>
                    </CardContent>
                </Card>

                {/* Save Changes */}
                <div className="flex justify-between items-center gap-3 pt-4">
                    <div className="text-xs text-primary/60 font-ocr">
                        {hasChanges ? "You have unsaved changes" : "No changes to save"}
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="font-ocr border-primary/20 hover:border-primary/40 text-primary/80 hover:bg-primary/5"
                            onClick={resetForm}
                            disabled={!hasChanges || isSaving}
                        >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Reset
                        </Button>
                        <Button
                            className="font-freecam tracking-wide bg-primary hover:bg-primary/90 text-primary-foreground"
                            onClick={handleSave}
                            disabled={!hasChanges || isSaving || !serverName.trim()}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    SAVING...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    SAVE CHANGES
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
