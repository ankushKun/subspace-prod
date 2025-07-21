import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    Plus,
    Settings,
    Trash2,
    GripVertical,
    Users,
    Shield,
    Crown,
    Settings2
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Role {
    id: string
    name: string
    color: string
    memberCount: number
    position: number
    permissions: string[]
    isDefault?: boolean
}

const roleColors = [
    "#99AAB5", // Default grey
    "#1ABC9C", // Teal
    "#2ECC71", // Green  
    "#3498DB", // Blue
    "#9B59B6", // Purple
    "#E91E63", // Pink
    "#F1C40F", // Yellow
    "#E67E22", // Orange
    "#E74C3C", // Red
    "#95A5A6", // Light Grey
]

const availablePermissions = [
    { id: "administrator", name: "Administrator", description: "All permissions" },
    { id: "manage_server", name: "Manage Server", description: "Edit server settings" },
    { id: "manage_roles", name: "Manage Roles", description: "Create, edit, and delete roles" },
    { id: "manage_channels", name: "Manage Channels", description: "Create, edit, and delete channels" },
    { id: "kick_members", name: "Kick Members", description: "Remove members from server" },
    { id: "ban_members", name: "Ban Members", description: "Ban members from server" },
    { id: "send_messages", name: "Send Messages", description: "Send messages in text channels" },
    { id: "read_messages", name: "Read Messages", description: "View messages in text channels" },
    { id: "connect", name: "Connect", description: "Connect to voice channels" },
    { id: "speak", name: "Speak", description: "Speak in voice channels" },
]

const mockRoles: Role[] = [
    {
        id: "1",
        name: "@everyone",
        color: "#99AAB5",
        memberCount: 95,
        position: 0,
        permissions: ["read_messages", "send_messages", "connect", "speak"],
        isDefault: true
    },
    {
        id: "2",
        name: "Core",
        color: "#1ABC9C",
        memberCount: 5,
        position: 5,
        permissions: ["administrator"]
    },
    {
        id: "3",
        name: "Moderators",
        color: "#3498DB",
        memberCount: 2,
        position: 4,
        permissions: ["manage_server", "kick_members", "ban_members", "send_messages", "read_messages"]
    },
    {
        id: "4",
        name: "Developer",
        color: "#E74C3C",
        memberCount: 8,
        position: 3,
        permissions: ["manage_channels", "send_messages", "read_messages", "connect", "speak"]
    },
    {
        id: "5",
        name: "Member",
        color: "#95A5A6",
        memberCount: 80,
        position: 1,
        permissions: ["send_messages", "read_messages", "connect", "speak"]
    },
]

