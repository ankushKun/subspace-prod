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
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay
} from '@dnd-kit/core'
import type {
    DragEndEvent,
    DragStartEvent,
    DragOverEvent
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from "@/lib/utils"
import { useSubspace } from "@/hooks/use-subspace"
import { useGlobalState } from "@/hooks/use-global-state"
import { useWallet } from "@/hooks/use-wallet"
import { toast } from "sonner"
import { PermissionDefinitions, PermissionHelpers, Permissions } from "@/lib/permissions"
import { Constants } from "@/lib/constants"
import type { Role } from "@subspace-protocol/sdk"

const roleColors = [
    Constants.DEFAULT_ROLE_COLOR, // Default grey
    "#1ABC9C", // Teal
    "#2ECC71", // Green  
    "#3498DB", // Blue
    "#9B59B6", // Purple
    "#E91E63", // Pink
    "#F1C40F", // Yellow
    "#E67E22", // Orange
    "#E74C3C", // Red
]

// Extended Role interface for UI purposes
interface ExtendedRole extends Role {
    memberCount?: number
    isDefault?: boolean
    orderId?: number
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

    // Role editing state
    const [editedRole, setEditedRole] = useState<Partial<ExtendedRole>>({})
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

    // Drag and drop state
    const [activeId, setActiveId] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [dragOverId, setDragOverId] = useState<string | null>(null)
    const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null)
    const [dragDirection, setDragDirection] = useState<'up' | 'down' | null>(null)
    const [lastSuccessfulReorder, setLastSuccessfulReorder] = useState<string | null>(null)

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 8px minimum distance before drag starts
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    // Modifier to restrict movement to vertical axis only
    const restrictToVerticalAxis = ({ transform }: { transform: { x: number; y: number; scaleX: number; scaleY: number } }) => {
        return {
            ...transform,
            x: 0, // Always keep horizontal position at 0 to prevent horizontal movement
        }
    }

    // Convert server roles to extended roles with member counts
    const roles = useMemo((): ExtendedRole[] => {
        if (!server || !server.roles) return []

        const serverMembers = (server as any)?.members || []

        const result = Object.values(server.roles).map(role => {
            // Count members with this role
            const memberCount = serverMembers.filter((member: any) =>
                member.roles && member.roles.includes(parseInt(role.roleId))
            ).length

            return {
                ...role,
                memberCount,
                isDefault: parseInt(role.roleId) === 1 // roleId 1 is always the default @everyone role
            } as ExtendedRole
        }).sort((a, b) => (b.orderId || b.position || 0) - (a.orderId || a.position || 0)) // Sort by orderId/position descending

        return result
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
        setEditedRole({})
        setHasUnsavedChanges(false)
    }, [activeServerId])

    // Update hex color and initialize edited role when selected role changes
    useEffect(() => {
        if (selectedRole) {
            setSelectedRoleHexColor(selectedRole.color || Constants.DEFAULT_ROLE_COLOR)
            setEditedRole({
                name: selectedRole.name,
                color: selectedRole.color,
                permissions: selectedRole.permissions
            })
            setHasUnsavedChanges(false)
        } else {
            setEditedRole({})
            setHasUnsavedChanges(false)
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

    const updateLocalRoleProperty = (property: keyof ExtendedRole, value: any) => {
        if (!selectedRole) return

        setEditedRole(prev => ({
            ...prev,
            [property]: value
        }))
        setHasUnsavedChanges(true)

        // Update hex color display immediately for color changes
        if (property === 'color') {
            setSelectedRoleHexColor(value)
        }
    }

    const saveRoleChanges = async () => {
        if (!selectedRole || !activeServerId || !canManageRoles || !hasUnsavedChanges) return

        setIsUpdating(true)
        try {
            const success = await subspaceActions.servers.updateRole(activeServerId, {
                roleId: selectedRole.roleId.toString(),
                ...editedRole
            })

            if (success) {
                toast.success(`${editedRole.name || selectedRole.name} updated successfully!`)
                // Update local state to reflect saved changes
                setSelectedRole({ ...selectedRole, ...editedRole })
                setHasUnsavedChanges(false)
            } else {
                toast.error("Failed to update role")
            }
        } catch (error) {
            console.error("Error updating role:", error)
            toast.error("Failed to update role")
        } finally {
            setIsUpdating(false)
        }
    }

    const discardRoleChanges = () => {
        if (!selectedRole) return

        setEditedRole({
            name: selectedRole.name,
            color: selectedRole.color,
            permissions: selectedRole.permissions
        })
        setSelectedRoleHexColor(selectedRole.color || Constants.DEFAULT_ROLE_COLOR)
        setHasUnsavedChanges(false)
    }

    const handleHexColorUpdate = (role: ExtendedRole, hexColor: string) => {
        if (!hexColor.trim()) return

        if (!isValidHexColor(hexColor)) {
            toast.error("Please enter a valid hex color (e.g., #FF5733 or #F73)")
            return
        }

        const formattedColor = formatHexColor(hexColor)
        updateLocalRoleProperty('color', formattedColor)
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

        const currentPermissions = editedRole.permissions ?? selectedRole.permissions ?? 0
        const hasPermission = PermissionHelpers.hasPermission(currentPermissions, permission)

        const newPermissions = hasPermission
            ? PermissionHelpers.removePermission(currentPermissions, permission)
            : PermissionHelpers.addPermission(currentPermissions, permission)

        updateLocalRoleProperty('permissions', newPermissions)
    }

    const getRoleIcon = (role: ExtendedRole) => {
        if (role.isDefault) return Users
        const permissions = role.permissions || 0
        if (PermissionHelpers.hasPermission(permissions, Permissions.ADMINISTRATOR)) return Crown
        if (PermissionHelpers.hasPermission(permissions, Permissions.MANAGE_SERVER)) return Shield
        return Settings2
    }

    // Drag and drop handlers
    const handleDragStart = (event: DragStartEvent) => {
        const dragId = event.active.id as string
        setActiveId(dragId)
        setIsDragging(true)
        setDragOverId(null)
    }

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event

        if (!over) {
            setDragOverId(null)
            setDragDirection(null)
            return
        }

        const activeIdStr = active.id as string
        const overIdStr = over.id as string

        setDragOverId(overIdStr)

        // Calculate drag direction for better visual feedback
        if (activeIdStr.startsWith('role-') && overIdStr.startsWith('role-')) {
            const activeRoleId = activeIdStr.replace('role-', '')
            const overRoleId = overIdStr.replace('role-', '')

            const activeIndex = roles.findIndex(role => role.roleId.toString() === activeRoleId)
            const overIndex = roles.findIndex(role => role.roleId.toString() === overRoleId)

            if (activeIndex !== -1 && overIndex !== -1) {
                setDragDirection(activeIndex > overIndex ? 'up' : 'down')
            }
        }
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        try {
            const { active, over } = event
            setActiveId(null)
            setIsDragging(false)
            setDragOverId(null)
            setDragDirection(null)

            if (!over || active.id === over.id) {
                return
            }

            const activeIdStr = active.id as string
            const overIdStr = over.id as string

            // Handle role reordering
            if (activeIdStr.startsWith('role-') && overIdStr.startsWith('role-')) {
                const activeRoleId = activeIdStr.replace('role-', '')
                const overRoleId = overIdStr.replace('role-', '')

                // Convert string IDs to match the type used in roles array
                const activeIndex = roles.findIndex(role => role.roleId.toString() === activeRoleId)
                const overIndex = roles.findIndex(role => role.roleId.toString() === overRoleId)

                if (activeIndex !== -1 && overIndex !== -1) {
                    const activeRole = roles[activeIndex]
                    const overRole = roles[overIndex]

                    // Calculate the new order position for the moved role
                    // We want to insert the active role at the position of the over role
                    const newOrderId = overRole.orderId || overRole.position || (overIndex + 1)

                    try {
                        // Show visual indicator
                        setUpdatingRoleId(activeRole.roleId.toString())

                        // Use the proper SDK reorderRole method
                        const success = await subspaceActions.servers.reorderRole(
                            activeServerId,
                            activeRole.roleId.toString(),
                            newOrderId
                        )

                        if (success) {
                            toast.success(`${activeRole.name} moved ${dragDirection || 'successfully'}!`, {
                                duration: 2000,
                                style: {
                                    background: 'hsl(var(--primary) / 0.1)',
                                    borderColor: 'hsl(var(--primary) / 0.3)'
                                }
                            })

                            // Show temporary success indicator
                            setLastSuccessfulReorder(activeRole.roleId.toString())
                            setTimeout(() => setLastSuccessfulReorder(null), 2000)
                        } else {
                            throw new Error("Server returned false")
                        }
                    } catch (error) {
                        console.error("Failed to update role position:", error)
                        toast.error("Failed to update role position")
                    } finally {
                        // Clear visual indicator
                        setUpdatingRoleId(null)
                    }
                }
            }
        } catch (error) {
            console.error('ERROR in handleDragEnd:', error)
            toast.error("An error occurred during role reordering")
        } finally {
            // Ensure visual indicator is cleared
            setUpdatingRoleId(null)
        }
    }

    if (!server) {
        return (
            <div className="flex items-center justify-center min-h-[600px] relative">
                {/* Background decoration */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary)/0.03)_0%,transparent_50%)] pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(var(--primary)/0.03)_0%,transparent_50%)] pointer-events-none" />

                <div className="text-center space-y-4 relative z-10">
                    <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    </div>
                    <div>
                        <h3 className="font-freecam text-sm uppercase tracking-wide text-primary">Loading Server</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            Fetching role data...
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    if (!canManageRoles) {
        return (
            <div className="flex items-center justify-center min-h-[600px] relative">
                {/* Background decoration */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(red/0.02)_0%,transparent_50%)] pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(red/0.02)_0%,transparent_50%)] pointer-events-none" />

                <div className="text-center space-y-4 relative z-10">
                    <div className="w-12 h-12 mx-auto bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                        <X className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                        <h3 className="font-freecam text-sm uppercase tracking-wide text-red-500">Access Denied</h3>
                        <p className="text-xs text-red-500/80 mt-1">
                            You don't have permission to manage roles
                        </p>
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
        <div className="p-6 flex flex-col items-center justify-center w-full h-full relative">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary)/0.01)_0%,transparent_50%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(var(--primary)/0.01)_0%,transparent_50%)] pointer-events-none" />

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis]}
            >
                <DragOverlay>
                    {activeId ? (
                        <div className="bg-card border rounded-lg p-4 shadow-lg border-primary/30 opacity-80">
                            {(() => {
                                const roleId = activeId.replace('role-', '')
                                const role = roles.find(r => r.roleId === roleId)
                                const Icon = role ? getRoleIcon(role) : Settings2

                                return (
                                    <div className="flex items-center gap-4">
                                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                                        <div
                                            className="w-6 h-6 rounded-full border border-white/20"
                                            style={{ backgroundColor: role?.color || Constants.DEFAULT_ROLE_COLOR }}
                                        />
                                        <div className="flex items-center gap-2">
                                            <Icon className="w-4 h-4 text-primary/50" />
                                            <span className="font-semibold text-foreground text-sm">
                                                {role?.name || 'Unknown Role'}
                                            </span>
                                            {role?.isDefault && (
                                                <Badge variant="outline" className="text-xs">
                                                    Default
                                                </Badge>
                                            )}
                                        </div>
                                        <Badge variant="secondary" className="text-xs">
                                            {role?.memberCount || 0} members
                                        </Badge>
                                    </div>
                                )
                            })()}
                        </div>
                    ) : null}
                </DragOverlay>

                <div className="relative z-10 flex flex-col h-full space-y-6 max-h-[95vh] w-full ">
                    {/* Header */}
                    <Card className="border-primary/10 shadow-md backdrop-blur-sm bg-card/30 relative z-10">
                        {/* Card glow effect */}
                        <div className="absolute inset-0 from-primary/2 via-transparent to-primary/2 rounded-lg pointer-events-none" />

                        <CardHeader className="pb-4 relative z-10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="font-freecam text-sm uppercase tracking-wide text-primary/70 flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-primary/40" />
                                        Role Management
                                    </CardTitle>
                                    <p className="text-xs text-primary/50 mt-1">
                                        {roles.length} roles • Hover and drag <GripVertical className="w-3 h-3 inline mx-1" /> to reorder • Members use highest role color
                                    </p>
                                </div>
                                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-xs border-primary/20 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                                        >
                                            <Plus className="w-3 h-3 mr-1" />
                                            New Role
                                        </Button>
                                    </DialogTrigger>
                                </Dialog>
                            </div>
                        </CardHeader>
                    </Card>

                    {/* Create Role Dialog */}
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogContent className="border-primary/30 bg-card/95 backdrop-blur-sm">
                            <DialogHeader>
                                <DialogTitle className="font-freecam text-sm uppercase tracking-wide text-primary">
                                    Create Role
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="role-name" className="text-xs text-primary/80">Role Name</Label>
                                    <Input
                                        id="role-name"
                                        value={newRoleName}
                                        onChange={(e) => setNewRoleName(e.target.value)}
                                        placeholder="Enter role name"
                                        className="text-sm mt-1 border-primary/30 focus:border-primary/50 bg-background/50"
                                        maxLength={50}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && newRoleName.trim()) {
                                                createRole()
                                            }
                                        }}
                                        disabled={isCreating}
                                    />
                                    <p className="text-xs text-primary/60 mt-1">
                                        {newRoleName.length}/50 characters
                                    </p>
                                </div>
                                <div className="space-y-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                                    <div>
                                        <Label className="text-xs text-primary/80">Role Color</Label>
                                        <div className="flex items-center gap-3 mt-2">
                                            {/* Default Color */}
                                            <div className="flex flex-col items-center gap-1">
                                                <button
                                                    className={cn(
                                                        "w-10 h-10 rounded-lg border-2 transition-all duration-200 hover:scale-110 shadow-sm",
                                                        newRoleColor === roleColors[0] && !newRoleHexColor
                                                            ? "border-primary ring-2 ring-primary/50 scale-105"
                                                            : "border-primary/30 hover:border-primary/60"
                                                    )}
                                                    style={{ backgroundColor: roleColors[0] }}
                                                    onClick={() => {
                                                        setNewRoleColor(roleColors[0])
                                                        setNewRoleHexColor("") // Clear hex when preset is selected
                                                    }}
                                                    disabled={isCreating}
                                                />
                                                <span className="text-xs text-primary/60">Default</span>
                                            </div>

                                            {/* Custom Color */}
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="relative">
                                                    <button
                                                        className={cn(
                                                            "w-10 h-10 rounded-lg border-2 transition-all duration-200 hover:scale-110 shadow-sm flex items-center justify-center",
                                                            newRoleHexColor && isValidHexColor(newRoleHexColor)
                                                                ? "border-primary ring-2 ring-primary/50 scale-105"
                                                                : "border-primary/30 hover:border-primary/60 border-dashed"
                                                        )}
                                                        style={{
                                                            backgroundColor: newRoleHexColor && isValidHexColor(newRoleHexColor)
                                                                ? formatHexColor(newRoleHexColor)
                                                                : "transparent"
                                                        }}
                                                        onClick={() => {
                                                            // Focus the hex input when clicked
                                                            const hexInput = document.getElementById('new-role-hex-input') as HTMLInputElement
                                                            if (hexInput) hexInput.focus()
                                                        }}
                                                        disabled={isCreating}
                                                    >
                                                        {!newRoleHexColor || !isValidHexColor(newRoleHexColor) ? (
                                                            <div className="w-6 h-6 bg-gradient-to-br from-red-400 via-yellow-400 via-green-400 via-blue-400 to-purple-400 rounded opacity-60" />
                                                        ) : null}
                                                    </button>
                                                </div>
                                                <span className="text-xs text-primary/60">Custom</span>
                                            </div>

                                            {/* Color Patches Grid */}
                                            <div className="flex-1">
                                                <div className="grid grid-cols-4 gap-2">
                                                    {roleColors.slice(1).map((color) => (
                                                        <button
                                                            key={color}
                                                            className={cn(
                                                                "w-8 h-8 rounded-lg border-2 transition-all duration-200 hover:scale-110 shadow-sm",
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
                                        </div>
                                    </div>

                                    {/* Custom Hex Input */}
                                    <div>
                                        <Label className="text-xs text-primary/80">Custom Hex Color</Label>
                                        <div className="flex gap-2 mt-2">
                                            <Input
                                                id="new-role-hex-input"
                                                value={newRoleHexColor}
                                                onChange={(e) => {
                                                    setNewRoleHexColor(e.target.value)
                                                    if (e.target.value) {
                                                        setNewRoleColor("") // Clear preset when hex is entered
                                                    }
                                                }}
                                                placeholder="#FF5733"
                                                className="font-mono text-sm border-primary/30 focus:border-primary/50 bg-background/50"
                                                disabled={isCreating}
                                            />
                                            <div
                                                className="w-8 h-8 rounded border-2 border-primary/30 flex-shrink-0 shadow-sm"
                                                style={{
                                                    backgroundColor: newRoleHexColor && isValidHexColor(newRoleHexColor)
                                                        ? formatHexColor(newRoleHexColor)
                                                        : newRoleColor || Constants.DEFAULT_ROLE_COLOR
                                                }}
                                            />
                                        </div>
                                        <p className="text-xs text-primary/60 mt-1">
                                            Enter a hex color (e.g., #FF5733 or #F73)
                                        </p>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setIsCreateDialogOpen(false)
                                            setNewRoleName("")
                                            setNewRoleColor(roleColors[0])
                                            setNewRoleHexColor("")
                                        }}
                                        className="text-xs border-primary/30 hover:border-primary/50"
                                        disabled={isCreating}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={createRole}
                                        disabled={!newRoleName.trim() || isCreating || (!newRoleColor && (!newRoleHexColor || !isValidHexColor(newRoleHexColor)))}
                                        className="text-xs bg-primary hover:bg-primary/90 text-black"
                                    >
                                        {isCreating ? (
                                            <>
                                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
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

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
                        {/* Role List */}
                        <Card className="border-primary/10 shadow-md backdrop-blur-sm bg-card/30 relative z-10 flex flex-col overflow-scroll">
                            {/* Card glow effect */}
                            <div className="absolute inset-0 from-primary/2 via-transparent to-primary/2 rounded-lg pointer-events-none" />

                            <CardHeader className="relative z-10 pb-4 flex-shrink-0">
                                <CardTitle className="font-freecam text-sm uppercase tracking-wide text-primary/70 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-primary/40" />
                                    Server Roles
                                </CardTitle>
                                <p className="text-xs text-primary/50 mt-1">
                                    {roles.length} total roles • Click to configure
                                </p>
                            </CardHeader>
                            <CardContent className="relative z-10 flex-1 min-h-0 p-0">
                                <SortableContext
                                    items={roles.map(role => `role-${role.roleId}`)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="space-y-2 py-1 px-8">
                                        {roles.map((role) => (
                                            <SortableRole
                                                key={role.roleId}
                                                role={role}
                                                isSelected={selectedRole?.roleId === role.roleId}
                                                isDeletingThis={isDeleting === role.roleId}
                                                isUpdating={updatingRoleId === role.roleId.toString()}
                                                isRecentlySuccessful={lastSuccessfulReorder === role.roleId.toString()}
                                                onSelect={setSelectedRole}
                                                onDelete={deleteRole}
                                                getRoleIcon={getRoleIcon}
                                                dragOverId={dragOverId}
                                                dragDirection={dragDirection}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </CardContent>
                        </Card>

                        {/* Role Permissions */}
                        <Card className="border-primary/10 shadow-md backdrop-blur-sm bg-card/30 relative z-10 flex flex-col overflow-scroll">
                            {/* Card glow effect */}
                            <div className="absolute inset-0 from-primary/2 via-transparent to-primary/2 rounded-lg pointer-events-none" />

                            <CardHeader className="relative z-10 pb-4 flex-shrink-0">
                                <CardTitle className="font-freecam text-sm uppercase tracking-wide text-primary/70 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-primary/40" />
                                    {selectedRole ? `${selectedRole.name} Settings` : "Role Configuration"}
                                </CardTitle>
                                <p className="text-xs text-primary/50 mt-1">
                                    {selectedRole ? "Permissions and appearance settings" : "Select a role to configure"}
                                </p>
                            </CardHeader>
                            <CardContent className="relative z-10 flex-1 min-h-0">
                                {selectedRole ? (
                                    <div className="space-y-4 pb-4">
                                        {/* Role Name and Save/Discard Buttons */}
                                        {!selectedRole.isDefault && (
                                            <div className="space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-xs font-freecam font-medium text-primary uppercase tracking-wider">
                                                        Role Settings
                                                    </h3>
                                                    {hasUnsavedChanges && (
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={discardRoleChanges}
                                                                disabled={isUpdating}
                                                                className="text-xs h-7"
                                                            >
                                                                Discard
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                onClick={saveRoleChanges}
                                                                disabled={isUpdating}
                                                                className="text-xs h-7 bg-primary hover:bg-primary/90 text-black"
                                                            >
                                                                {isUpdating ? (
                                                                    <>
                                                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                                        Saving...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Save className="w-3 h-3 mr-1" />
                                                                        Save Changes
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-3">
                                                    <div>
                                                        <Label className="text-xs text-primary/80">Role Name</Label>
                                                        <Input
                                                            value={editedRole.name ?? selectedRole.name}
                                                            onChange={(e) => updateLocalRoleProperty('name', e.target.value)}
                                                            placeholder="Enter role name"
                                                            className="text-sm mt-1 border-primary/30 focus:border-primary/50 bg-background/50"
                                                            maxLength={50}
                                                            disabled={isUpdating}
                                                        />
                                                        <p className="text-xs text-primary/60 mt-1">
                                                            {(editedRole.name ?? selectedRole.name).length}/50 characters
                                                        </p>
                                                    </div>
                                                </div>

                                                {hasUnsavedChanges && (
                                                    <div className="text-xs text-amber-600 bg-amber-50/10 border border-amber-200/50 rounded p-2 flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                                        You have unsaved changes
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {selectedRole.isDefault ? (
                                            <div className="space-y-4">
                                                <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                                    <p className="text-sm text-blue-500 text-center mb-4">
                                                        The @everyone role permissions cannot be modified, but you can change its color.
                                                        This role is automatically assigned to all server members.
                                                    </p>

                                                    <div className="space-y-4">
                                                        <div>
                                                            <Label className="text-primary">Role Color</Label>
                                                            <div className="flex items-center gap-3 mt-2">
                                                                {/* Default Color */}
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <button
                                                                        className={cn(
                                                                            "w-10 h-10 rounded-lg border-2 transition-all duration-200 hover:scale-110 shadow-sm",
                                                                            (editedRole.color ?? selectedRole.color ?? Constants.DEFAULT_ROLE_COLOR) === roleColors[0]
                                                                                ? "border-primary ring-2 ring-primary/50 scale-105"
                                                                                : "border-primary/30 hover:border-primary/60"
                                                                        )}
                                                                        style={{ backgroundColor: roleColors[0] }}
                                                                        onClick={() => updateLocalRoleProperty('color', roleColors[0])}
                                                                        disabled={isUpdating}
                                                                    />
                                                                    <span className="text-xs text-primary/60">Default</span>
                                                                </div>

                                                                {/* Custom Color */}
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <div className="relative">
                                                                        <button
                                                                            className={cn(
                                                                                "w-10 h-10 rounded-lg border-2 transition-all duration-200 hover:scale-110 shadow-sm flex items-center justify-center",
                                                                                selectedRoleHexColor && isValidHexColor(selectedRoleHexColor) && !roleColors.includes(editedRole.color ?? selectedRole.color ?? Constants.DEFAULT_ROLE_COLOR)
                                                                                    ? "border-primary ring-2 ring-primary/50 scale-105"
                                                                                    : "border-primary/30 hover:border-primary/60 border-dashed"
                                                                            )}
                                                                            style={{
                                                                                backgroundColor: selectedRoleHexColor && isValidHexColor(selectedRoleHexColor) && !roleColors.includes(editedRole.color ?? selectedRole.color ?? Constants.DEFAULT_ROLE_COLOR)
                                                                                    ? formatHexColor(selectedRoleHexColor)
                                                                                    : "transparent"
                                                                            }}
                                                                            onClick={() => {
                                                                                // Focus the hex input when clicked
                                                                                const hexInput = document.getElementById('everyone-role-hex-input') as HTMLInputElement
                                                                                if (hexInput) hexInput.focus()
                                                                            }}
                                                                            disabled={isUpdating}
                                                                        >
                                                                            {!selectedRoleHexColor || !isValidHexColor(selectedRoleHexColor) || roleColors.includes(editedRole.color ?? selectedRole.color ?? Constants.DEFAULT_ROLE_COLOR) ? (
                                                                                <div className="w-6 h-6 bg-gradient-to-br from-red-400 via-yellow-400 via-green-400 via-blue-400 to-purple-400 rounded opacity-60" />
                                                                            ) : null}
                                                                        </button>
                                                                    </div>
                                                                    <span className="text-xs text-primary/60">Custom</span>
                                                                </div>

                                                                {/* Color Patches Grid */}
                                                                <div className="flex-1">
                                                                    <div className="grid grid-cols-4 gap-2">
                                                                        {roleColors.slice(1).map((color) => (
                                                                            <button
                                                                                key={color}
                                                                                className={cn(
                                                                                    "w-8 h-8 rounded-lg border-2 transition-all duration-200 hover:scale-110",
                                                                                    (editedRole.color ?? selectedRole.color ?? Constants.DEFAULT_ROLE_COLOR) === color
                                                                                        ? "border-primary ring-2 ring-primary/50 scale-105"
                                                                                        : "border-primary/30 hover:border-primary/60"
                                                                                )}
                                                                                style={{ backgroundColor: color }}
                                                                                onClick={() => updateLocalRoleProperty('color', color)}
                                                                                disabled={isUpdating}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <Label className="font-ocr text-primary">Custom Hex Color</Label>
                                                            <div className="flex gap-2 mt-2">
                                                                <div className="flex-1 flex gap-2">
                                                                    <Input
                                                                        id="everyone-role-hex-input"
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
                                                                    style={{ backgroundColor: isValidHexColor(selectedRoleHexColor) ? formatHexColor(selectedRoleHexColor) : (editedRole.color ?? selectedRole.color ?? Constants.DEFAULT_ROLE_COLOR) }}
                                                                />
                                                            </div>
                                                            <p className="text-xs text-primary/60 mt-1 font-ocr">
                                                                Enter a hex color (e.g., #FF5733 or #F73)
                                                            </p>
                                                        </div>

                                                        {/* Save/Discard buttons for @everyone role */}
                                                        {hasUnsavedChanges && (
                                                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-primary/20">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={discardRoleChanges}
                                                                    disabled={isUpdating}
                                                                    className="text-xs h-7"
                                                                >
                                                                    Discard
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={saveRoleChanges}
                                                                    disabled={isUpdating}
                                                                    className="text-xs h-7 bg-primary hover:bg-primary/90 text-black"
                                                                >
                                                                    {isUpdating ? (
                                                                        <>
                                                                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                                            Saving...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Save className="w-3 h-3 mr-1" />
                                                                            Save Changes
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        )}

                                                        {hasUnsavedChanges && (
                                                            <div className="text-xs text-amber-600 bg-amber-50/10 border border-amber-200/50 rounded p-2 flex items-center gap-2">
                                                                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                                                You have unsaved changes
                                                            </div>
                                                        )}

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
                                                        <h3 className="text-xs font-freecam font-medium text-primary/60 uppercase tracking-wider">
                                                            Default Permissions (Read-Only)
                                                        </h3>
                                                        <Separator className="flex-1 bg-primary/20" />
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
                                                        <h3 className="text-xs font-freecam font-medium text-primary uppercase tracking-wider">
                                                            Role Color
                                                        </h3>
                                                        <Separator className="flex-1 bg-primary/20" />
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div>
                                                            <Label className="font-ocr text-primary text-sm">Role Color</Label>
                                                            <div className="flex items-center gap-3 mt-2">
                                                                {/* Default Color */}
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <button
                                                                        className={cn(
                                                                            "w-10 h-10 rounded-lg border-2 transition-all duration-200 hover:scale-110 shadow-sm",
                                                                            (editedRole.color ?? selectedRole.color ?? Constants.DEFAULT_ROLE_COLOR) === roleColors[0]
                                                                                ? "border-primary ring-2 ring-primary/50 scale-105"
                                                                                : "border-primary/30 hover:border-primary/60"
                                                                        )}
                                                                        style={{ backgroundColor: roleColors[0] }}
                                                                        onClick={() => updateLocalRoleProperty('color', roleColors[0])}
                                                                        disabled={isUpdating}
                                                                    />
                                                                    <span className="text-xs text-primary/60">Default</span>
                                                                </div>

                                                                {/* Custom Color */}
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <div className="relative">
                                                                        <button
                                                                            className={cn(
                                                                                "w-10 h-10 rounded-lg border-2 transition-all duration-200 hover:scale-110 shadow-sm flex items-center justify-center",
                                                                                selectedRoleHexColor && isValidHexColor(selectedRoleHexColor) && !roleColors.includes(editedRole.color ?? selectedRole.color ?? Constants.DEFAULT_ROLE_COLOR)
                                                                                    ? "border-primary ring-2 ring-primary/50 scale-105"
                                                                                    : "border-primary/30 hover:border-primary/60 border-dashed"
                                                                            )}
                                                                            style={{
                                                                                backgroundColor: selectedRoleHexColor && isValidHexColor(selectedRoleHexColor) && !roleColors.includes(editedRole.color ?? selectedRole.color ?? Constants.DEFAULT_ROLE_COLOR)
                                                                                    ? formatHexColor(selectedRoleHexColor)
                                                                                    : "transparent"
                                                                            }}
                                                                            onClick={() => {
                                                                                // Focus the hex input when clicked
                                                                                const hexInput = document.getElementById('regular-role-hex-input') as HTMLInputElement
                                                                                if (hexInput) hexInput.focus()
                                                                            }}
                                                                            disabled={isUpdating}
                                                                        >
                                                                            {!selectedRoleHexColor || !isValidHexColor(selectedRoleHexColor) || roleColors.includes(editedRole.color ?? selectedRole.color ?? Constants.DEFAULT_ROLE_COLOR) ? (
                                                                                <div className="w-6 h-6 bg-gradient-to-br from-red-400 via-yellow-400 via-green-400 via-blue-400 to-purple-400 rounded opacity-60" />
                                                                            ) : null}
                                                                        </button>
                                                                    </div>
                                                                    <span className="text-xs text-primary/60">Custom</span>
                                                                </div>

                                                                {/* Color Patches Grid */}
                                                                <div className="flex-1">
                                                                    <div className="grid grid-cols-4 gap-2">
                                                                        {roleColors.slice(1).map((color) => (
                                                                            <button
                                                                                key={color}
                                                                                className={cn(
                                                                                    "w-8 h-8 rounded-lg border-2 transition-all duration-200 hover:scale-110 shadow-sm",
                                                                                    (editedRole.color ?? selectedRole.color ?? Constants.DEFAULT_ROLE_COLOR) === color
                                                                                        ? "border-primary ring-2 ring-primary/50 scale-105"
                                                                                        : "border-primary/30 hover:border-primary/60"
                                                                                )}
                                                                                style={{ backgroundColor: color }}
                                                                                onClick={() => updateLocalRoleProperty('color', color)}
                                                                                disabled={isUpdating}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <Label className="font-ocr text-primary text-sm">Custom Hex Color</Label>
                                                            <div className="flex gap-2 mt-2">
                                                                <div className="flex-1 flex gap-2">
                                                                    <Input
                                                                        id="regular-role-hex-input"
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
                                                                    style={{ backgroundColor: isValidHexColor(selectedRoleHexColor) ? formatHexColor(selectedRoleHexColor) : (editedRole.color ?? selectedRole.color ?? Constants.DEFAULT_ROLE_COLOR) }}
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
                                                            <h3 className="text-xs font-freecam font-medium text-primary uppercase tracking-wider">
                                                                {category} Permissions
                                                            </h3>
                                                            <Separator className="flex-1 bg-primary/20" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            {permissions.map((permission) => {
                                                                const currentPermissions = editedRole.permissions ?? selectedRole.permissions ?? 0
                                                                const hasPermission = PermissionHelpers.hasPermission(
                                                                    currentPermissions,
                                                                    permission.value
                                                                )
                                                                const isAdminOverride = PermissionHelpers.hasPermission(
                                                                    currentPermissions,
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
                                ) : (
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="text-center space-y-3">
                                            <Settings className="w-8 h-8 mx-auto text-primary/30" />
                                            <div>
                                                <h4 className="font-freecam text-xs uppercase tracking-wide text-primary/60">
                                                    No Role Selected
                                                </h4>
                                                <p className="text-xs text-primary/40 font-ocr mt-1">
                                                    Click a role to configure permissions
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </DndContext>
        </div>
    )
}

// Sortable Role Component
function SortableRole({
    role,
    isSelected,
    isDeletingThis,
    isUpdating,
    isRecentlySuccessful,
    onSelect,
    onDelete,
    getRoleIcon,
    dragOverId,
    dragDirection
}: {
    role: ExtendedRole
    isSelected: boolean
    isDeletingThis: boolean
    isUpdating: boolean
    isRecentlySuccessful: boolean
    onSelect: (role: ExtendedRole) => void
    onDelete: (roleId: string) => void
    getRoleIcon: (role: ExtendedRole) => React.ComponentType<any>
    dragOverId?: string | null
    dragDirection?: 'up' | 'down' | null
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: `role-${role.roleId}` })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? transition : 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isDragging ? 0.5 : isUpdating ? 0.7 : 1,
    }

    const Icon = getRoleIcon(role)
    const isDraggedOver = dragOverId === `role-${role.roleId}`
    const isDropZone = isDraggedOver && !isDragging

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex items-center relative justify-between p-4 rounded-lg border cursor-pointer transition-all duration-200 group hover:shadow-sm",
                isUpdating
                    ? "border-blue-400/50 bg-blue-500/5"
                    : isRecentlySuccessful
                        ? "border-green-400/50 bg-green-500/5"
                        : isSelected
                            ? "border-primary/40 bg-primary/5 shadow-sm"
                            : isDropZone
                                ? "border-primary/30 bg-primary/5"
                                : "border-border hover:border-primary/30 hover:bg-accent/30"
            )}
            onClick={() => onSelect(role)}
        >
            {/* Drop zone indicator */}
            {isDropZone && (
                <div className={cn(
                    "absolute left-4 right-4 h-0.5 bg-primary transition-all duration-200",
                    dragDirection === 'up' ? 'top-0' : 'bottom-0'
                )} />
            )}

            <div className="flex items-center gap-4">
                <div
                    {...attributes}
                    {...listeners}
                    className={cn(
                        "cursor-grab active:cursor-grabbing transition-opacity duration-200 flex items-center justify-center w-6 h-6 rounded",
                        isUpdating || isRecentlySuccessful
                            ? "opacity-60"
                            : "opacity-0 group-hover:opacity-100"
                    )}
                    onClick={(e) => e.stopPropagation()}
                >
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                </div>

                {/* Role Color Indicator */}
                <div className="relative">
                    <div
                        className="w-6 h-6 rounded-full border border-white/20"
                        style={{ backgroundColor: role.color || Constants.DEFAULT_ROLE_COLOR }}
                    />
                    {role.isDefault && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border border-background flex items-center justify-center">
                            <div className="w-1 h-1 bg-white rounded-full" />
                        </div>
                    )}
                </div>

                {/* Role Info Section */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-primary/50" />
                        <span className="font-semibold text-foreground text-sm">{role.name}</span>
                        {isUpdating && (
                            <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                        )}
                        {isRecentlySuccessful && !isUpdating && (
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                        )}
                        {role.isDefault && (
                            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500/60 border-blue-500/20 px-2 py-0.5">
                                Default
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Member Count Badge */}
                <Badge variant="secondary" className="text-xs">
                    {role.memberCount || 0} {(role.memberCount || 0) === 1 ? 'member' : 'members'}
                </Badge>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
                {/* Delete Button */}
                {!role.isDefault && (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                            e.stopPropagation()
                            onDelete(role.roleId)
                        }}
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 text-red-500/50 hover:text-red-500 hover:scale-110 transition-all duration-200 rounded-lg"
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
}
