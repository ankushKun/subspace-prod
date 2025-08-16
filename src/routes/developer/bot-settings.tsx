import { useEffect, useState, useRef } from "react"
import { useParams, useNavigate } from "react-router"
import { useSubspace } from "@/hooks/use-subspace"
import { useWallet } from "@/hooks/use-wallet"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BotIcon, ArrowLeft, Trash2, Server, Upload, Loader2 } from "lucide-react"
import { uploadFileTurbo } from "@/lib/utils"
import { toast } from "sonner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import type { Bot } from "@subspace-protocol/sdk"

export default function BotSettings() {
    const navigate = useNavigate()
    const { botId } = useParams()
    const { address, connected } = useWallet()
    const { subspace, actions: subspaceActions } = useSubspace()
    const [bot, setBot] = useState<Bot | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isUpdating, setIsUpdating] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [profilePicFile, setProfilePicFile] = useState<File | null>(null)
    const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        pfp: ""
    })

    useEffect(() => {
        if (!connected || !address || !subspace || !botId) return
        loadBot()
    }, [connected, address, subspace, botId])

    const loadBot = async () => {
        if (!subspace || !botId) return

        setIsLoading(true)
        setError(null)
        try {
            const botData = await subspace.bot.getBot(botId)
            if (botData) {
                setBot(botData)
                setFormData({
                    name: botData.name || "",
                    description: botData.description || "",
                    pfp: botData.pfp || ""
                })
            } else {
                throw new Error("Bot not found")
            }
        } catch (error) {
            console.error("Failed to load bot:", error)
            setError("Failed to load bot. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        // Validate file size (max 100KB)
        if (file.size > 100 * 1024) {
            toast.error("Profile picture must be less than 100KB")
            return
        }

        // Validate file type
        if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
            toast.error("Please select a PNG or JPEG image file")
            return
        }

        setProfilePicFile(file)

        // Create preview
        const reader = new FileReader()
        reader.onload = (e) => {
            setProfilePicPreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)
    }

    const handleUpdateBot = async () => {
        if (!subspace || !botId || !bot) return

        setIsUpdating(true)
        setError(null)
        try {
            let pfpId = bot.pfp

            // Upload profile picture if changed
            if (profilePicFile) {
                try {
                    setIsUploading(true)
                    toast.loading("Uploading profile picture to Arweave...")

                    const { wauthInstance, jwk } = useWallet.getState()
                    const signer = wauthInstance?.getWauthSigner()
                    pfpId = await uploadFileTurbo(profilePicFile, jwk, signer)

                    if (!pfpId) {
                        toast.dismiss()
                        toast.error("Failed to upload profile picture")
                        return
                    }

                    toast.dismiss()
                    toast.success("Profile picture uploaded successfully")
                } catch (error) {
                    console.error("Error uploading profile picture:", error)
                    toast.dismiss()
                    toast.error("Failed to upload profile picture")
                    return
                } finally {
                    setIsUploading(false)
                }
            }

            // Update bot details
            const success = await subspace.bot.updateBot(botId, {
                name: formData.name.trim() || bot.name,
                description: formData.description.trim() || bot.description,
                pfp: pfpId,
                publicBot: true
            })

            if (success) {
                await loadBot() // Reload bot data
            } else {
                throw new Error("Failed to update bot")
            }
        } catch (error) {
            setError("Failed to update bot. Please try again.")
        } finally {
            setIsUpdating(false)
        }
    }

    const handleDeleteBot = async () => {
        if (!subspace || !botId) return

        try {
            const success = await subspace.bot.deleteBot(botId)
            if (success) {
                navigate("/developer/bots")
            }
        } catch (error) {
            console.error("Failed to delete bot:", error)
            setError("Failed to delete bot. Please try again.")
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background p-6 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center animate-pulse">
                        <BotIcon className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-muted-foreground">Loading bot details...</p>
                </div>
            </div>
        )
    }

    if (error || !bot) {
        return (
            <div className="min-h-screen bg-background p-6 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-red-500/20 to-red-500/10 flex items-center justify-center">
                        <BotIcon className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Failed to load bot</h3>
                    <p className="text-red-500 mb-4">{error}</p>
                    <Button
                        onClick={loadBot}
                        variant="outline"
                        className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                    >
                        Try Again
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background p-6">
            {/* Background grid pattern */}
            <div
                className="fixed inset-0 opacity-[0.02] pointer-events-none"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '32px 32px'
                }}
            />

            <div className="relative z-10 max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            onClick={() => navigate("/developer/bots")}
                            className="flex items-center gap-2 p-2 h-auto hover:bg-primary/10 transition-colors font-ocr text-primary border border-transparent hover:border-primary/30"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Back</span>
                        </Button>
                        <h1 className="text-2xl font-bold text-foreground font-ocr">{bot.name} Settings</h1>
                    </div>

                    {/* <Button
                        variant="ghost"
                        onClick={() => setDeleteDialogOpen(true)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Bot
                    </Button> */}
                </div>

                {/* Bot Overview */}
                <Card className="mb-8 border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="font-ocr">Bot Overview</CardTitle>
                        <CardDescription>View and update your bot's basic information</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div>
                            {/* Bot Details Dashboard */}
                            <div className="flex-1">
                                {/* Bot Avatar */}
                                <div className="flex items-center gap-6 mb-8">
                                    <div className="flex flex-col items-center gap-2">
                                        <div
                                            className="w-24 h-24 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center overflow-hidden relative group cursor-pointer"
                                            onClick={() => !isUploading && fileInputRef.current?.click()}
                                        >
                                            {profilePicPreview ? (
                                                <img src={profilePicPreview} alt="Preview" className="w-full h-full object-cover" />
                                            ) : bot.pfp ? (
                                                <img src={`https://arweave.net/${bot.pfp}`} alt={bot.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <BotIcon className="w-12 h-12 text-primary" />
                                            )}

                                            {/* Upload overlay */}
                                            <div className={`absolute inset-0 flex items-center justify-center bg-black/60 transition-opacity duration-200 ${isUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                {isUploading ? (
                                                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Upload className="w-8 h-8 text-white" />
                                                        <span className="text-xs text-white font-ocr">UPLOAD</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Hidden file input */}
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/png,image/jpeg,image/jpg"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            disabled={isUploading}
                                        />
                                    </div>

                                    {/* Static Information Dashboard */}
                                    <div className="grid grid-cols-1 gap-2 flex-1">
                                        <div className="p-1 pl-2 flex gap-2 items-center">
                                            <div className="text-xs font-medium text-muted-foreground">BOT ID</div>
                                            <div className="font-mono text-sm truncate" title={bot.process}>
                                                {bot.process}
                                            </div>
                                        </div>
                                        <div className="p-1 pl-2 flex gap-2 items-center">
                                            <div className="text-xs font-medium text-muted-foreground">OWNER</div>
                                            <div className="font-mono text-sm truncate" title={bot.owner}>
                                                {bot.owner}
                                            </div>
                                        </div>
                                        <div className="p-1 pl-2 flex gap-2 items-center">
                                            <div className="text-xs font-medium text-muted-foreground">VERSION</div>
                                            <div className="font-mono text-sm">
                                                {bot.version}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Editable Bot Settings */}
                                <div className="space-y-6 pl-28">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium mb-1.5 block">
                                                Bot Name
                                            </label>
                                            <Input
                                                value={formData.name}
                                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                                placeholder={bot.name}
                                                className="bg-background/50"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium mb-1.5 block">
                                                Description
                                            </label>
                                            <Input
                                                value={formData.description}
                                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                                placeholder="Enter bot description"
                                                className="bg-background/50"
                                            />
                                            <p className="text-xs text-muted-foreground mt-1.5">
                                                A brief description of what your bot does
                                            </p>
                                        </div>


                                    </div>

                                    <Button
                                        onClick={handleUpdateBot}
                                        disabled={isUpdating}
                                        className="bg-primary hover:bg-primary/90 text-primary-foreground w-full"
                                    >
                                        {isUpdating ? "Saving Changes..." : "Save Changes"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Bot Servers */}
                <Card className="mb-8 border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="font-ocr">Connected Servers</CardTitle>
                        <CardDescription>Servers this bot is currently active in</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {Object.keys(bot.joinedServers || {}).length === 0 ? (
                            <div className="text-center py-8">
                                <Server className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                                <p className="text-muted-foreground">This bot isn't in any servers yet</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {Object.keys(bot.joinedServers || {}).map(serverId => (
                                    <Card key={serverId} className="bg-background/50">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium">{serverId}</p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                                    onClick={() => {
                                                        if (confirm("Remove bot from this server?")) {
                                                            subspace?.bot.removeBotFromServer({ serverId, botId: bot.process })
                                                                .then(() => loadBot())
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Delete Bot Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="bg-background border border-primary/20">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-ocr text-primary">
                            Delete Bot
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                            Are you sure you want to delete this bot? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            className="border-border/50 text-muted-foreground hover:text-foreground"
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteBot}
                            className="bg-red-500 hover:bg-red-600 text-white"
                        >
                            Delete Bot
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}