export default function ServerRoles() {
    const [roles, setRoles] = useState(mockRoles)
    const [selectedRole, setSelectedRole] = useState<Role | null>(null)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [newRoleName, setNewRoleName] = useState("")
    const [newRoleColor, setNewRoleColor] = useState(roleColors[0])

    const sortedRoles = [...roles].sort((a, b) => b.position - a.position)

    const createRole = () => {
        if (!newRoleName.trim()) return

        const newRole: Role = {
            id: Date.now().toString(),
            name: newRoleName,
            color: newRoleColor,
            memberCount: 0,
            position: Math.max(...roles.map(r => r.position)) + 1,
            permissions: ["read_messages", "send_messages"]
        }

        setRoles([...roles, newRole])
        setNewRoleName("")
        setNewRoleColor(roleColors[0])
        setIsCreateDialogOpen(false)
    }

    const deleteRole = (roleId: string) => {
        setRoles(roles.filter(r => r.id !== roleId))
        if (selectedRole?.id === roleId) {
            setSelectedRole(null)
        }
    }

    const updateRolePermission = (roleId: string, permission: string, enabled: boolean) => {
        setRoles(roles.map(role => {
            if (role.id === roleId) {
                const updatedPermissions = enabled
                    ? [...role.permissions, permission]
                    : role.permissions.filter(p => p !== permission)
                return { ...role, permissions: updatedPermissions }
            }
            return role
        }))

        if (selectedRole?.id === roleId) {
            const updatedPermissions = enabled
                ? [...selectedRole.permissions, permission]
                : selectedRole.permissions.filter(p => p !== permission)
            setSelectedRole({ ...selectedRole, permissions: updatedPermissions })
        }
    }

    const getRoleIcon = (role: Role) => {
        if (role.isDefault) return Users
        if (role.permissions.includes("administrator")) return Crown
        if (role.permissions.includes("manage_server")) return Shield
        return Settings2
    }

    return (
        <div className="p-6 space-y-6">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary)/0.02)_0%,transparent_50%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(var(--primary)/0.02)_0%,transparent_50%)] pointer-events-none" />

            <div className="relative z-10 max-w-4xl mx-auto space-y-6">
                {/* Create Role */}
                <div className="flex justify-between items-center">
                    <p className="text-sm text-primary/60 font-ocr">
                        Members use the color of the highest role they have on this list. Drag roles to reorder them.
                    </p>
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="font-freecam tracking-wide">
                                <Plus className="w-4 h-4 mr-2" />
                                CREATE ROLE
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="border-primary/20 bg-background/95 backdrop-blur-sm">
                            <DialogHeader>
                                <DialogTitle className="font-freecam text-primary tracking-wide">CREATE NEW ROLE</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="role-name" className="font-ocr text-primary">Role Name</Label>
                                    <Input
                                        id="role-name"
                                        value={newRoleName}
                                        onChange={(e) => setNewRoleName(e.target.value)}
                                        placeholder="Enter role name"
                                        className="font-ocr bg-background/80 border-primary/30 focus:border-primary focus:ring-primary/20"
                                    />
                                </div>
                                <div>
                                    <Label className="font-ocr text-primary">Role Color</Label>
                                    <div className="grid grid-cols-5 gap-2 mt-2">
                                        {roleColors.map((color) => (
                                            <button
                                                key={color}
                                                className={cn(
                                                    "w-10 h-10 rounded-lg border-2 transition-all duration-200 hover:scale-110",
                                                    newRoleColor === color
                                                        ? "border-primary ring-2 ring-primary/50 scale-105"
                                                        : "border-primary/30 hover:border-primary/60"
                                                )}
                                                style={{ backgroundColor: color }}
                                                onClick={() => setNewRoleColor(color)}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="font-ocr border-primary/30 hover:border-primary text-primary hover:bg-primary/10">
                                        Cancel
                                    </Button>
                                    <Button onClick={createRole} disabled={!newRoleName.trim()} className="font-ocr">
                                        Create Role
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Role List */}
                    <Card className="border-primary/30 shadow-lg backdrop-blur-sm relative">
                        {/* Card glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-xl pointer-events-none" />

                        <CardHeader className="relative z-10 pb-3">
                            <CardTitle className="font-freecam text-primary tracking-wide">ROLES - {roles.length}</CardTitle>
                        </CardHeader>
                        <CardContent className="relative z-10 space-y-2">
                            {sortedRoles.map((role) => {
                                const Icon = getRoleIcon(role)
                                const isSelected = selectedRole?.id === role.id

                                return (
                                    <div
                                        key={role.id}
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all group",
                                            isSelected
                                                ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                                                : "border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                                        )}
                                        onClick={() => setSelectedRole(role)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <GripVertical className="w-4 h-4 text-primary/40 cursor-grab opacity-0 group-hover:opacity-100 hover:text-primary/60" />
                                            <div
                                                className="w-4 h-4 rounded-full ring-1 ring-black/20"
                                                style={{ backgroundColor: role.color }}
                                            />
                                            <Icon className="w-4 h-4 text-primary/60" />
                                            <span className="font-ocr font-medium text-foreground">{role.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="text-xs font-ocr bg-primary/10 text-primary border-primary/30">
                                                {role.memberCount} {role.memberCount === 1 ? 'member' : 'members'}
                                            </Badge>
                                            {!role.isDefault && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        deleteRole(role.id)
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-500 hover:bg-red-500/10"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>

                    {/* Role Permissions */}
                    <Card className="border-primary/30 shadow-lg backdrop-blur-sm relative">
                        {/* Card glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-xl pointer-events-none" />

                        <CardHeader className="relative z-10 pb-3">
                            <CardTitle className="font-freecam text-primary tracking-wide">
                                {selectedRole ? `${selectedRole.name.toUpperCase()} PERMISSIONS` : "SELECT A ROLE"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            {selectedRole ? (
                                <div className="space-y-4">
                                    {availablePermissions.map((permission) => {
                                        const hasPermission = selectedRole.permissions.includes(permission.id)
                                        const isDisabled = selectedRole.isDefault && permission.id === "administrator"

                                        return (
                                            <div
                                                key={permission.id}
                                                className="flex items-center justify-between p-3 rounded-lg border border-primary/20 bg-background/50"
                                            >
                                                <div className="space-y-1">
                                                    <Label className="font-ocr font-medium text-foreground">{permission.name}</Label>
                                                    <p className="text-sm text-primary/60 font-ocr">
                                                        {permission.description}
                                                    </p>
                                                </div>
                                                <Switch
                                                    checked={hasPermission}
                                                    disabled={isDisabled}
                                                    onCheckedChange={(checked) =>
                                                        updateRolePermission(selectedRole.id, permission.id, checked)
                                                    }
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-primary/60 font-ocr">
                                    Select a role to view and edit its permissions
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
