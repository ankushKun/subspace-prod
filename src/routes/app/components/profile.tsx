import { useSubspace } from "@/hooks/use-subspace"
import { useWallet } from "@/hooks/use-wallet"
import { useGlobalState } from "@/hooks/use-global-state"
import { cn, shortenAddress, uploadFileTurbo } from "@/lib/utils"
import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Settings, LogOut, User, Edit2, Save, X, Camera, Loader2, Wallet } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import alien from "@/assets/subspace/alien-black.svg"
import LoginDialog from "@/components/login-dialog"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"


function SettingsButton(props: React.ComponentProps<typeof Button>) {
    const navigate = useNavigate()

    return <Button
        variant="ghost"
        size="icon"
        className={cn("w-8 h-8 rounded-sm text-primary/30 border border-transparent", props.className)}
        title="CONNECT_WALLET_TO_ACCESS_SETTINGS"
        onClick={() => {
            navigate("/app/settings")
        }}
    >
        <Settings className="w-4 h-4" />
    </Button>
}

export default function Profile({ className }: { className?: string }) {
    const { address, connected, actions: walletActions, jwk, wauthInstance } = useWallet()
    const { profile, servers, actions, subspace, isCreatingProfile, isLoadingProfile } = useSubspace()

    // UI State
    const [profileDialogOpen, setProfileDialogOpen] = useState(false)
    const [pfpPromptOpen, setPfpPromptOpen] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editedNickname, setEditedNickname] = useState("")
    const [originalNickname, setOriginalNickname] = useState("") // Track original nickname for change detection
    const [selectedServerId, setSelectedServerId] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [profilePicFile, setProfilePicFile] = useState<File | null>(null)
    const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const pfpPromptFileInputRef = useRef<HTMLInputElement>(null)

    // Check if user needs PFP prompt
    useEffect(() => {
        // Don't show PFP prompt if profile is being created or loaded
        if (!profile || isCreatingProfile || isLoadingProfile) return

        const DEFAULT_PFP = "Sie_26dvgyok0PZD_-iQAFOhOd5YxDTkczOLoqTTL_A"
        const needsPfpPrompt = (!profile.pfp || profile.pfp === DEFAULT_PFP) && !profile.primaryLogo

        if (needsPfpPrompt) {
            setPfpPromptOpen(true)
        }
    }, [profile, isCreatingProfile, isLoadingProfile])

    // Load current nickname when server is selected or servers data changes
    useEffect(() => {
        if (!selectedServerId || !profile?.userId) {
            setEditedNickname("")
            setOriginalNickname("")
            return
        }

        const loadCurrentNickname = async () => {
            try {
                const server = servers[selectedServerId]
                if (server) {
                    // First try to get from local server data
                    let currentNickname = ""

                    if (server.members) {
                        if (Array.isArray(server.members)) {
                            // Handle members as array
                            const member = server.members.find((m: any) => m.userId === profile.userId) as any
                            currentNickname = member?.nickname || ""
                        } else if (server.members[profile.userId]) {
                            // Handle members as object
                            const member = server.members[profile.userId] as any
                            currentNickname = member?.nickname || ""
                        }
                    }

                    // If not found locally, fetch from server
                    if (!currentNickname) {
                        const member = await actions.servers.getMember(selectedServerId, profile.userId)
                        currentNickname = member?.nickname || ""
                    }

                    setEditedNickname(currentNickname)
                    setOriginalNickname(currentNickname)
                }
            } catch (error) {
                console.error("Failed to load current nickname:", error)
                setEditedNickname("")
                setOriginalNickname("")
            }
        }

        loadCurrentNickname()
    }, [selectedServerId, profile?.userId, servers, actions.servers])

    // Reset form state when dialog opens and auto-select active server
    useEffect(() => {
        if (profileDialogOpen) {
            // Reset all form state when dialog opens
            setIsEditing(false)
            setProfilePicFile(null)
            setProfilePicPreview(null)
            setIsUploading(false)
            setIsSaving(false)
            setEditedNickname("")
            setOriginalNickname("")

            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }

            // Auto-select active server if available
            const { activeServerId } = useGlobalState.getState()
            if (activeServerId && servers[activeServerId]) {
                // Check if active server is in the joined servers list
                const joinedServers = profile?.serversJoined || []
                const isActiveServerJoined = joinedServers.some(server => {
                    const serverIdToCheck = typeof server === 'string' ? server : (server as any).serverId
                    return serverIdToCheck === activeServerId
                })

                if (isActiveServerJoined) {
                    setSelectedServerId(activeServerId)
                }
            }
        } else {
            // Comprehensive reset when dialog closes - ensure fresh start
            setIsEditing(false)
            setSelectedServerId(null)
            setEditedNickname("")
            setOriginalNickname("")
            setProfilePicFile(null)
            setProfilePicPreview(null)
            setIsUploading(false)
            setIsSaving(false)

            // Clear file inputs
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
            if (pfpPromptFileInputRef.current) {
                pfpPromptFileInputRef.current.value = ""
            }
        }
    }, [profileDialogOpen, servers, profile?.serversJoined])

    useEffect(() => {
        if (!isEditing) {
            setProfilePicFile(null)
            setProfilePicPreview(null)
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
        }
    }, [isEditing])

    // Profile data for UI display
    const profileProxy = {
        userId: profile?.userId || address || "",
        userIdShort: shortenAddress(profile?.userId || address || ""),
        pfp: profile?.pfp || profile?.primaryLogo || "",
        primaryName: profile?.primaryName || ""
    }

    // Get real servers data
    const joinedServers = profile?.serversJoined || []
    const availableServers = Object.entries(servers).filter(([serverId]) =>
        joinedServers.some(server => {
            const serverIdToCheck = typeof server === 'string' ? server : (server as any).serverId
            return serverIdToCheck === serverId
        })
    )

    const getDisplayName = () => {
        // Priority 1: Server nickname (if in an active server)
        const { activeServerId } = useGlobalState.getState()
        if (activeServerId && servers[activeServerId] && profile?.userId) {
            const server = servers[activeServerId]
            if (server.members && Array.isArray(server.members)) {
                // Handle members as array
                const member = server.members.find((m: any) => m.userId === profile.userId)
                if (member?.nickname) return member.nickname
            } else if (server.members && server.members[profile.userId]) {
                // Handle members as object
                const member = server.members[profile.userId]
                if (member?.nickname) return member.nickname
            }
        }

        // Priority 2: Primary name
        if (profileProxy.primaryName) return profileProxy.primaryName

        // Priority 3: Shortened wallet address
        if (profileProxy.userIdShort) return profileProxy.userIdShort

        return 'NOT_CONNECTED'
    }

    const getSecondaryInfo = () => {
        // Check what we're showing in the first line
        const { activeServerId } = useGlobalState.getState()
        let hasNickname = false

        if (activeServerId && servers[activeServerId] && profile?.userId) {
            const server = servers[activeServerId]
            if (server.members && Array.isArray(server.members)) {
                // Handle members as array
                const member = server.members.find((m: any) => m.userId === profile.userId)
                hasNickname = !!member?.nickname
            } else if (server.members && server.members[profile.userId]) {
                // Handle members as object
                const member = server.members[profile.userId]
                hasNickname = !!member?.nickname
            }
        }

        // If showing nickname in first line and user has primary name, show "primary name | shortened address"
        if (hasNickname && profileProxy.primaryName) {
            return `${profileProxy.primaryName} | ${profileProxy.userIdShort}`
        }

        // If first line shows nickname (but no primary name) or primary name, show shortened address in second line
        if (hasNickname || profileProxy.primaryName) {
            return profileProxy.userIdShort
        }

        // If first line shows shortened address, show nothing to avoid duplication
        return ""
    }

    const handleOpenProfile = () => {
        setProfileDialogOpen(true)
    }

    const handleCancelEdit = () => {
        setIsEditing(false)
        // Reset nickname to original value
        setEditedNickname(originalNickname)
        setProfilePicFile(null)
        setProfilePicPreview(null)
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

    // Helper functions to detect changes
    const hasProfilePictureChanged = () => !!profilePicFile
    const hasNicknameChanged = () => editedNickname.trim() !== originalNickname.trim()
    const hasAnyChanges = () => hasProfilePictureChanged() || hasNicknameChanged()

    const handleSaveProfile = async () => {
        if (!profile) return

        // Don't save if nothing has changed
        if (!hasAnyChanges()) {
            setIsEditing(false)
            return
        }

        setIsSaving(true)
        try {
            let updateTasks = []

            // Upload and update profile picture if changed
            if (hasProfilePictureChanged() && profilePicFile) {
                try {
                    setIsUploading(true)
                    toast.loading("Uploading profile picture to Arweave...")

                    const signer = wauthInstance?.getWauthSigner()
                    console.log("signer", signer)
                    const pfpId = await uploadFileTurbo(profilePicFile, jwk, signer)
                    if (pfpId) {
                        toast.dismiss()
                        toast.loading("Updating profile...")

                        const success = await actions.profile.updateProfile({ pfp: pfpId })
                        if (success) {
                            toast.dismiss()
                            toast.success("Profile picture updated successfully")

                            // Force refresh to get the latest data from the server
                            await actions.profile.refresh()

                            // Clear the file selection and preview
                            setProfilePicFile(null)
                            setProfilePicPreview(null)
                            if (fileInputRef.current) {
                                fileInputRef.current.value = ""
                            }
                        } else {
                            toast.dismiss()
                            toast.error("Failed to update profile picture")
                        }
                    } else {
                        toast.dismiss()
                        toast.error("Failed to upload profile picture")
                    }
                } catch (error) {
                    console.error("Error uploading profile picture:", error)
                    toast.dismiss()
                    toast.error("Failed to upload profile picture")
                } finally {
                    setIsUploading(false)
                }
            }

            // Update server nickname if changed and server is selected
            if (hasNicknameChanged() && selectedServerId && profile?.userId) {
                const server = servers[selectedServerId]
                if (server) {
                    const trimmedNickname = editedNickname.trim()
                    const success = await actions.servers.updateMember(selectedServerId, {
                        userId: profile.userId,
                        nickname: trimmedNickname  // Allow empty strings to reset nickname
                    })
                    if (success) {
                        const message = trimmedNickname === "" ? "Nickname cleared successfully" : "Nickname updated successfully"
                        toast.success(message)
                        // Update the original nickname to reflect the new saved value
                        setOriginalNickname(trimmedNickname)
                    } else {
                        toast.error("Failed to update nickname")
                    }
                }
            }

            setIsEditing(false)
        } catch (error) {
            console.error("Error updating profile:", error)
            toast.error("Failed to update profile")
        } finally {
            setIsSaving(false)
        }
    }

    const handlePfpPromptFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

        try {
            setIsUploading(true)
            toast.loading("Uploading profile picture to Arweave...")

            const signer = wauthInstance?.getWauthSigner()
            console.log("signer", signer)
            const pfpId = await uploadFileTurbo(file, jwk, signer)
            if (pfpId) {
                toast.dismiss()
                toast.loading("Updating profile...")

                const success = await actions.profile.updateProfile({ pfp: pfpId })
                if (success) {
                    toast.dismiss()
                    toast.success("Profile picture updated successfully")

                    // Force refresh to get the latest data from the server
                    await actions.profile.refresh()

                    // Close the prompt
                    setPfpPromptOpen(false)
                } else {
                    toast.dismiss()
                    toast.error("Failed to update profile picture")
                }
            } else {
                toast.dismiss()
                toast.error("Failed to upload profile picture")
            }
        } catch (error) {
            console.error("Error uploading profile picture:", error)
            toast.dismiss()
            toast.error("Failed to upload profile picture")
        } finally {
            setIsUploading(false)
            if (pfpPromptFileInputRef.current) {
                pfpPromptFileInputRef.current.value = ""
            }
        }
    }

    // show a login button in the same style as the profile button
    if (!address) return (
        <div className={cn("", className)}>
            <div className="p-0.5 flex items-center justify-between gap-2">
                {/* Login Button */}
                <LoginDialog>
                    <Button
                        asChild
                        variant="ghost"
                        className="flex items-center gap-2 p-2 h-auto hover:bg-primary/10 transition-colors grow font-ocr text-primary border border-transparent hover:border-primary/30"
                    >
                        <div className="flex items-center gap-2 w-full">
                            {/* Alien Avatar Placeholder */}
                            <div className="relative flex-shrink-0">
                                <div className="w-8 h-8 rounded-sm overflow-hidden bg-primary/20 flex items-center justify-center border border-primary/30">
                                    <img src={alien} alt="alien" className="w-5 h-5 opacity-60" />
                                </div>
                                {/* Disconnected status indicator */}
                                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-sm border border-background animate-pulse"></div>
                            </div>

                            {/* Login Info */}
                            <div className="flex-1 min-w-0 text-left">
                                <div className="text-sm font-medium text-primary truncate">
                                    Sign In
                                </div>
                                <div className="text-xs text-primary/60 flex items-center gap-1">
                                    <span className="truncate">Join the conversation</span>
                                </div>
                            </div>
                        </div>
                    </Button>
                </LoginDialog>

                {/* Settings Button (disabled when not connected) */}
                <SettingsButton />
            </div>
        </div>
    )

    return (
        <>
            <div className={cn("max-w-80", className)}>
                <div className="p-0.5 flex items-center justify-between gap-2">
                    {/* Profile Button */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="flex items-center gap-2 p-2 h-auto hover:bg-primary/10 transition-colors grow font-ocr text-primary border border-transparent hover:border-primary/30"
                            >
                                {/* User Avatar */}
                                <div className="relative flex-shrink-0">
                                    <div className="w-8 h-8 rounded-sm overflow-hidden bg-primary/20 flex items-center justify-center border border-primary/30">
                                        {profileProxy.pfp ? (
                                            <img
                                                src={`https://arweave.net/${profileProxy.pfp}`}
                                                alt="Profile"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <img src={alien} alt="alien" className="w-5 h-5 opacity-80" />
                                        )}
                                    </div>
                                    {/* Online status indicator */}
                                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-sm border border-background animate-pulse"></div>
                                </div>

                                {/* User Info */}
                                <div className="flex-1 min-w-0 text-left">
                                    <div className="text-sm font-medium text-primary truncate max-w-52">
                                        {getDisplayName()}
                                    </div>
                                    <div className="text-xs text-primary/60 flex items-center gap-1">
                                        <span className="truncate max-w-52">{getSecondaryInfo()}</span>
                                    </div>
                                </div>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="start"
                            className="w-80 bg-background border border-primary/20 font-ocr"
                            sideOffset={0}
                            alignOffset={-10}
                            side="top"
                        >
                            <DropdownMenuItem
                                onClick={handleOpenProfile}
                                className="cursor-pointer flex items-center gap-3 p-3 text-sm hover:bg-primary/10 rounded-sm transition-colors text-primary"
                            >
                                <User className="h-4 w-4" />
                                <div>
                                    <p className="font-medium">Profile</p>
                                </div>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="bg-primary/20" />

                            <DropdownMenuItem
                                className="cursor-pointer flex items-center gap-3 p-3 text-sm hover:bg-red-500/10 rounded-sm transition-colors text-red-400"
                                onClick={() => {
                                    walletActions.disconnect()
                                }}
                            >
                                <LogOut className="h-4 w-4" />
                                <div>
                                    <p className="font-medium">Disconnect</p>
                                    <p className="text-xs text-red-400/60">Sign out of wallet</p>
                                </div>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Settings Button */}
                    <SettingsButton />
                </div>
            </div>

            {/* PFP Prompt Dialog */}
            <Dialog open={pfpPromptOpen} onOpenChange={setPfpPromptOpen}>
                <DialogContent className="max-w-md w-[95vw] p-4 outline-0 overflow-hidden flex flex-col bg-background border border-primary/30 shadow-2xl">
                    <DialogHeader className="flex-shrink-0 border-b border-primary/20 pb-4">
                        <DialogTitle className="flex items-center gap-2 font-freecam text-xl text-primary">
                            <Camera className="h-5 w-5" />
                            <span>Add Profile Picture</span>
                        </DialogTitle>
                        <DialogDescription className="font-ocr text-primary/60 text-left">
                            Make your profile more personal by adding a profile picture.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center justify-center py-8 gap-6">
                        <div
                            className="relative group cursor-pointer"
                            onClick={() => !isUploading && pfpPromptFileInputRef.current?.click()}
                        >
                            <div className={cn(
                                "w-24 h-24 rounded-sm overflow-hidden bg-primary/20 flex items-center justify-center border-2 border-dashed border-primary/60 group-hover:border-primary group-hover:scale-105 transition-all duration-200",
                                isUploading && "opacity-50"
                            )}>
                                <img
                                    src={alien}
                                    alt="alien"
                                    className={cn(
                                        "w-12 h-12 opacity-60 group-hover:opacity-40 transition-opacity duration-200",
                                        isUploading && "animate-pulse"
                                    )}
                                />
                            </div>
                            {!isUploading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-sm opacity-0 group-hover:opacity-100 transition-all duration-200">
                                    <div className="flex flex-col items-center gap-2">
                                        <Camera className="h-8 w-8 text-primary" />
                                        <span className="text-xs text-primary font-ocr">UPLOAD</span>
                                    </div>
                                </div>
                            )}
                            {isUploading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-sm">
                                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                </div>
                            )}
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-sm text-primary/80 font-ocr">
                                {isUploading ? "Uploading your profile picture..." : "Stand out in the community with a unique profile picture."}
                            </p>
                            <p className="text-xs text-primary/60 font-ocr">
                                Supported formats: PNG, JPEG • Max size: 100KB
                            </p>
                        </div>
                        {/* Hidden file input */}
                        <input
                            ref={pfpPromptFileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/jpg"
                            onChange={handlePfpPromptFileUpload}
                            className="hidden"
                            disabled={isUploading}
                        />
                    </div>

                    <DialogFooter className="px-4 pt-4 border-t border-primary/20 bg-background flex-shrink-0">
                        <DialogClose
                            className={cn(
                                "cursor-pointer font-ocr text-primary hover:text-primary/80 bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors px-4 py-2 rounded-sm",
                                isUploading && "opacity-50 cursor-not-allowed pointer-events-none"
                            )}
                            disabled={isUploading}
                        >
                            Maybe Later
                        </DialogClose>
                        <Button
                            onClick={() => !isUploading && pfpPromptFileInputRef.current?.click()}
                            disabled={isUploading}
                            className={cn(
                                "font-ocr bg-primary text-black hover:bg-primary/90",
                                isUploading && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {isUploading ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Uploading...</span>
                                </div>
                            ) : (
                                "Choose Picture"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Profile Settings Dialog */}
            <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
                <DialogContent className="max-w-2xl w-[90vw] max-h-[85vh] border-primary/10 bg-background/90 shadow-md p-4 backdrop-blur-sm overflow-hidden" removeCloseButton>
                    {/* Background decoration */}
                    <div className="absolute inset-0 from-primary/2 via-transparent to-primary/2 rounded-lg pointer-events-none" />

                    <DialogHeader className="relative z-10 flex-shrink-0 border-b border-primary/10 pb-3">
                        <DialogTitle className="flex items-center justify-between font-freecam text-sm uppercase tracking-wide text-primary/70">
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-primary/40" />
                                <span>Profile Settings</span>
                            </div>
                            {!isEditing ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditing(true)}
                                    className="text-xs border-primary/20 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                                >
                                    <Edit2 className="w-3 h-3" />
                                </Button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    {/* {hasAnyChanges() && (
                                        <div className="flex items-center gap-1 text-xs text-orange-500">
                                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                                            <span>Unsaved changes</span>
                                        </div>
                                    )} */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCancelEdit}
                                        className="text-xs border-red-500/30 text-red-500 hover:bg-red-500/10"
                                    >
                                        <X className="w-3 h-3" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleSaveProfile}
                                        disabled={isSaving || isUploading || !hasAnyChanges()}
                                        className="text-xs bg-primary hover:bg-primary/90 text-black disabled:opacity-50"
                                    >
                                        {isSaving || isUploading ? (
                                            <>
                                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                {isUploading ? "Uploading..." : "Saving..."}
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-3 h-3 mr-1" />
                                                Save
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-primary/50 mt-1">
                            Manage your global profile and server-specific settings
                        </DialogDescription>
                    </DialogHeader>

                    <div className="relative z-10 flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                        <Tabs defaultValue="global" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 bg-primary/5 border border-primary/20">
                                <TabsTrigger value="global" className="text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-black">
                                    Global Profile
                                </TabsTrigger>
                                <TabsTrigger value="server" className="text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-black">
                                    <span className="hidden sm:inline">Server Profile</span>
                                    <span className="sm:hidden">Server</span>
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="global" className="space-y-4 mt-4">
                                {/* Profile Picture Section */}
                                <div className="bg-primary/5 rounded-lg border border-primary/20 p-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-6 h-6 bg-primary/10 rounded-md flex items-center justify-center">
                                            <Camera className="w-3 h-3 text-primary/50" />
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-freecam font-medium text-primary uppercase tracking-wider">
                                                Profile Picture
                                            </h3>
                                            <div className="text-xs text-primary/60 mt-0.5">
                                                Your avatar displayed across all servers
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="relative group">
                                            <div
                                                className={cn(
                                                    "w-16 h-16 rounded-lg overflow-hidden bg-primary/20 flex items-center justify-center transition-all duration-200 border-2",
                                                    isEditing && !isUploading
                                                        ? "border-dashed border-primary/60 group-hover:border-primary cursor-pointer"
                                                        : "border-primary/30",
                                                    isUploading && "opacity-50 cursor-not-allowed"
                                                )}
                                                onClick={isEditing && !isUploading ? () => fileInputRef.current?.click() : undefined}
                                            >
                                                {profilePicPreview ? (
                                                    <img
                                                        src={profilePicPreview}
                                                        alt="Profile Preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : profileProxy.pfp ? (
                                                    <img
                                                        src={`https://arweave.net/${profileProxy.pfp}`}
                                                        alt="Profile"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <img
                                                        src={alien}
                                                        alt="alien"
                                                        className="w-8 h-8 opacity-60"
                                                    />
                                                )}

                                                {isEditing && !isUploading && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                        <Camera className="w-4 h-4 text-white" />
                                                    </div>
                                                )}

                                                {isUploading && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
                                                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                                                    </div>
                                                )}
                                            </div>

                                            {isEditing && (
                                                <div className="absolute -bottom-1 -right-1 bg-primary text-black rounded-full p-1 shadow-sm border border-background">
                                                    <Camera className="w-2.5 h-2.5" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-foreground">
                                                {profilePicFile ? profilePicFile.name : "Profile Avatar"}
                                            </div>
                                            <div className="text-xs text-primary/60 mt-1">
                                                {isEditing ? (
                                                    isUploading ? "Uploading to Arweave..." :
                                                        profilePicFile ? `${(profilePicFile.size / 1024).toFixed(1)} KB selected` :
                                                            "Click avatar to upload (max 100KB)"
                                                ) : (
                                                    "Visible across all servers"
                                                )}
                                            </div>
                                            {isEditing && !profilePicFile && !isUploading && (
                                                <div className="text-xs text-primary/40 mt-1">
                                                    PNG, JPEG supported
                                                </div>
                                            )}
                                        </div>

                                        {/* Hidden file input */}
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            disabled={isUploading}
                                        />
                                    </div>
                                </div>

                                {/* Primary Name Section */}
                                <div className="bg-primary/5 rounded-lg border border-primary/20 p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-6 h-6 bg-primary/10 rounded-md flex items-center justify-center">
                                            <User className="w-3 h-3 text-primary/50" />
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-freecam font-medium text-primary uppercase tracking-wider">
                                                Primary Name
                                            </h3>
                                            <div className="text-xs text-primary/60 mt-0.5">
                                                {profileProxy.primaryName ? "Your verified ArNS name" : "Get a human-readable name"}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-background/30 rounded-md border border-primary/30">
                                        <div className="flex items-center justify-between">
                                            <div className="min-w-0 flex-1">
                                                <div className=" font-ocr font-medium text-foreground">
                                                    {profileProxy.primaryName || "No primary name set"}
                                                </div>
                                                <div className="text-xs text-primary/60 mt-1">
                                                    {profileProxy.primaryName ? (
                                                        "Unique name for wallet address"
                                                    ) : (
                                                        <>
                                                            Get yours at{" "}
                                                            <a
                                                                href="https://arns.ar.io"
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-primary hover:underline font-medium"
                                                            >
                                                                arns.ar.io
                                                            </a>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            {profileProxy.primaryName && (
                                                <div className="flex items-center gap-1">
                                                    <Link to="https://arns.ar.io" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline underline-offset-4 cursor-pointer">
                                                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                                                        <span className="text-xs text-green-600 font-medium">ArNS Verified</span>
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Wallet Address Section */}
                                <div className="bg-primary/5 rounded-lg border border-primary/20 p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-6 h-6 bg-primary/10 rounded-md flex items-center justify-center">
                                            <Wallet className="w-3 h-3 text-primary/50" />
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-freecam font-medium text-primary uppercase tracking-wider">
                                                Wallet Address
                                            </h3>
                                            <div className="text-xs text-primary/60 mt-0.5">
                                                Your unique Permaweb identifier
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-background/30 rounded-md border border-primary/30">
                                        <div className="text-sm font-mono text-foreground break-all">
                                            {address}
                                        </div>
                                        <div className="text-xs text-primary/60 mt-1">
                                            Permanent cryptographic identity
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="server" className="space-y-4 mt-4">
                                {availableServers.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                                            <User className="w-6 h-6 text-primary/30" />
                                        </div>
                                        <div className="text-sm font-medium text-foreground mb-1">
                                            No Servers Joined
                                        </div>
                                        <div className="text-xs text-primary/60 max-w-sm">
                                            Join a server to set server-specific nicknames.
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Server Selection Card */}
                                        <div className="bg-primary/5 rounded-lg border border-primary/20 p-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="w-6 h-6 bg-primary/10 rounded-md flex items-center justify-center">
                                                    <User className="w-3 h-3 text-primary/50" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-freecam font-medium text-primary uppercase tracking-wider">
                                                        Server Selection
                                                    </h3>
                                                    <div className="text-xs text-primary/60 mt-0.5">
                                                        Choose which server to customize
                                                    </div>
                                                </div>
                                            </div>

                                            <Select
                                                value={selectedServerId || undefined}
                                                onValueChange={(value) => setSelectedServerId(value)}
                                            >
                                                <SelectTrigger className="w-full bg-background/50 border-primary/30 text-primary hover:bg-background/80 transition-colors">
                                                    <SelectValue placeholder="Choose a server..." />
                                                </SelectTrigger>
                                                <SelectContent className="bg-background border border-primary/20">
                                                    {availableServers.map(([serverId, server]) => (
                                                        <SelectItem key={serverId} value={serverId} className="text-primary hover:bg-primary/10">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 bg-primary rounded-full" />
                                                                {server.name}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </>
                                )}

                                {selectedServerId && servers[selectedServerId] ? (
                                    <div className="space-y-4">
                                        {/* Server Nickname Configuration */}
                                        <div className="bg-primary/5 rounded-lg border border-primary/20 p-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="w-6 h-6 bg-primary/10 rounded-md flex items-center justify-center">
                                                    <Edit2 className="w-3 h-3 text-primary/50" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-freecam font-medium text-primary uppercase tracking-wider">
                                                        Server Nickname
                                                    </h3>
                                                    <div className="text-xs text-primary/60 mt-0.5">
                                                        Customize how you appear in {servers[selectedServerId]?.name}
                                                    </div>
                                                </div>
                                            </div>

                                            {isEditing ? (
                                                <div className="space-y-2">
                                                    <Input
                                                        value={editedNickname}
                                                        onChange={(e) => setEditedNickname(e.target.value)}
                                                        placeholder="Enter your nickname for this server"
                                                        className="bg-background/50 border-primary/30 text-primary placeholder:text-primary/40 focus:bg-background/80 transition-colors"
                                                    />
                                                    <div className="text-xs text-primary/60">
                                                        Only visible to members of this server
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-3 bg-background/30 rounded-md border border-primary/30">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className="text-sm font-medium text-foreground">
                                                                {editedNickname || "No nickname set"}
                                                            </div>
                                                            <div className="text-xs text-primary/60 mt-1">
                                                                {editedNickname ?
                                                                    `Visible to ${servers[selectedServerId]?.name} members` :
                                                                    "Set a custom nickname for this server"
                                                                }
                                                            </div>
                                                        </div>
                                                        {editedNickname && (
                                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : availableServers.length > 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                                            <Edit2 className="w-5 h-5 text-primary/30" />
                                        </div>
                                        <div className="text-sm font-medium text-foreground mb-1">
                                            Server Profile Ready
                                        </div>
                                        <div className="text-xs text-primary/60 max-w-sm">
                                            Select a server above to customize your nickname.
                                        </div>
                                    </div>
                                ) : null}
                            </TabsContent>
                        </Tabs>
                    </div>

                    <DialogFooter className="relative z-10 px-4 py-3 border-t border-primary/10 bg-background/80 backdrop-blur-sm flex-shrink-0">
                        <DialogClose className="text-xs bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors px-3 py-1.5 rounded-sm">
                            Close
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}