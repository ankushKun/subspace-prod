import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn, uploadFileTurbo } from "@/lib/utils"
import { Upload, X, Loader2, Save, RotateCcw, Camera } from "lucide-react"
import { useSubspace } from "@/hooks/use-subspace"
import { useGlobalState } from "@/hooks/use-global-state"
import { useWallet } from "@/hooks/use-wallet"
import { toast } from "sonner"

export default function ServerProfile() {
    const { activeServerId } = useGlobalState()
    const { servers, actions: subspaceActions } = useSubspace()
    const { address: walletAddress, jwk, wauthInstance } = useWallet()

    // Get the current server
    const server = servers[activeServerId]

    // Form state
    const [serverName, setServerName] = useState("")
    const [serverDescription, setServerDescription] = useState("")
    const [serverIcon, setServerIcon] = useState<string | null>(null)
    const [serverIconFile, setServerIconFile] = useState<File | null>(null)
    const [serverIconPreview, setServerIconPreview] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // Original values for change detection
    const [originalServerName, setOriginalServerName] = useState("")
    const [originalServerDescription, setOriginalServerDescription] = useState("")
    const [originalServerIcon, setOriginalServerIcon] = useState<string | null>(null)

    // Initialize form with server data
    useEffect(() => {
        if (server) {
            const name = server.name || ""
            const description = server.description || ""
            const icon = server.logo ? `https://arweave.net/${server.logo}` : null

            setServerName(name)
            setServerDescription(description)
            setServerIcon(icon)

            // Store original values
            setOriginalServerName(name)
            setOriginalServerDescription(description)
            setOriginalServerIcon(icon)

            // Reset file-related state when server changes
            setServerIconFile(null)
            setServerIconPreview(null)
        }
    }, [server])

    // Check if user is server owner
    const isOwner = server?.ownerId === walletAddress

    // Enhanced change detection functions
    const hasNameChanged = () => serverName.trim() !== originalServerName.trim()
    const hasDescriptionChanged = () => serverDescription.trim() !== originalServerDescription.trim()
    const hasIconFileChanged = () => !!serverIconFile
    const hasIconBeenRemoved = () => originalServerIcon && !serverIcon && !serverIconFile
    const hasIconChanged = () => hasIconFileChanged() || hasIconBeenRemoved()

    // Check if form has any changes
    const hasChanges = hasNameChanged() || hasDescriptionChanged() || hasIconChanged()

    const handleIconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        // Validate file size (max 100KB for server icons)
        if (file.size > 100 * 1024) {
            toast.error("Server icon must be smaller than 100KB")
            return
        }

        // Validate file type
        if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
            toast.error("Please select a PNG or JPEG image file")
            return
        }

        setServerIconFile(file)

        // Create preview
        const reader = new FileReader()
        reader.onload = (e) => {
            setServerIconPreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)
    }

    const removeIcon = () => {
        setServerIcon(null)
        setServerIconFile(null)
        setServerIconPreview(null)

        // Clear file input
        const fileInput = document.getElementById('icon-upload') as HTMLInputElement
        if (fileInput) {
            fileInput.value = ""
        }
    }

    const resetForm = () => {
        if (server) {
            setServerName(originalServerName)
            setServerDescription(originalServerDescription)
            setServerIcon(originalServerIcon)
            setServerIconFile(null)
            setServerIconPreview(null)

            // Clear file input
            const fileInput = document.getElementById('icon-upload') as HTMLInputElement
            if (fileInput) {
                fileInput.value = ""
            }
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

            // Handle name update
            if (hasNameChanged()) {
                updateParams.name = serverName.trim()
            }

            // Handle description update
            if (hasDescriptionChanged()) {
                updateParams.description = serverDescription.trim()
            }

            // Handle logo update
            if (hasIconChanged()) {
                if (serverIconFile) {
                    // Upload new icon to Arweave
                    try {
                        setIsUploading(true)
                        toast.loading("Uploading server icon to Arweave...")

                        const signer = wauthInstance?.getWauthSigner()
                        const logoId = await uploadFileTurbo(serverIconFile, jwk, signer)

                        if (logoId) {
                            updateParams.logo = logoId
                            toast.dismiss()
                        } else {
                            toast.dismiss()
                            toast.error("Failed to upload server icon")
                            return
                        }
                    } catch (error) {
                        console.error("Error uploading server icon:", error)
                        toast.dismiss()
                        toast.error("Failed to upload server icon")
                        return
                    } finally {
                        setIsUploading(false)
                    }
                } else if (hasIconBeenRemoved()) {
                    // Remove icon by setting empty logo
                    updateParams.logo = ""
                }
            }

            // Only proceed if there are changes to save
            if (Object.keys(updateParams).length > 0) {
                toast.loading("Updating server profile...")

                const success = await subspaceActions.servers.update(activeServerId, updateParams)

                toast.dismiss()

                if (success) {
                    toast.success("Server profile updated successfully!")

                    // Update original values to reflect saved state
                    setOriginalServerName(serverName.trim())
                    setOriginalServerDescription(serverDescription.trim())

                    if (updateParams.logo !== undefined) {
                        if (updateParams.logo) {
                            const newIconUrl = `https://arweave.net/${updateParams.logo}`
                            setOriginalServerIcon(newIconUrl)
                            setServerIcon(newIconUrl)
                        } else {
                            setOriginalServerIcon(null)
                            setServerIcon(null)
                        }
                    }

                    // Clear file state after successful save
                    setServerIconFile(null)
                    setServerIconPreview(null)

                    // Clear file input
                    const fileInput = document.getElementById('icon-upload') as HTMLInputElement
                    if (fileInput) {
                        fileInput.value = ""
                    }
                } else {
                    toast.error("Failed to update server profile")
                }
            } else {
                toast.info("No changes to save")
            }
        } catch (error) {
            console.error("Failed to save server profile:", error)
            toast.dismiss()
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

    // Get current icon to display (priority: preview > file > current > none)
    const getCurrentIcon = () => {
        if (serverIconPreview) return serverIconPreview
        if (serverIcon) return serverIcon
        return null
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
                            We recommend an image of at least 512x512. Max size: 100KB
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="relative z-10 space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="relative group">
                                <div
                                    className={cn(
                                        "w-20 h-20 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center transition-all duration-200 border-2",
                                        getCurrentIcon()
                                            ? "border-primary/30"
                                            : "border-dashed border-primary/30 group-hover:border-primary cursor-pointer",
                                        isUploading && "opacity-50 cursor-not-allowed"
                                    )}
                                    onClick={!getCurrentIcon() && !isUploading ? () => document.getElementById('icon-upload')?.click() : undefined}
                                >
                                    {getCurrentIcon() ? (
                                        <img
                                            src={getCurrentIcon()}
                                            alt="Server icon"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : isUploading ? (
                                        <Loader2 className="w-6 h-6 text-primary/60 animate-spin" />
                                    ) : (
                                        <Upload className="w-6 h-6 text-primary/60 group-hover:text-primary transition-colors" />
                                    )}

                                    {/* Upload overlay for existing icons */}
                                    {getCurrentIcon() && !isUploading && (
                                        <div
                                            className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                                            onClick={() => document.getElementById('icon-upload')?.click()}
                                        >
                                            <Camera className="w-6 h-6 text-white" />
                                        </div>
                                    )}

                                    {/* Upload progress overlay */}
                                    {isUploading && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                                        </div>
                                    )}
                                </div>

                                {/* Remove button */}
                                {getCurrentIcon() && !isUploading && (
                                    <Button
                                        size="icon"
                                        variant="destructive"
                                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full"
                                        onClick={removeIcon}
                                    >
                                        <X className="w-3 h-3" />
                                    </Button>
                                )}
                            </div>

                            <div className="space-y-3 flex-1">
                                <div>
                                    <div className="text-sm font-medium text-foreground">
                                        {serverIconFile ? serverIconFile.name : getCurrentIcon() ? "Server Icon" : "No icon set"}
                                    </div>
                                    <div className="text-xs text-primary/60 mt-1">
                                        {isUploading ? "Uploading to Arweave..." :
                                            serverIconFile ? `${(serverIconFile.size / 1024).toFixed(1)} KB selected` :
                                                getCurrentIcon() ? "Click to change server icon" :
                                                    "Click above or browse to upload"
                                        }
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Label htmlFor="icon-upload">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                            className="cursor-pointer font-ocr border-primary/20 hover:border-primary/40 text-primary/80 hover:bg-primary/5"
                                            disabled={isUploading}
                                        >
                                            <span>
                                                {isUploading ? "Uploading..." : getCurrentIcon() ? "Change Icon" : "Upload Icon"}
                                            </span>
                                        </Button>
                                    </Label>

                                    {getCurrentIcon() && (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={removeIcon}
                                            className="font-ocr"
                                            disabled={isUploading}
                                        >
                                            Remove
                                        </Button>
                                    )}
                                </div>

                                <div className="text-xs text-primary/40">
                                    PNG, JPEG supported • Max 100KB
                                </div>
                            </div>

                            {/* Hidden file input */}
                            <input
                                id="icon-upload"
                                type="file"
                                accept="image/png,image/jpeg,image/jpg"
                                className="hidden"
                                onChange={handleIconUpload}
                                disabled={isUploading}
                            />
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
                        {hasChanges ? (
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                                <span>You have unsaved changes</span>
                                {hasNameChanged() && <span className="text-orange-500">• Name</span>}
                                {hasDescriptionChanged() && <span className="text-orange-500">• Description</span>}
                                {hasIconChanged() && <span className="text-orange-500">• Icon</span>}
                            </div>
                        ) : (
                            "No changes to save"
                        )}
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="font-ocr border-primary/20 hover:border-primary/40 text-primary/80 hover:bg-primary/5"
                            onClick={resetForm}
                            disabled={!hasChanges || isSaving || isUploading}
                        >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Reset
                        </Button>
                        <Button
                            className="font-freecam tracking-wide bg-primary hover:bg-primary/90 text-primary-foreground"
                            onClick={handleSave}
                            disabled={!hasChanges || isSaving || isUploading || !serverName.trim()}
                        >
                            {isSaving || isUploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {isUploading ? "UPLOADING..." : "SAVING..."}
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
