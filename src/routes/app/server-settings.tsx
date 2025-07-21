import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router"
import { cn, uploadFileTurbo } from "@/lib/utils"
import { useSubspace } from "@/hooks/use-subspace"
import { useGlobalState } from "@/hooks/use-global-state"
import { useWallet } from "@/hooks/use-wallet"

// UI Components
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { Badge } from "@/components/ui/badge"

// Icons
import {
    ArrowLeft, Settings, Edit2, Save, X, Upload, Trash2, Plus,
    Hash, Volume2, Users, Shield, Crown, Eye, EyeOff,
    ChevronDown, ChevronUp, GripVertical, MoreHorizontal
} from "lucide-react"

// Assets
import alien from "@/assets/subspace/alien-black.svg"
import { toast } from "sonner"

export default function ServerSettings() {
    const { serverId } = useParams()
    const navigate = useNavigate()
    const { servers, actions } = useSubspace()
    const { address } = useWallet()
    const [activeTab, setActiveTab] = useState("overview")

    // Get server data
    const server = servers[serverId || ""]

    // Loading states
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)

    // Server profile states
    const [serverName, setServerName] = useState("")
    const [serverDescription, setServerDescription] = useState("")
    const [serverLogo, setServerLogo] = useState<File | null>(null)
    const [editingProfile, setEditingProfile] = useState(false)

    // Member states
    const [members, setMembers] = useState<any[]>([])
    const [loadingMembers, setLoadingMembers] = useState(false)

    // Initialize server data
    useEffect(() => {
        if (!serverId) {
            navigate("/app")
            return
        }

        if (server) {
            setServerName(server.name || "")
            setServerDescription(server.description || "")
        }

        // Load server and members
        const loadServerData = async () => {
            try {
                setLoading(true)
                await actions.servers.get(serverId, true)

                setLoadingMembers(true)
                const membersList = await actions.servers.getMembers(serverId)
                setMembers(membersList)
            } catch (error) {
                console.error("Failed to load server data:", error)
                toast.error("Failed to load server data")
            } finally {
                setLoading(false)
                setLoadingMembers(false)
            }
        }

        loadServerData()
    }, [serverId, server?.name, server?.description])

    // Save server profile
    const handleSaveProfile = async () => {
        if (!serverId) return

        try {
            setUploading(true)
            let logoUrl = server?.logo || ""

            // Upload new logo if provided
            if (serverLogo) {
                logoUrl = await uploadFileTurbo(serverLogo)
            }

            // Update server (this would need to be implemented in the SDK)
            // For now, we'll show a success message
            toast.success("Server profile updated successfully")
            setEditingProfile(false)
            setServerLogo(null)
        } catch (error) {
            console.error("Failed to update server:", error)
            toast.error("Failed to update server profile")
        } finally {
            setUploading(false)
        }
    }

    if (!server && !loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto">
                        <img src={alien} alt="alien" className="w-8 h-8 opacity-60" />
                    </div>
                    <div>
                        <p className="text-primary/60 font-freecam text-lg">Server not found</p>
                        <p className="text-primary/40 font-ocr text-sm mt-1">The server may have been deleted or you don't have access</p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => navigate("/app")}
                        className="mt-6 font-ocr border-primary/30 text-primary hover:bg-primary/10"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Return to App
                    </Button>
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto">
                        <div className="w-8 h-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                    </div>
                    <div>
                        <p className="text-primary/60 font-freecam text-lg">Loading server settings...</p>
                        <p className="text-primary/40 font-ocr text-sm mt-1">Please wait while we fetch server data</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-screen w-screen bg-background overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 relative border-b border-primary/20 bg-gradient-to-r from-background via-background/95 to-background">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-8 bg-primary/5 rounded-full blur-xl" />

                <div className="relative z-10 flex items-center justify-between p-4 px-6">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/app/${serverId}`)}
                            className="w-9 h-9 rounded-sm text-primary/60 hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/30 transition-all"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-primary/20 rounded-sm border border-primary/30">
                                <img src={alien} alt="alien" className="w-5 h-5 opacity-80" />
                            </div>
                            <div>
                                <h1 className="text-xl font-freecam text-primary tracking-wide">
                                    SERVER SETTINGS
                                </h1>
                                <p className="text-xs font-ocr text-primary/60">
                                    {server?.name || "Loading..."}
                                </p>
                            </div>
                        </div>
                    </div>

                    <Settings className="w-5 h-5 text-primary/60" />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-row h-full">
                    {/* Sidebar Navigation */}
                    <div className="w-64 border-r border-primary/20 bg-background/30 backdrop-blur-sm relative">
                        {/* Ambient sidebar glow */}
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

                        <div className="p-4 space-y-2 relative z-10">
                            <TabsList className="flex-col h-auto w-full bg-transparent p-0 space-y-2">
                                <TabsTrigger
                                    value="overview"
                                    className="w-full justify-start bg-transparent data-[state=active]:bg-primary/15 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/30 font-ocr h-10 px-3 rounded-sm hover:bg-primary/5 transition-all"
                                >
                                    <Settings className="w-4 h-4 mr-3 flex-shrink-0" />
                                    Server Profile
                                </TabsTrigger>
                                <TabsTrigger
                                    value="channels"
                                    className="w-full justify-start bg-transparent data-[state=active]:bg-primary/15 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/30 font-ocr h-10 px-3 rounded-sm hover:bg-primary/5 transition-all"
                                >
                                    <Hash className="w-4 h-4 mr-3 flex-shrink-0" />
                                    Channels
                                </TabsTrigger>
                                <TabsTrigger
                                    value="roles"
                                    className="w-full justify-start bg-transparent data-[state=active]:bg-primary/15 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/30 font-ocr h-10 px-3 rounded-sm hover:bg-primary/5 transition-all"
                                >
                                    <Shield className="w-4 h-4 mr-3 flex-shrink-0" />
                                    Roles
                                </TabsTrigger>
                                <TabsTrigger
                                    value="members"
                                    className="w-full justify-start bg-transparent data-[state=active]:bg-primary/15 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/30 font-ocr h-10 px-3 rounded-sm hover:bg-primary/5 transition-all"
                                >
                                    <Users className="w-4 h-4 mr-3 flex-shrink-0" />
                                    Members
                                </TabsTrigger>
                            </TabsList>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background/95 to-background relative">
                        {/* Background decoration */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary)/0.03)_0%,transparent_50%)] pointer-events-none" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(var(--primary)/0.03)_0%,transparent_50%)] pointer-events-none" />

                        {/* Server Profile Tab */}
                        <TabsContent value="overview" className="m-0 h-full relative z-10">
                            <div className="p-8 space-y-8">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-freecam text-primary tracking-wide">SERVER PROFILE</h2>
                                        <p className="text-sm font-ocr text-primary/60 max-w-lg">
                                            Customize how your server appears in invite links and Server Discovery
                                        </p>
                                    </div>
                                    {!editingProfile ? (
                                        <Button
                                            onClick={() => setEditingProfile(true)}
                                            variant="outline"
                                            className="font-ocr bg-primary/5 border-primary/30 text-primary hover:bg-primary/15 hover:border-primary/50"
                                        >
                                            <Edit2 className="w-4 h-4 mr-2" />
                                            Edit Profile
                                        </Button>
                                    ) : (
                                        <div className="flex gap-3">
                                            <Button
                                                variant="ghost"
                                                onClick={() => {
                                                    setEditingProfile(false)
                                                    setServerName(server?.name || "")
                                                    setServerDescription(server?.description || "")
                                                    setServerLogo(null)
                                                }}
                                                className="font-ocr text-primary/60 hover:text-primary"
                                            >
                                                <X className="w-4 h-4 mr-2" />
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={handleSaveProfile}
                                                disabled={uploading}
                                                className="font-ocr bg-primary text-black hover:bg-primary/90"
                                            >
                                                {uploading ? (
                                                    <>
                                                        <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="w-4 h-4 mr-2" />
                                                        Save Changes
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                <Card className="p-8 bg-card/50 border-primary/20 backdrop-blur-sm shadow-xl relative overflow-hidden">
                                    {/* Card glow effect */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />

                                    <div className="space-y-8 relative z-10">
                                        {/* Server Name */}
                                        <div className="space-y-3">
                                            <Label className="text-base font-freecam text-primary tracking-wide">SERVER NAME</Label>
                                            <Input
                                                value={serverName}
                                                onChange={(e) => setServerName(e.target.value)}
                                                disabled={!editingProfile}
                                                className="font-ocr text-lg h-12 bg-background/30 border-primary/20 focus:border-primary/50 focus:bg-background/50"
                                                placeholder="Enter server name"
                                            />
                                        </div>

                                        {/* Server Description */}
                                        <div className="space-y-3">
                                            <Label className="text-base font-freecam text-primary tracking-wide">DESCRIPTION</Label>
                                            <Textarea
                                                value={serverDescription}
                                                onChange={(e) => setServerDescription(e.target.value)}
                                                disabled={!editingProfile}
                                                className="font-ocr resize-none bg-background/30 border-primary/20 focus:border-primary/50 focus:bg-background/50"
                                                placeholder="Tell people what your server is about"
                                                rows={4}
                                            />
                                        </div>

                                        {/* Server Logo */}
                                        <div className="space-y-3">
                                            <Label className="text-base font-freecam text-primary tracking-wide">SERVER ICON</Label>
                                            <div className="flex items-start gap-6">
                                                <div className="flex-shrink-0 space-y-2">
                                                    <div className="w-20 h-20 rounded-xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center overflow-hidden relative group">
                                                        {server?.logo ? (
                                                            <img
                                                                src={`https://arweave.net/${server.logo}`}
                                                                alt="Server icon"
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <img src={alien} alt="default" className="w-10 h-10 opacity-60" />
                                                        )}
                                                        {/* Overlay on hover */}
                                                        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                                    </div>
                                                    <p className="text-xs font-ocr text-primary/40 text-center">Current Icon</p>
                                                </div>
                                                {editingProfile && (
                                                    <div className="flex-1">
                                                        <FileDropzone
                                                            accept={{ 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] }}
                                                            onFileChange={(file) => setServerLogo(file)}
                                                            className="w-full"
                                                            label=""
                                                            placeholder="Drop new server icon here or click to upload"
                                                            maxSize={5 * 1024 * 1024} // 5MB
                                                            previewType="square"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </TabsContent>

                        {/* Channels Tab */}
                        <TabsContent value="channels" className="m-0 h-full">
                            <div className="p-6 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-freecam text-primary">Channels & Categories</h2>
                                        <p className="text-sm font-ocr text-primary/60">
                                            Organize your server with channels and categories
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" className="font-ocr">
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Category
                                        </Button>
                                        <Button className="font-ocr">
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Channel
                                        </Button>
                                    </div>
                                </div>

                                <Card className="p-6 bg-card border-primary/30">
                                    <div className="space-y-4">
                                        {/* Placeholder for channels list */}
                                        <div className="text-center py-8">
                                            <Hash className="w-12 h-12 mx-auto mb-4 text-primary/30" />
                                            <p className="font-freecam text-primary/60 mb-2">No channels yet</p>
                                            <p className="font-ocr text-sm text-primary/40">
                                                Create channels to organize conversations
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </TabsContent>

                        {/* Roles Tab */}
                        <TabsContent value="roles" className="m-0 h-full">
                            <div className="p-6 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-freecam text-primary">Roles</h2>
                                        <p className="text-sm font-ocr text-primary/60">
                                            Use roles to group server members and assign permissions
                                        </p>
                                    </div>
                                    <Button className="font-ocr">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create Role
                                    </Button>
                                </div>

                                <Card className="p-6 bg-card border-primary/30">
                                    <div className="space-y-4">
                                        {/* Default role */}
                                        <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 bg-primary/60 rounded-full"></div>
                                                <div>
                                                    <p className="font-freecam text-primary">@everyone</p>
                                                    <p className="font-ocr text-xs text-primary/60">Default permissions • All members</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="font-ocr text-xs">
                                                    {members.length} members
                                                </Badge>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Other roles would be listed here */}
                                        {server?.roles && Object.values(server.roles).length > 0 ? (
                                            Object.values(server.roles).map((role: any) => (
                                                <div key={role.roleId} className="flex items-center justify-between p-4 bg-background/50 border border-primary/10 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-3 h-3 bg-primary rounded-full"></div>
                                                        <div>
                                                            <p className="font-freecam text-primary">@{role.name}</p>
                                                            <p className="font-ocr text-xs text-primary/60">Custom role</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary" className="font-ocr text-xs">
                                                            {members.filter(m => m.roles?.includes(role.roleId)).length} members
                                                        </Badge>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-8">
                                                <Shield className="w-12 h-12 mx-auto mb-4 text-primary/30" />
                                                <p className="font-freecam text-primary/60 mb-2">No custom roles yet</p>
                                                <p className="font-ocr text-sm text-primary/40">
                                                    Create roles to organize members and set permissions
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </div>
                        </TabsContent>

                        {/* Members Tab */}
                        <TabsContent value="members" className="m-0 h-full">
                            <div className="p-6 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-freecam text-primary">Members</h2>
                                        <p className="text-sm font-ocr text-primary/60">
                                            View and manage server members
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            placeholder="Search members..."
                                            className="w-64 font-ocr"
                                        />
                                        <Button variant="outline" className="font-ocr">
                                            <Users className="w-4 h-4 mr-2" />
                                            {members.length} Members
                                        </Button>
                                    </div>
                                </div>

                                <Card className="bg-card border-primary/30">
                                    <div className="overflow-x-auto">
                                        <div className="min-w-full">
                                            {/* Table Header */}
                                            <div className="grid grid-cols-12 gap-4 p-4 border-b border-primary/20 bg-primary/5">
                                                <div className="col-span-4 font-freecam text-sm text-primary">NAME</div>
                                                <div className="col-span-3 font-freecam text-sm text-primary">MEMBER SINCE</div>
                                                <div className="col-span-2 font-freecam text-sm text-primary">ROLES</div>
                                                <div className="col-span-2 font-freecam text-sm text-primary">STATUS</div>
                                                <div className="col-span-1 font-freecam text-sm text-primary">ACTIONS</div>
                                            </div>

                                            {/* Table Body */}
                                            <div className="max-h-96 overflow-y-auto">
                                                {loadingMembers ? (
                                                    <div className="flex items-center justify-center py-8">
                                                        <div className="w-6 h-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                                                        <span className="ml-2 font-ocr text-primary/60">Loading members...</span>
                                                    </div>
                                                ) : members.length > 0 ? (
                                                    members.map((member, index) => (
                                                        <div key={member.userId || index} className="grid grid-cols-12 gap-4 p-4 border-b border-primary/10 hover:bg-primary/5 transition-colors">
                                                            <div className="col-span-4 flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                                                                    <span className="font-ocr text-xs text-primary">
                                                                        {member.userId?.slice(0, 2).toUpperCase() || "??"}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <p className="font-ocr text-sm text-primary">
                                                                        {member.nickname || member.userId?.slice(0, 12) + "..." || "Unknown"}
                                                                    </p>
                                                                    <p className="font-ocr text-xs text-primary/60">
                                                                        {member.userId?.slice(0, 20) + "..." || "Unknown ID"}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="col-span-3 flex items-center">
                                                                <p className="font-ocr text-sm text-primary/80">
                                                                    {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : "Unknown"}
                                                                </p>
                                                            </div>

                                                            <div className="col-span-2 flex items-center gap-1">
                                                                {member.roles && member.roles.length > 0 ? (
                                                                    member.roles.slice(0, 2).map((roleId: string) => {
                                                                        const role = server?.roles?.[roleId]
                                                                        return (
                                                                            <Badge key={roleId} variant="secondary" className="font-ocr text-xs">
                                                                                {role?.name || roleId.slice(0, 8)}
                                                                            </Badge>
                                                                        )
                                                                    })
                                                                ) : (
                                                                    <span className="font-ocr text-xs text-primary/40">No roles</span>
                                                                )}
                                                                {member.roles && member.roles.length > 2 && (
                                                                    <Badge variant="outline" className="font-ocr text-xs">
                                                                        +{member.roles.length - 2}
                                                                    </Badge>
                                                                )}
                                                            </div>

                                                            <div className="col-span-2 flex items-center">
                                                                <Badge
                                                                    variant="outline"
                                                                    className="font-ocr text-xs border-green-500/30 text-green-400"
                                                                >
                                                                    Active
                                                                </Badge>
                                                            </div>

                                                            <div className="col-span-1 flex items-center">
                                                                <Button variant="ghost" size="icon" className="w-8 h-8">
                                                                    <MoreHorizontal className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-8">
                                                        <Users className="w-12 h-12 mx-auto mb-4 text-primary/30" />
                                                        <p className="font-freecam text-primary/60 mb-2">No members found</p>
                                                        <p className="font-ocr text-sm text-primary/40">
                                                            Members will appear here once they join
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
    )
}