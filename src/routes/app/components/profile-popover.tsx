import { useSubspace } from "@/hooks/use-subspace"
import { useWallet } from "@/hooks/use-wallet"
import { useGlobalState } from "@/hooks/use-global-state"
import { cn, shortenAddress } from "@/lib/utils"
import { PermissionHelpers, Permissions } from "@/lib/permissions"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Check, Copy, Shield, Loader2, Plus, X, Pencil, UserPlus, UserCheck, UserX, Clock, Save, ChevronDown, ChevronUp } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import alien from "@/assets/subspace/alien-black.svg"
import { Constants } from "@/lib/constants"
import ProfileBadge from "@/components/profile-badge"

const MAX_VISIBLE_BADGES = 10

export default function ProfilePopover({
    userId,
    side = "bottom",
    align = "center",
    children
}: {
    userId: string
    side?: "top" | "left" | "bottom" | "right"
    align?: "start" | "center" | "end"
    children: React.ReactNode
}) {
    const { address } = useWallet()
    const { activeServerId } = useGlobalState()
    const { profiles, servers, actions, subspace } = useSubspace()

    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [rolePopoverOpen, setRolePopoverOpen] = useState(false)
    const [assigningRole, setAssigningRole] = useState(false)
    const [removingRoles, setRemovingRoles] = useState<string[]>([])

    // Nickname editing state
    const [isEditingNickname, setIsEditingNickname] = useState(false)
    const [editedNickname, setEditedNickname] = useState("")
    const [isSavingNickname, setIsSavingNickname] = useState(false)

    // Badge expansion state
    const [showAllBadges, setShowAllBadges] = useState(false)

    const server = activeServerId ? servers[activeServerId] : null
    const profile = profiles[userId]
    const isCurrentUser = address === userId

    // Get member info from server
    const member = server?.members && Array.isArray(server.members)
        ? server.members.find((m: any) => m.userId === userId)
        : server?.members?.[userId]
    const nickname = member?.nickname

    // Get display name following priority order
    const displayName = nickname || profile?.primaryName || shortenAddress(userId)

    // Create badges array based on user profile
    const allBadges = useMemo(() => {
        const badges = []

        // Add ArNS badge if user has primary name
        if (profile?.primaryName) {
            badges.push({
                logo: Constants.Icons.ArnsLogo,
                hoverText: "ArNS",
                link: "https://arns.ar.io"
            })
        }

        // Add Wander Tier badge
        if (profile?.wndrTier) {
            badges.push({
                logo: Constants.WanderTiers[profile.wndrTier.tier]?.Icon,
                hoverText: `${Constants.WanderTiers[profile.wndrTier.tier]?.Label} Tier`,
                link: "https://www.wander.app/wndr"
            })
        }

        return badges
    }, [profile])

    const visibleBadges = showAllBadges ? allBadges : allBadges.slice(0, MAX_VISIBLE_BADGES)
    const hasMoreBadges = allBadges.length > MAX_VISIBLE_BADGES

    // Initialize nickname editing when starting to edit
    const handleStartEditingNickname = () => {
        setEditedNickname(nickname || "")
        setIsEditingNickname(true)
    }

    // Save nickname changes
    const handleSaveNickname = async () => {
        if (!activeServerId || !address) return

        setIsSavingNickname(true)
        try {
            const trimmedNickname = editedNickname.trim()
            const success = await actions.servers.updateMember(activeServerId, {
                userId: address,
                nickname: trimmedNickname
            })

            if (success) {
                const message = trimmedNickname === "" ? "Nickname cleared successfully" : "Nickname updated successfully"
                toast.success(message)
                setIsEditingNickname(false)

                // Refresh member data to show the updated nickname
                // await actions.servers.refreshMembers(activeServerId)
            } else {
                toast.error("Failed to update nickname")
            }
        } catch (error) {
            console.error("Error updating nickname:", error)
            toast.error("Failed to update nickname")
        } finally {
            setIsSavingNickname(false)
        }
    }

    // Cancel nickname editing
    const handleCancelNicknameEdit = () => {
        setEditedNickname("")
        setIsEditingNickname(false)
    }

    // Handle Enter key to save, Escape key to cancel
    const handleNicknameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !isSavingNickname) {
            handleSaveNickname()
        } else if (e.key === "Escape") {
            handleCancelNicknameEdit()
        }
    }

    // Check if current user can manage roles
    const canManageRoles = useMemo(() => {
        if (!server || !address) return false

        // Server owner can always manage roles
        if (server.ownerId === address) return true

        // Check if user has appropriate permissions
        const serverMembers = (server as any)?.members || []
        const currentMember = serverMembers.find((m: any) => m.userId === address)

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
    }, [server, address, (server as any)?.members])

    // Check if current user can manage this specific user's roles
    const canManageThisUserRoles = useMemo(() => {
        // If viewing own profile, can only modify if has permissions or is owner
        if (isCurrentUser) {
            return canManageRoles
        }

        // If viewing another user's profile, need permissions and target can't be owner
        if (!canManageRoles) return false

        // Can't modify server owner's roles
        if (server?.ownerId === userId) return false

        return true
    }, [canManageRoles, isCurrentUser, server?.ownerId, userId])

    // Get user's roles from the server
    const getUserRoles = () => {
        if (!server || !member || !member.roles || !Array.isArray(member.roles)) {
            return []
        }

        if (!server.roles) {
            return []
        }

        // Filter server roles to get only the ones assigned to this user (match server-roles.tsx logic)
        const userRoles = Object.values(server.roles).filter((role: any) => member.roles.includes(role.roleId))
            .sort((a: any, b: any) => (b.orderId || b.position || 0) - (a.orderId || a.position || 0)) // Sort by orderId/position descending like server-roles.tsx

        return userRoles
    }

    // Get available roles for assignment
    const getAvailableRoles = () => {
        if (!server || !server.roles || !member || !address) {
            return []
        }

        const userRoleIds = member.roles || []
        return Object.values(server.roles)
            .filter((role: any) => {
                // User doesn't have this role
                if (userRoleIds.includes(role.roleId.toString())) {
                    return false
                }
                // For now, allow all role assignments - permission checking can be added later
                return true
            })
            .sort((a: any, b: any) => (b.orderId || b.position || 0) - (a.orderId || a.position || 0))
    }

    const userRoles = getUserRoles()
    const availableRoles = getAvailableRoles()

    // Handle role assignment
    const handleAssignRole = async (roleId: string) => {
        if (!server || !activeServerId) {
            toast.error("Server not found")
            return
        }

        if (!canManageThisUserRoles) {
            toast.error("You don't have permission to manage this user's roles")
            return
        }

        setAssigningRole(true)
        try {
            // Use the dedicated assignRole method for proper role management
            const success = await actions.servers.assignRole(activeServerId, {
                userId: userId,
                roleId: roleId
            })

            if (success) {
                const roleName = server.roles?.[roleId]?.name || "Unknown Role"
                toast.success(`Successfully assigned ${roleName} role`)
                setRolePopoverOpen(false)

                // Refresh member data to get updated roles
                // await actions.servers.refreshMembers(activeServerId)

                // Also fetch specific member data to ensure we have the latest info
                try {
                    await actions.servers.getMember(activeServerId, userId)
                } catch (error) {
                    console.warn('Failed to refresh specific member data after role assignment:', error)
                }
            } else {
                toast.error("Failed to assign role")
            }
        } catch (error) {
            console.error("Error assigning role:", error)
            toast.error("Failed to assign role")
        } finally {
            setAssigningRole(false)
        }
    }

    // Handle role removal
    const handleRemoveRole = async (roleId: string) => {
        if (!server || !activeServerId) {
            toast.error("Server not found")
            return
        }

        if (!canManageThisUserRoles) {
            toast.error("You don't have permission to manage this user's roles")
            return
        }

        setRemovingRoles(prev => [...prev, roleId])
        try {
            // Use the dedicated unassignRole method for proper role management
            const success = await actions.servers.unassignRole(activeServerId, {
                userId: userId,
                roleId: roleId
            })

            if (success) {
                const roleName = server.roles?.[roleId]?.name || "Unknown Role"
                toast.success(`Successfully removed ${roleName} role`)

                // Refresh member data to get updated roles
                // await actions.servers.refreshMembers(activeServerId)

                // Also fetch specific member data to ensure we have the latest info
                try {
                    await actions.servers.getMember(activeServerId, userId)
                } catch (error) {
                    console.warn('Failed to refresh specific member data after role removal:', error)
                }
            } else {
                toast.error("Failed to remove role")
            }
        } catch (error) {
            console.error("Error removing role:", error)
            toast.error("Failed to remove role")
        } finally {
            setRemovingRoles(prev => prev.filter(id => id !== roleId))
        }
    }

    // Fetch latest data when popover opens
    const handleOpenChange = useCallback(async (open: boolean) => {
        setIsOpen(open)

        if (open && !isRefreshing) {
            setIsRefreshing(true)

            try {
                // Fetch latest profile data (general user profile including primary name)
                await actions.profile.get(userId)

                // Fetch latest server data if we're in a server
                if (activeServerId) {
                    // Refresh all server members to get latest data
                    // await actions.servers.refreshMembers(activeServerId)

                    // Also get specific member data for this user in this server
                    try {
                        const memberData = await actions.servers.getMember(activeServerId, userId)
                        // Member data includes server-specific info like nickname, roles, etc.
                    } catch (memberError) {
                        console.warn('Failed to fetch specific member data:', memberError)
                        // Don't fail the whole operation if member data fetch fails
                    }
                }
            } catch (error) {
                console.error('Failed to refresh user and server data:', error)
            } finally {
                setIsRefreshing(false)
            }
        }

        // Reset nickname editing state when popover closes
        if (!open) {
            setIsEditingNickname(false)
            setEditedNickname("")
        }
    }, [userId, activeServerId, actions, isRefreshing])

    return (
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                {children}
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 shadow-md bg-background border border-primary/30 font-ocr" side={side} align={align}>
                {profile ? (
                    <div className="relative overflow-hidden rounded-md bg-gradient-to-b from-primary/10 via-primary/0 to-primary/0">
                        <div className="absolute top-2 right-2">
                            <div className="w-6 h-6 rounded-full bg-background/20 backdrop-blur-sm flex items-center justify-center">
                                {isRefreshing ? (
                                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                ) : null}
                            </div>
                        </div>
                        {/* Header with gradient background */}
                        {/* <div className="h-22 bg-gradient-to-br from-primary/20 via-primary/5 to-primary/0 relative">
                            <div className="absolute inset-0 bg-background/10"></div>
                        </div> */}

                        {/* Profile content */}
                        <div className="px-4 pb-4 mt-3.5 relative">
                            {/* Avatar with border */}
                            <div className="relative mb-3 flex items-start gap-2 max-w-full">
                                <div className={cn(
                                    "w-16 h-16 min-w-16 rounded-sm overflow-clip border-2 border-background shadow-lg flex items-center justify-center",
                                    (profile.pfp || profile.primaryLogo) ? "bg-transparent" : "bg-primary/20"
                                )}>
                                    {profile.pfp ? (
                                        <img
                                            src={`https://arweave.net/${profile.pfp}`}
                                            alt={displayName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : profile.primaryLogo ? (
                                        <img
                                            src={`https://arweave.net/${profile.primaryLogo}`}
                                            alt={displayName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <img src={alien} alt="alien" className="w-8 h-8 opacity-60" />
                                    )}
                                </div>
                                <div className="my-1.5 max-w-56 w-full">
                                    {/* Profile badges section */}
                                    <div className="flex flex-wrap gap-1 mb-1">
                                        {visibleBadges.map((badge, index) => (
                                            <ProfileBadge
                                                key={index}
                                                logo={badge.logo}
                                                hoverText={badge.hoverText}
                                                link={badge.link}
                                            />
                                        ))}
                                    </div>

                                    {/* Collapsible additional badges */}
                                    {hasMoreBadges && (
                                        <Collapsible open={showAllBadges} onOpenChange={setShowAllBadges}>
                                            <CollapsibleContent className="space-y-2">
                                                <div className="flex flex-wrap gap-1">
                                                    {allBadges.slice(5).map((badge, index) => (
                                                        <ProfileBadge
                                                            key={index + 5}
                                                            logo={badge.logo}
                                                            hoverText={badge.hoverText}
                                                            link={badge.link}
                                                        />
                                                    ))}
                                                </div>
                                            </CollapsibleContent>

                                            <CollapsibleTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-4 !px-0.5 !pl-1 mt-1 text-xs gap-0.5 text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    {showAllBadges ? (
                                                        <>
                                                            <ChevronUp className="h-3 w-3" />
                                                            Show less
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ChevronDown className="h-3 w-3" />
                                                            Show {allBadges.length - MAX_VISIBLE_BADGES} more
                                                        </>
                                                    )}
                                                </Button>
                                            </CollapsibleTrigger>
                                        </Collapsible>
                                    )}
                                </div>
                            </div>

                            {/* User info */}
                            <div className="space-y-2">
                                <div>
                                    {/* Nickname with edit functionality for current user in server context */}
                                    {server && isCurrentUser ? (
                                        <div className="space-y-2">
                                            {isEditingNickname ? (
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            value={editedNickname}
                                                            onChange={(e) => setEditedNickname(e.target.value)}
                                                            onKeyDown={handleNicknameKeyDown}
                                                            placeholder="Enter nickname..."
                                                            className="font-freecam text-lg font-bold border-primary/30 focus:border-primary"
                                                            maxLength={32}
                                                            disabled={isSavingNickname}
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            onClick={handleSaveNickname}
                                                            disabled={isSavingNickname}
                                                            className="font-ocr bg-primary hover:bg-primary/90 text-black"
                                                        >
                                                            {isSavingNickname ? (
                                                                <>
                                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                                    {/* {editedNickname.trim() === "" ? "Clearing..." : "Saving..."} */}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Save className="w-3 h-3" />
                                                                    {/* {editedNickname.trim() === "" ? "Clear" : "Save"} */}
                                                                </>
                                                            )}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={handleCancelNicknameEdit}
                                                            disabled={isSavingNickname}
                                                            className="font-ocr border-primary/30"
                                                        >
                                                            <X className="w-3 h-3" />
                                                            {/* Cancel */}
                                                        </Button>
                                                    </div>
                                                    <p className="text-xs text-primary/60 font-ocr">
                                                        {editedNickname.trim() === "" ? "Leave empty to clear your nickname" : "This will be your display name in this server"}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-bold text-primary leading-tight font-freecam flex-1">
                                                        {nickname || displayName}
                                                    </h3>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={handleStartEditingNickname}
                                                        className="w-6 h-6 hover:bg-primary/10"
                                                        title="Edit nickname"
                                                    >
                                                        <Pencil className="w-3 h-3 text-primary/60" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <h3 className="text-lg font-bold text-primary leading-tight font-freecam">
                                            {nickname || displayName}
                                        </h3>
                                    )}

                                    {/* Show secondary info only when not editing nickname */}
                                    {(!isEditingNickname && nickname) && (
                                        <p className="text-sm text-primary/70 font-medium font-ocr mt-1">
                                            {profile?.primaryName || shortenAddress(userId)}
                                        </p>
                                    )}
                                </div>

                                <Separator className="bg-primary/20" />

                                {/* User details */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-primary/60 uppercase tracking-wide">
                                            User ID
                                        </span>
                                        <Badge variant="secondary" className="font-mono text-xs bg-primary/10 text-primary border-primary/30 cursor-pointer"
                                            onClick={() => {
                                                navigator.clipboard.writeText(userId)
                                                toast.success("User ID copied to clipboard")
                                                const copyIcon = document.getElementById(`copy-icon-${userId}`)
                                                const checkIcon = document.getElementById(`check-icon-${userId}`)
                                                if (copyIcon && checkIcon) {
                                                    copyIcon.classList.add("hidden")
                                                    checkIcon.classList.remove("hidden")
                                                    setTimeout(() => {
                                                        copyIcon.classList.remove("hidden")
                                                        checkIcon.classList.add("hidden")
                                                    }, 550)
                                                }
                                            }}>
                                            {shortenAddress(userId)}
                                            <Copy
                                                id={`copy-icon-${userId}`}
                                                className="w-3 h-3 ml-1 cursor-pointer"
                                            />
                                            <Check id={`check-icon-${userId}`} className="w-3 h-3 ml-1 hidden" />
                                        </Badge>
                                    </div>

                                    {/* Display assigned roles */}
                                    {server && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-medium text-primary/60 uppercase tracking-wide">
                                                    Roles
                                                </span>
                                                {/* Role assignment for server members */}
                                                {canManageThisUserRoles && (
                                                    <Popover open={rolePopoverOpen} onOpenChange={setRolePopoverOpen}>
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="w-4 h-4 hover:bg-primary/10"
                                                                disabled={assigningRole}
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setRolePopoverOpen(true)
                                                                }}
                                                            >
                                                                {assigningRole ? (
                                                                    <Loader2 className="w-3 h-3 animate-spin text-primary/60" />
                                                                ) : (
                                                                    <Plus className="w-3 h-3 text-primary/60" />
                                                                )}
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent
                                                            className="w-64 p-2 bg-background border border-primary/30"
                                                            side="right"
                                                            align="start"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <div className="space-y-2">
                                                                <div className="px-2 py-1">
                                                                    <h4 className="text-sm font-semibold text-primary font-freecam">Assign Role</h4>
                                                                    <p className="text-xs text-primary/60 font-ocr">
                                                                        Select a role to assign to this user
                                                                    </p>
                                                                </div>
                                                                <Separator className="bg-primary/20" />
                                                                <div className="max-h-48 overflow-y-auto space-y-1">
                                                                    {availableRoles.length > 0 ? (
                                                                        availableRoles.map((role: any) => (
                                                                            <Button
                                                                                key={role.roleId}
                                                                                variant="ghost"
                                                                                className="w-full justify-start h-auto p-2 text-left hover:bg-primary/10 font-ocr"
                                                                                onClick={() => handleAssignRole(role.roleId.toString())}
                                                                                disabled={assigningRole}
                                                                            >
                                                                                <div className="flex items-center gap-2 w-full">
                                                                                    <div
                                                                                        className="w-3 h-3 rounded-full border border-primary/30 flex-shrink-0"
                                                                                        style={{ backgroundColor: role.color }}
                                                                                    />
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <div className="font-medium text-sm truncate text-primary">
                                                                                            {role.name}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </Button>
                                                                        ))
                                                                    ) : (
                                                                        <div className="px-2 py-4 text-center">
                                                                            <p className="text-sm text-primary/60 font-ocr">
                                                                                No roles available to assign
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {userRoles.length > 0 ? userRoles.map((role: any) => (
                                                    <div key={role.roleId} className="group relative">
                                                        <Badge
                                                            variant="secondary"
                                                            className="text-xs px-2 py-1 flex items-center gap-1.5 bg-primary/10 border-primary/30"
                                                            style={{
                                                                backgroundColor: `${role.color}20`,
                                                                borderColor: `${role.color}40`,
                                                                color: role.color
                                                            }}
                                                        >
                                                            {/* Color dot with X button overlay */}
                                                            <div className="relative w-2.5 h-2.5 flex-shrink-0 flex items-center justify-center">
                                                                {/* Default color dot */}
                                                                <div
                                                                    className="w-2.5 h-2.5 rounded-full absolute inset-0 group-hover:opacity-0 transition-opacity"
                                                                    style={{ backgroundColor: role.color }}
                                                                />
                                                                {/* X button - only visible on hover when user has permissions */}
                                                                {canManageThisUserRoles && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            handleRemoveRole(role.roleId.toString())
                                                                        }}
                                                                        disabled={removingRoles.includes(role.roleId.toString())}
                                                                        className="absolute p-0 inset-0 w-2.5 h-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                                                        title="Remove role"
                                                                    >
                                                                        {removingRoles.includes(role.roleId.toString()) ? (
                                                                            <Loader2 className="w-1.5 h-1.5 animate-spin text-white" />
                                                                        ) : (
                                                                            <X className="w-2 h-2 text-white" />
                                                                        )}
                                                                    </Button>
                                                                )}
                                                            </div>
                                                            <span className="font-medium">{role.name}</span>
                                                        </Badge>
                                                    </div>
                                                )) : (
                                                    <p className="text-xs text-primary/40 font-ocr">No roles assigned</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-6 text-center">
                        <div className="w-12 h-12 bg-primary/20 rounded-sm mx-auto mb-3 flex items-center justify-center border border-primary/30">
                            <img src={alien} alt="alien" className="w-6 h-6 opacity-60" />
                        </div>
                        <p className="text-sm text-primary/80 font-medium font-ocr">No profile found</p>
                        <p className="text-xs text-primary/40 mt-1 font-ocr">This entity hasn't materialized yet</p>
                        {isRefreshing && (
                            <div className="flex items-center justify-center mt-2">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                <span className="ml-2 text-xs text-primary/60 font-ocr">Scanning...</span>
                            </div>
                        )}
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
} 