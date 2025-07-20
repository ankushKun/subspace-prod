import { useSubspace } from "@/hooks/use-subspace"
import { useWallet } from "@/hooks/use-wallet"
import { cn, shortenAddress, uploadFileAR } from "@/lib/utils"
import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Settings, LogOut, User, Edit2, Save, X, Camera } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import alien from "@/assets/subspace/alien-black.svg"
import LoginDialog from "@/components/login-dialog"
import { useNavigate } from "react-router"


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
    const { address, connected, actions: walletActions } = useWallet()
    const { profile, servers, actions, subspace } = useSubspace()

    // UI State
    const [profileDialogOpen, setProfileDialogOpen] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editedNickname, setEditedNickname] = useState("")
    const [selectedServerId, setSelectedServerId] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!connected || !address || !subspace) return

        actions.profile.get()
    }, [connected, address, subspace])

    // Load current nickname when server is selected
    useEffect(() => {
        if (!selectedServerId || !profile?.userId) return

        const loadCurrentNickname = async () => {
            try {
                const server = servers[selectedServerId]
                if (server) {
                    const member = await actions.servers.getMember(selectedServerId, profile.userId)
                    setEditedNickname(member?.nickname || "")
                }
            } catch (error) {
                console.error("Failed to load current nickname:", error)
                setEditedNickname("")
            }
        }

        loadCurrentNickname()
    }, [selectedServerId, profile?.userId, servers])

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
        if (profileProxy.primaryName) return profileProxy.primaryName
        if (profileProxy.userIdShort) return profileProxy.userIdShort
        return 'NOT_CONNECTED'
    }

    const handleOpenProfile = () => {
        setProfileDialogOpen(true)
    }

    const handleCancelEdit = () => {
        setIsEditing(false)
        setEditedNickname("")
    }

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file || !profile) return

        // Validate file size (max 100KB)
        if (file.size > 100 * 1024) {
            alert("File size must be less than 100KB")
            return
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert("Please select an image file")
            return
        }

        setIsUploading(true)
        try {
            const pfpId = await uploadFileAR(file)
            await actions.profile.updateProfile({ pfp: pfpId })
            await actions.profile.refresh()
        } catch (error) {
            console.error("Failed to upload profile picture:", error)
            alert("Failed to upload profile picture. Please try again.")
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
        }
    }

    const handleSaveNickname = async () => {
        if (!selectedServerId || !profile) return

        setIsSaving(true)
        try {
            const server = servers[selectedServerId]
            if (server) {
                await actions.servers.updateMember(selectedServerId, {
                    userId: profile.userId,
                    nickname: editedNickname || undefined
                })
                setIsEditing(false)
            }
        } catch (error) {
            console.error("Failed to update nickname:", error)
            alert("Failed to update nickname. Please try again.")
        } finally {
            setIsSaving(false)
        }
    }

    // show a login button in the same style as the profile button
    if (!address) return (
        <div className={cn("", className)}>
            <div className="p-0.5 flex items-center justify-between gap-2">
                {/* Login Button */}
                <LoginDialog>
                    <Button
                        variant="ghost"
                        className="flex items-center gap-2 p-2 h-auto hover:bg-primary/10 transition-colors grow font-ocr text-primary border border-transparent hover:border-primary/30"
                    >
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
                                        <span className="truncate max-w-52">{profileProxy.userIdShort}</span>
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

            {/* Profile Settings Dialog */}
            <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
                <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[90vh] p-4 outline-0 overflow-hidden flex flex-col bg-background border border-primary/30 shadow-2xl" removeCloseButton>
                    <DialogHeader className="flex-shrink-0 border-b border-primary/20 pb-4">
                        <DialogTitle className="flex items-center justify-between font-freecam text-xl text-primary">
                            <div className="flex items-center gap-2">
                                <img src={alien} alt="alien" className="w-6 h-6" />
                                <span>Profile Settings</span>
                            </div>
                            {!isEditing ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-2 font-ocr bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                                >
                                    <Edit2 className="h-4 w-4" />
                                    <span className="hidden sm:inline">Edit</span>
                                </Button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCancelEdit}
                                        className="flex items-center gap-2 font-ocr bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                                    >
                                        <X className="h-4 w-4" />
                                        <span className="hidden sm:inline">Cancel</span>
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleSaveNickname}
                                        disabled={isSaving}
                                        className="flex items-center gap-2 font-ocr bg-primary text-black hover:bg-primary/90 disabled:opacity-50"
                                    >
                                        <Save className="h-4 w-4" />
                                        <span className="hidden sm:inline">{isSaving ? "Saving..." : "Save"}</span>
                                    </Button>
                                </div>
                            )}
                        </DialogTitle>
                        <DialogDescription className="font-ocr text-primary/60 text-center">
                            Manage your profile and server settings.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-4 sm:px-6 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                        <Tabs defaultValue="global" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 bg-primary/10 border border-primary/30">
                                <TabsTrigger value="global" className="text-xs sm:text-sm font-ocr data-[state=active]:bg-primary data-[state=active]:text-black">
                                    Global Profile
                                </TabsTrigger>
                                <TabsTrigger value="server" className="text-xs sm:text-sm font-ocr data-[state=active]:bg-primary data-[state=active]:text-black">
                                    <span className="hidden sm:inline">Server Profile</span>
                                    <span className="sm:hidden">Server</span>
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="global" className="space-y-6 mt-6">
                                {/* Profile Picture Section */}
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                                        <div className="relative group">
                                            <div
                                                className={`w-20 h-20 rounded-sm overflow-hidden bg-primary/20 flex items-center justify-center transition-all duration-200 border-2 ${isEditing && !isUploading
                                                    ? 'border-dashed border-primary/60 group-hover:border-primary group-hover:scale-105 cursor-pointer shadow-lg group-hover:shadow-xl'
                                                    : 'border-primary/30'
                                                    } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                onClick={isEditing && !isUploading ? () => fileInputRef.current?.click() : undefined}
                                            >
                                                {profileProxy.pfp ? (
                                                    <img
                                                        src={`https://arweave.net/${profileProxy.pfp}`}
                                                        alt="Profile"
                                                        className={`w-full h-full object-cover transition-all duration-200 ${isEditing ? 'group-hover:brightness-75' : ''
                                                            }`}
                                                    />
                                                ) : (
                                                    <img
                                                        src={alien}
                                                        alt="alien"
                                                        className={`w-10 h-10 opacity-80 transition-all duration-200 ${isEditing ? 'group-hover:opacity-50' : ''
                                                            }`}
                                                    />
                                                )}
                                            </div>
                                            {isEditing && (
                                                <>
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-sm cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <Camera className="h-6 w-6 text-primary" />
                                                            <span className="text-xs text-primary font-ocr">UPLOAD</span>
                                                        </div>
                                                    </div>
                                                    <div className="absolute -bottom-1 -right-1 bg-primary text-black rounded-sm p-1.5 shadow-lg border border-primary/30 z-20">
                                                        <Camera className="h-3 w-3" />
                                                    </div>
                                                    <div className="absolute inset-0 rounded-sm border-2 border-primary/30 animate-pulse z-0"></div>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex-1 text-center sm:text-left">
                                            <h3 className="text-lg font-freecam text-primary">Profile Picture</h3>
                                            <p className="text-sm text-primary/60 font-ocr">
                                                {isEditing
                                                    ? isUploading ? "Uploading..." : "Click to upload new avatar (max 100KB)"
                                                    : "Your avatar is visible across all servers"
                                                }
                                            </p>
                                            {isEditing && (
                                                <p className="text-xs text-primary/40 mt-1 font-ocr">
                                                    Supported formats: PNG, JPEG • Max size: 100KB
                                                </p>
                                            )}
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
                                </div>

                                {/* Primary Name Section */}
                                <div className="space-y-2">
                                    <Label className="text-base font-freecam text-primary">Primary Name</Label>
                                    <div className="p-2 px-3 bg-primary/10 rounded-sm">
                                        <p className="text-lg font-ocr text-primary/80">
                                            {profileProxy.primaryName || (
                                                <span className="text-primary/40 italic">No primary name set</span>
                                            )}
                                        </p>
                                        {!profileProxy.primaryName && (
                                            <p className="text-xs text-primary/60 mt-1 font-ocr">
                                                Get your primary name at{" "}
                                                <a
                                                    href="https://arns.ar.io"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline"
                                                >
                                                    arns.ar.io
                                                </a>
                                            </p>
                                        )}
                                    </div>
                                    <p className="text-xs text-primary/60 font-ocr">
                                        Primary names can be acquired from the <a href="https://arns.ar.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ArNS registry</a>
                                    </p>
                                </div>

                                {/* Wallet Address Section */}
                                <div className="space-y-2">
                                    <Label className="text-base font-freecam text-primary">Wallet Address</Label>
                                    <div className="p-2 px-3 bg-primary/10 rounded-sm">
                                        <p className="text-sm font-mono text-primary/80 break-all">{address}</p>
                                    </div>
                                    <p className="text-xs text-primary/60 font-ocr">
                                        Your unique identifier on the Permaweb
                                    </p>
                                </div>
                            </TabsContent>

                            <TabsContent value="server" className="space-y-6 mt-6">
                                {/* Server Selector */}
                                <div className="space-y-2">
                                    <Label htmlFor="server-selector" className="text-base font-freecam text-primary">
                                        Select Server
                                    </Label>
                                    <Select
                                        value={selectedServerId || undefined}
                                        onValueChange={(value) => setSelectedServerId(value)}
                                    >
                                        <SelectTrigger className="w-full bg-primary/10 border-primary/30 text-primary font-ocr">
                                            <SelectValue placeholder="Choose a server" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-background border border-primary/30">
                                            {availableServers.map(([serverId, server]) => (
                                                <SelectItem key={serverId} value={serverId} className="font-ocr text-primary hover:bg-primary/10">
                                                    {server.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {availableServers.length === 0 && (
                                        <p className="text-sm text-primary/60 mt-2 font-ocr">
                                            No servers joined yet. Join a server to set server-specific nicknames.
                                        </p>
                                    )}
                                </div>

                                {selectedServerId && servers[selectedServerId] ? (
                                    <>
                                        {/* Server Nickname Section */}
                                        <div className="space-y-2">
                                            <Label htmlFor="server-nickname" className="text-base font-freecam text-primary">
                                                Server Nickname
                                            </Label>
                                            {isEditing ? (
                                                <Input
                                                    id="server-nickname"
                                                    value={editedNickname}
                                                    onChange={(e) => setEditedNickname(e.target.value)}
                                                    placeholder="Enter nickname for this server"
                                                    className="w-full bg-primary/10 border-primary/30 text-primary font-ocr placeholder:text-primary/40"
                                                />
                                            ) : (
                                                <div className="p-3 bg-primary/10 rounded-sm border border-primary/30">
                                                    <p className="text-sm font-ocr text-primary/80">
                                                        {editedNickname || (
                                                            <span className="text-primary/40 italic">No nickname set</span>
                                                        )}
                                                    </p>
                                                </div>
                                            )}
                                            <p className="text-xs text-primary/60 font-ocr">
                                                This nickname will only be visible to members of {servers[selectedServerId]?.name}.
                                            </p>
                                        </div>

                                        {/* Server Profile Picture Note */}
                                        <div className="p-3 bg-primary/5 rounded-sm border border-primary/20">
                                            <p className="text-sm text-primary/80 font-ocr">
                                                <strong>Note:</strong> Your avatar is shared across all servers.
                                                Update it in the Global Profile tab.
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-primary/60 font-ocr">
                                            Select a server to view and manage server-specific profile settings.
                                        </p>
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>

                    <DialogFooter className="px-4  pt-4 border-t border-primary/20 bg-background flex-shrink-0">
                        <DialogClose className="cursor-pointer font-ocr text-primary hover:text-primary/80 bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors px-4 py-2 rounded-sm">
                            Close
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}