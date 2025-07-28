import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
    Plus,
    Settings,
    Trash2,
    GripVertical,
    Users,
    Shield,
    Crown,
    Settings2,
    Loader2,
    Save,
    X
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSubspace } from "@/hooks/use-subspace"
import { useGlobalState } from "@/hooks/use-global-state"
import { useWallet } from "@/hooks/use-wallet"
import { toast } from "sonner"
import { PermissionDefinitions, PermissionHelpers, Permissions } from "@/lib/permissions"
import type { Role } from "@subspace-protocol/sdk"

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

// Extended Role interface for UI purposes
interface ExtendedRole extends Role {
    memberCount?: number
    isDefault?: boolean
}

export default function ServerRoles() {
    const { activeServerId } = useGlobalState()
    const { servers, actions: subspaceActions } = useSubspace()
    const { address: walletAddress } = useWallet()

    // Get the current server
    const server = servers[activeServerId]

    // Component state
    const [selectedRole, setSelectedRole] = useState<ExtendedRole | null>(null)
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [newRoleName, setNewRoleName] = useState("")
    const [newRoleColor, setNewRoleColor] = useState(roleColors[0])
    const [newRoleHexColor, setNewRoleHexColor] = useState("")
    const [selectedRoleHexColor, setSelectedRoleHexColor] = useState("")
    const [isCreating, setIsCreating] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)

    // Convert server roles to extended roles with member counts
    const roles = useMemo((): ExtendedRole[] => {
        if (!server || !server.roles) return []

        const serverMembers = (server as any)?.members || []

        return Object.values(server.roles).map(role => {
            // Count members with this role
            const memberCount = serverMembers.filter((member: any) =>
                member.roles && member.roles.includes(parseInt(role.roleId))
            ).length

            return {
                ...role,
                memberCount,
                isDefault: parseInt(role.roleId) === 1 // roleId 1 is always the default @everyone role
            } as ExtendedRole
        }).sort((a, b) => (b.position || 0) - (a.position || 0)) // Sort by position descending
    }, [server])

    // Check if user has permission to manage roles
    const canManageRoles = useMemo(() => {
        if (!server || !walletAddress) return false

        // Server owner can always manage roles
        if (server.ownerId === walletAddress) return true

        // Check if user has MANAGE_ROLES permission
        const serverMembers = (server as any)?.members || []
        const currentMember = serverMembers.find((m: any) => m.userId === walletAddress)

        if (!currentMember || !currentMember.roles) return false

        // Check permissions from user's roles
        for (const roleId of currentMember.roles) {
            const role = server.roles[roleId.toString()]
            if (role) {
                if (PermissionHelpers.hasPermission(role.permissions, Permissions.ADMINISTRATOR) ||
                    PermissionHelpers.hasPermission(role.permissions, Permissions.MANAGE_ROLES)) {
                    return true
                }
            }
        }

        return false
    }, [server, walletAddress])

    // Reset selected role when server changes
    useEffect(() => {
        setSelectedRole(null)
        setSelectedRoleHexColor("")
    }, [activeServerId])

    // Update hex color when selected role changes
    useEffect(() => {
        if (selectedRole) {
            setSelectedRoleHexColor(selectedRole.color || "#99AAB5")
        }
    }, [selectedRole])

    // Helper function to validate and format hex color
    const isValidHexColor = (hex: string): boolean => {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)
    }

    const formatHexColor = (hex: string): string => {
        // Remove # if present
        let cleanHex = hex.replace('#', '')

        // Convert 3-digit to 6-digit hex
        if (cleanHex.length === 3) {
            cleanHex = cleanHex.split('').map(char => char + char).join('')
        }

        // Add # prefix
        return '#' + cleanHex.toUpperCase()
    }

    const createRole = async () => {
        if (!newRoleName.trim() || !activeServerId || !canManageRoles) {
            toast.error("Invalid role name or insufficient permissions")
            return
        }

        // Validate that we have either a preset color or a valid hex color
        if (!newRoleColor && (!newRoleHexColor || !isValidHexColor(newRoleHexColor))) {
            toast.error("Please select a preset color or enter a valid hex color")
            return
        }

        setIsCreating(true)
        try {
            // Calculate the highest position + 1 for new role
            const maxPosition = Math.max(...roles.map(r => r.position || 0), 0)

            // Use hex color if provided and valid, otherwise use selected preset color
            const finalColor = newRoleHexColor && isValidHexColor(newRoleHexColor)
                ? formatHexColor(newRoleHexColor)
                : newRoleColor

            const success = await subspaceActions.servers.createRole(activeServerId, {
                name: newRoleName.trim(),
                color: finalColor,
                permissions: Permissions.SEND_MESSAGES, // Default permission
                position: maxPosition + 1
            })

            if (success) {
                toast.success("Role created successfully!")
                setNewRoleName("")
                setNewRoleColor(roleColors[0])
                setNewRoleHexColor("")
                setIsCreateDialogOpen(false)
            } else {
                toast.error("Failed to create role")
            }
        } catch (error) {
            console.error("Error creating role:", error)
            toast.error("Failed to create role")
        } finally {
            setIsCreating(false)
        }
    }

    const updateRoleColor = async (role: ExtendedRole, newColor: string) => {
        if (!activeServerId || !canManageRoles) return

        setIsUpdating(true)
        try {
            const success = await subspaceActions.servers.updateRole(activeServerId, {
                roleId: role.roleId.toString(),
                color: newColor
            })

            if (success) {
                toast.success(`${role.name} color updated!`)
                // Update local state
                if (selectedRole?.roleId === role.roleId) {
                    setSelectedRole({ ...selectedRole, color: newColor })
                    setSelectedRoleHexColor(newColor)
                }
            } else {
                toast.error("Failed to update role color")
            }
        } catch (error) {
            console.error("Error updating role color:", error)
            toast.error("Failed to update role color")
        } finally {
            setIsUpdating(false)
        }
    }

    const handleHexColorUpdate = async (role: ExtendedRole, hexColor: string) => {
        if (!hexColor.trim()) return

        if (!isValidHexColor(hexColor)) {
            toast.error("Please enter a valid hex color (e.g., #FF5733 or #F73)")
            return
        }

        const formattedColor = formatHexColor(hexColor)
        await updateRoleColor(role, formattedColor)
    }

    const updateRolePermissions = async (role: ExtendedRole, newPermissions: number) => {
        if (!activeServerId || !canManageRoles || role.isDefault) return

        setIsUpdating(true)
        try {
            const success = await subspaceActions.servers.updateRole(activeServerId, {
                roleId: role.roleId.toString(),
                permissions: newPermissions
            })

            if (success) {
                toast.success("Role permissions updated!")
                // Update local state
                if (selectedRole?.roleId === role.roleId) {
                    setSelectedRole({ ...selectedRole, permissions: newPermissions })
                }
            } else {
                toast.error("Failed to update role permissions")
            }
        } catch (error) {
            console.error("Error updating role permissions:", error)
            toast.error("Failed to update role permissions")
        } finally {
            setIsUpdating(false)
        }
    }

    const deleteRole = async (roleId: string) => {
        if (!activeServerId || !canManageRoles) {
            toast.error("Insufficient permissions to delete role")
            return
        }

        const role = roles.find(r => r.roleId === roleId)
        if (!role) return

        if (role.isDefault) {
            toast.error("Cannot delete the default @everyone role")
            return
        }

        setIsDeleting(roleId)
        try {
            const success = await subspaceActions.servers.deleteRole(activeServerId, roleId.toString())

            if (success) {
                toast.success("Role deleted successfully!")
                if (selectedRole?.roleId === roleId) {
                    setSelectedRole(null)
                }
            } else {
                toast.error("Failed to delete role")
            }
        } catch (error) {
            console.error("Error deleting role:", error)
            toast.error("Failed to delete role")
        } finally {
            setIsDeleting(null)
        }
    }

    const togglePermission = (permission: number) => {
        if (!selectedRole || !canManageRoles || selectedRole.isDefault) return

        const currentPermissions = selectedRole.permissions || 0
        const hasPermission = PermissionHelpers.hasPermission(currentPermissions, permission)

        const newPermissions = hasPermission
            ? PermissionHelpers.removePermission(currentPermissions, permission)
            : PermissionHelpers.addPermission(currentPermissions, permission)

        updateRolePermissions(selectedRole, newPermissions)
    }

    const getRoleIcon = (role: ExtendedRole) => {
        if (role.isDefault) return Users
        const permissions = role.permissions || 0
        if (PermissionHelpers.hasPermission(permissions, Permissions.ADMINISTRATOR)) return Crown
        if (PermissionHelpers.hasPermission(permissions, Permissions.MANAGE_SERVER)) return Shield
        return Settings2
    }

    if (!server) {
        return (
            <div className="p-6 space-y-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary)/0.02)_0%,transparent_50%)] pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(var(--primary)/0.02)_0%,transparent_50%)] pointer-events-none" />

                <div className="relative z-10 max-w-2xl mx-auto">
                    <div className="text-center space-y-6">
                        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center border border-primary/30">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold font-freecam text-primary tracking-wide">LOADING SERVER</h1>
                            <p className="text-primary/80 font-ocr mt-2">
                                Please wait while we load the server data...
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (!canManageRoles) {
        return (
            <div className="p-6 space-y-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary)/0.02)_0%,transparent_50%)] pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(var(--primary)/0.02)_0%,transparent_50%)] pointer-events-none" />

                <div className="relative z-10 max-w-2xl mx-auto">
                    <div className="text-center space-y-6">
                        <div className="w-16 h-16 mx-auto bg-orange-500/10 rounded-full flex items-center justify-center border border-orange-500/30">
                            <X className="w-8 h-8 text-orange-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold font-freecam text-orange-500 tracking-wide">ACCESS DENIED</h1>
                            <p className="text-orange-500/80 font-ocr mt-2">
                                You don't have permission to manage server roles.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Group permissions by category for better UI organization
    const permissionsByCategory = useMemo(() => {
        const grouped = PermissionDefinitions.reduce((acc, perm) => {
            if (!acc[perm.category]) acc[perm.category] = []
            acc[perm.category].push(perm)
            return acc
        }, {} as Record<string, (typeof PermissionDefinitions)[number][]>)

        return grouped
    }, [])

    return (
        <div className="p-6 space-y-6">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary)/0.02)_0%,transparent_50%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(var(--primary)/0.02)_0%,transparent_50%)] pointer-events-none" />

            <div className="relative z-10 max-w-6xl mx-auto space-y-6">
                {/* Header */}
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
                                        maxLength={50}
                                    />
                                    <p className="text-xs text-primary/60 mt-1 font-ocr">
                                        {newRoleName.length}/50 characters
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <Label className="font-ocr text-primary">Preset Colors</Label>
                                        <div className="grid grid-cols-5 gap-2 mt-2">
                                            {roleColors.map((color) => (
                                                <button
                                                    key={color}
                                                    className={cn(
                                                        "w-10 h-10 rounded-lg border-2 transition-all duration-200 hover:scale-110",
                                                        newRoleColor === color && !newRoleHexColor
                                                            ? "border-primary ring-2 ring-primary/50 scale-105"
                                                            : "border-primary/30 hover:border-primary/60"
                                                    )}
                                                    style={{ backgroundColor: color }}
                                                    onClick={() => {
                                                        setNewRoleColor(color)
                                                        setNewRoleHexColor("") // Clear hex when preset is selected
                                                    }}
                                                    disabled={isCreating}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <Label className="font-ocr text-primary">Custom Hex Color</Label>
                                        <div className="flex gap-2 mt-2">
                                            <Input
                                                value={newRoleHexColor}
                                                onChange={(e) => {
                                                    setNewRoleHexColor(e.target.value)
                                                    if (e.target.value) {
                                                        setNewRoleColor("") // Clear preset when hex is entered
                                                    }
                                                }}
                                                placeholder="#FF5733"
                                                className="font-mono text-sm bg-background/80 border-primary/30 focus:border-primary focus:ring-primary/20"
                                                disabled={isCreating}
                                            />
                                            <div
                                                className="w-10 h-10 rounded border-2 border-primary/30 flex-shrink-0"
                                                style={{
                                                    backgroundColor: newRoleHexColor && isValidHexColor(newRoleHexColor)
                                                        ? formatHexColor(newRoleHexColor)
                                                        : newRoleColor || "#99AAB5"
                                                }}
                                            />
                                        </div>
                                        <p className="text-xs text-primary/60 mt-1 font-ocr">
                                            Enter a hex color (e.g., #FF5733 or #F73)
                                        </p>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsCreateDialogOpen(false)}
                                        className="font-ocr border-primary/30 hover:border-primary text-primary hover:bg-primary/10"
                                        disabled={isCreating}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={createRole}
                                        disabled={!newRoleName.trim() || isCreating || (!newRoleColor && (!newRoleHexColor || !isValidHexColor(newRoleHexColor)))}
                                        className="font-ocr"
                                    >
                                        {isCreating ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            "Create Role"
                                        )}
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
                        <CardContent className="relative z-10">
                            <ScrollArea className="h-[500px]">
                                <div className="space-y-2 pr-4">
                                    {roles.map((role) => {
                                        const Icon = getRoleIcon(role)
                                        const isSelected = selectedRole?.roleId === role.roleId
                                        const isDeletingThis = isDeleting === role.roleId

                                        return (
                                            <div
                                                key={role.roleId}
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
                                                        style={{ backgroundColor: role.color || "#99AAB5" }}
                                                    />
                                                    <Icon className="w-4 h-4 text-primary/60" />
                                                    <span className="font-ocr font-medium text-foreground">{role.name}</span>
                                                    {role.isDefault && (
                                                        <Badge variant="secondary" className="text-xs font-ocr bg-blue-500/10 text-blue-500 border-blue-500/30">
                                                            default
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="text-xs font-ocr bg-primary/10 text-primary border-primary/30">
                                                        {role.memberCount || 0} {(role.memberCount || 0) === 1 ? 'member' : 'members'}
                                                    </Badge>
                                                    {!role.isDefault && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                deleteRole(role.roleId)
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-500 hover:bg-red-500/10"
                                                            disabled={isDeletingThis}
                                                        >
                                                            {isDeletingThis ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-4 h-4" />
                                                            )}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </ScrollArea>
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
                                <ScrollArea className="h-[500px]">
                                    <div className="space-y-4 pr-4">
                                        {selectedRole.isDefault ? (
                                            <div className="space-y-4">
                                                <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                                    <p className="text-sm text-blue-500 font-ocr text-center mb-4">
                                                        The @everyone role permissions cannot be modified, but you can change its color.
                                                        This role is automatically assigned to all server members.
                                                    </p>

                                                    <div className="space-y-4">
                                                        <div>
                                                            <Label className="font-ocr text-primary">Preset Colors</Label>
                                                            <div className="grid grid-cols-5 gap-2 mt-2">
                                                                {roleColors.map((color) => (
                                                                    <button
                                                                        key={color}
                                                                        className={cn(
                                                                            "w-10 h-10 rounded-lg border-2 transition-all duration-200 hover:scale-110",
                                                                            (selectedRole.color || "#99AAB5") === color
                                                                                ? "border-primary ring-2 ring-primary/50 scale-105"
                                                                                : "border-primary/30 hover:border-primary/60"
                                                                        )}
                                                                        style={{ backgroundColor: color }}
                                                                        onClick={() => updateRoleColor(selectedRole, color)}
                                                                        disabled={isUpdating}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <Label className="font-ocr text-primary">Custom Hex Color</Label>
                                                            <div className="flex gap-2 mt-2">
                                                                <div className="flex-1 flex gap-2">
                                                                    <Input
                                                                        value={selectedRoleHexColor}
                                                                        onChange={(e) => setSelectedRoleHexColor(e.target.value)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter' && selectedRoleHexColor.trim()) {
                                                                                handleHexColorUpdate(selectedRole, selectedRoleHexColor)
                                                                            }
                                                                        }}
                                                                        placeholder="#FF5733"
                                                                        className="font-mono text-sm bg-background/80 border-primary/30 focus:border-primary focus:ring-primary/20"
                                                                        disabled={isUpdating}
                                                                    />
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => handleHexColorUpdate(selectedRole, selectedRoleHexColor)}
                                                                        disabled={isUpdating || !selectedRoleHexColor.trim()}
                                                                        className="font-ocr"
                                                                    >
                                                                        Apply
                                                                    </Button>
                                                                </div>
                                                                <div
                                                                    className="w-10 h-10 rounded border-2 border-primary/30"
                                                                    style={{ backgroundColor: isValidHexColor(selectedRoleHexColor) ? formatHexColor(selectedRoleHexColor) : "#99AAB5" }}
                                                                />
                                                            </div>
                                                            <p className="text-xs text-primary/60 mt-1 font-ocr">
                                                                Enter a hex color (e.g., #FF5733 or #F73)
                                                            </p>
                                                        </div>

                                                        {isUpdating && (
                                                            <div className="flex items-center justify-center gap-2 text-primary/60">
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                                <span className="text-sm font-ocr">Updating color...</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-sm font-freecam font-medium text-primary/60 uppercase tracking-wider">
                                                            Default Permissions (Read-Only)
                                                        </h3>
                                                        <Separator className="flex-1" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        {(PermissionDefinitions.filter(perm =>
                                                            PermissionHelpers.hasPermission(selectedRole.permissions || 0, perm.value)
                                                        ) as any).map((permission: any) => (
                                                            <div
                                                                key={permission.id}
                                                                className="flex items-center justify-between p-3 rounded-lg border border-primary/20 bg-background/30 opacity-75"
                                                            >
                                                                <div className="space-y-1 flex-1">
                                                                    <Label className="font-ocr font-medium text-foreground">
                                                                        {permission.name}
                                                                    </Label>
                                                                    <p className="text-sm text-primary/60 font-ocr">
                                                                        {permission.description}
                                                                    </p>
                                                                </div>
                                                                <Switch
                                                                    checked={true}
                                                                    disabled={true}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Color Management Section for Regular Roles */}
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-sm font-freecam font-medium text-primary uppercase tracking-wider">
                                                            Role Color
                                                        </h3>
                                                        <Separator className="flex-1" />
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div>
                                                            <Label className="font-ocr text-primary text-sm">Preset Colors</Label>
                                                            <div className="grid grid-cols-5 gap-2 mt-2">
                                                                {roleColors.map((color) => (
                                                                    <button
                                                                        key={color}
                                                                        className={cn(
                                                                            "w-8 h-8 rounded-lg border-2 transition-all duration-200 hover:scale-110",
                                                                            (selectedRole.color || "#99AAB5") === color
                                                                                ? "border-primary ring-2 ring-primary/50 scale-105"
                                                                                : "border-primary/30 hover:border-primary/60"
                                                                        )}
                                                                        style={{ backgroundColor: color }}
                                                                        onClick={() => updateRoleColor(selectedRole, color)}
                                                                        disabled={isUpdating}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <Label className="font-ocr text-primary text-sm">Custom Hex Color</Label>
                                                            <div className="flex gap-2 mt-2">
                                                                <div className="flex-1 flex gap-2">
                                                                    <Input
                                                                        value={selectedRoleHexColor}
                                                                        onChange={(e) => setSelectedRoleHexColor(e.target.value)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter' && selectedRoleHexColor.trim()) {
                                                                                handleHexColorUpdate(selectedRole, selectedRoleHexColor)
                                                                            }
                                                                        }}
                                                                        placeholder="#FF5733"
                                                                        className="font-mono text-sm bg-background/80 border-primary/30 focus:border-primary focus:ring-primary/20"
                                                                        disabled={isUpdating}
                                                                    />
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => handleHexColorUpdate(selectedRole, selectedRoleHexColor)}
                                                                        disabled={isUpdating || !selectedRoleHexColor.trim()}
                                                                        className="font-ocr"
                                                                    >
                                                                        Apply
                                                                    </Button>
                                                                </div>
                                                                <div
                                                                    className="w-8 h-8 rounded border-2 border-primary/30"
                                                                    style={{ backgroundColor: isValidHexColor(selectedRoleHexColor) ? formatHexColor(selectedRoleHexColor) : (selectedRole.color || "#99AAB5") }}
                                                                />
                                                            </div>
                                                            <p className="text-xs text-primary/60 mt-1 font-ocr">
                                                                Enter a hex color (e.g., #FF5733 or #F73)
                                                            </p>
                                                        </div>

                                                        {isUpdating && (
                                                            <div className="flex items-center justify-center gap-2 text-primary/60">
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                                <span className="text-sm font-ocr">Updating color...</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Permissions Section */}
                                                {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                                                    <div key={category} className="space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="text-sm font-freecam font-medium text-primary uppercase tracking-wider">
                                                                {category} Permissions
                                                            </h3>
                                                            <Separator className="flex-1" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            {permissions.map((permission) => {
                                                                const hasPermission = PermissionHelpers.hasPermission(
                                                                    selectedRole.permissions || 0,
                                                                    permission.value
                                                                )
                                                                const isAdminOverride = PermissionHelpers.hasPermission(
                                                                    selectedRole.permissions || 0,
                                                                    Permissions.ADMINISTRATOR
                                                                ) && permission.value !== Permissions.ADMINISTRATOR

                                                                return (
                                                                    <div
                                                                        key={permission.id}
                                                                        className="flex items-center justify-between p-3 rounded-lg border border-primary/20 bg-background/50"
                                                                    >
                                                                        <div className="space-y-1 flex-1">
                                                                            <div className="flex items-center gap-2">
                                                                                <Label className="font-ocr font-medium text-foreground">
                                                                                    {permission.name}
                                                                                </Label>
                                                                                {isAdminOverride && (
                                                                                    <Badge variant="secondary" className="text-xs font-ocr bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                                                                                        via admin
                                                                                    </Badge>
                                                                                )}
                                                                            </div>
                                                                            <p className="text-sm text-primary/60 font-ocr">
                                                                                {permission.description}
                                                                            </p>
                                                                        </div>
                                                                        <Switch
                                                                            checked={hasPermission || isAdminOverride}
                                                                            disabled={isUpdating || isAdminOverride}
                                                                            onCheckedChange={() => togglePermission(permission.value)}
                                                                        />
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                ))
                                                }
                                            </>
                                        )}
                                    </div>
                                </ScrollArea>
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
