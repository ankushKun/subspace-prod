/**
 * Profile Popover Component
 * 
 * Displays user/bot profile information in a popover with role management
 * and nickname editing capabilities.
 * 
 * Bot Data Fetching Improvements:
 * - Standardized display name logic: nickname > primaryName > shortenAddress
 * - For bots: fetches global bot profile AND server bot data (not regular member data)
 * - For users: fetches regular member global profile and server member data
 * - Consistent bot detection using isBotUserId helper
 * - Unified profile display for both users and bots
 * - Uses getBotOrUserProfile helper for correct data access
 * - Proper bot profile handling in role management functions
 * - Consistent avatar and badge display for bots and users
 * - Auto-fetches bot data on component mount if missing
 * - Ensures component re-renders when bot data changes
 * - Static Bot badge for bots (not dynamically added to list)
 */

import { useSubspace, isBotUserId, getBotOrUserProfile } from "@/hooks/use-subspace"
import { useWallet } from "@/hooks/use-wallet"
import { useGlobalState } from "@/hooks/use-global-state"
import { cn, shortenAddress } from "@/lib/utils"
import { PermissionHelpers, Permissions } from "@/lib/permissions"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Check, Copy, Shield, Loader2, Plus, X, Pencil, UserPlus, UserCheck, UserX, Clock, Save, ChevronDown, ChevronUp, Bot } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useState, useCallback, useMemo, useEffect } from "react"
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
    const { profiles, servers, actions, bots, subspace } = useSubspace()

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

    // Use getBotOrUserProfile helper to get the correct profile data
    const profile = getBotOrUserProfile(userId, activeServerId)

    const isCurrentUser = address === userId

    // Check if this is a bot using the helper function
    const isBot = useMemo(() => {
        return isBotUserId(userId, activeServerId)
    }, [userId, activeServerId])

    // Fetch bot data when component mounts if it's a bot and we don't have the data
    useEffect(() => {
        if (isBot && !profile && !isRefreshing) {
            actions.bots.get(userId).catch(console.error)
        }
    }, [isBot, profile, userId, actions.bots, isRefreshing, bots])

    // Get member info from server
    const member = server?.members && typeof server.members === 'object'
        ? Array.isArray(server.members)
            ? server.members.find((m: any) => m.userId === userId)
            : server.members[userId]
        : undefined
    const nickname = member?.nickname

    // Get display name following priority order (different for bots)
    const displayName = isBot
        ? (nickname || (profile as any)?.primaryName || (profile as any)?.name || shortenAddress(userId))
        : (nickname || (profile as any)?.primaryName || shortenAddress(userId))

    // Create badges array based on user profile
    const allBadges = useMemo(() => {
        const badges = []

        // Add ArNS badge if user has primary name (not for bots)
        if (!isBot && (profile as any)?.primaryName) {
            badges.push({
                logo: Constants.Icons.ArnsLogo,
                hoverText: "ArNS",
                link: "https://arns.ar.io"
            })
        }

        // Add Wander Tier badge (not for bots)
        if (!isBot && (profile as any)?.wndrTier) {
            badges.push({
                logo: Constants.WanderTiers[(profile as any).wndrTier.tier]?.Icon,
                hoverText: `${Constants.WanderTiers[(profile as any).wndrTier.tier]?.Label} Tier`,
                children: <img src={`https://arweave.net/${Constants.WanderTiers[(profile as any).wndrTier.tier]?.TextIcon}`} className="w-full h-full object-left object-cover" />,
                link: "https://www.wander.app/wndr"
            })
        }

        return badges
    }, [profile, isBot])

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
        const serverMembers = server?.members || {}
        const currentMember = typeof serverMembers === 'object'
            ? Array.isArray(serverMembers)
                ? serverMembers.find((m: any) => m.userId === address)
                : serverMembers[address]
            : undefined

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
    }, [server, address, server?.members])

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
        if (!server) {
            return []
        }



        // For bots, get roles from server.bots data
        if (isBot && server.bots && server.bots[userId]) {
            const botRoles = server.bots[userId].roles || []

            if (!Array.isArray(botRoles) || botRoles.length === 0) {
                return []
            }

            // Convert role IDs to role objects
            const userRoles = Object.values(server.roles || {})
                .filter((role: any) => botRoles.includes(role.roleId.toString()))
                .sort((a: any, b: any) => (b.orderId || b.position || 0) - (a.orderId || a.position || 0))

            return userRoles
        }

        // For regular users, get roles from server.members data
        if (!member || !member.roles || !Array.isArray(member.roles)) {
            return []
        }

        if (!server.roles) {
            return []
        }

        // Normalize to string IDs for robust comparison
        const userRoleIds: string[] = (member.roles as any[]).map((r: any) => String(r))

        // Filter server roles to get only the ones assigned to this user (match server-roles.tsx logic)
        const userRoles = Object.values(server.roles)
            .filter((role: any) => userRoleIds.includes(String(role.roleId)))
            .sort((a: any, b: any) => (b.orderId || b.position || 0) - (a.orderId || a.position || 0)) // Sort by orderId/position descending like server-roles.tsx

        return userRoles
    }

    // Get available roles for assignment
    const getAvailableRoles = () => {
        if (!server || !server.roles || !address) {
            return []
        }

        // For bots, get current roles from server.bots data
        let userRoleIds: (string | number)[] = []
        if (isBot && server.bots && server.bots[userId]) {
            userRoleIds = server.bots[userId].roles || []
        } else if (member) {
            // For regular users, get roles from member data
            userRoleIds = member.roles || []
        }

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

                // Refresh data based on whether it's a bot or user
                if (isBot) {
                    // For bots: refresh the entire server to get updated bot data
                    try {
                        await actions.servers.get(activeServerId, true)
                    } catch (error) {
                        console.warn('Failed to refresh server data after bot role assignment:', error)
                    }
                } else {
                    // For users: fetch specific member data
                    try {
                        await actions.servers.getMember(activeServerId, userId)
                    } catch (error) {
                        console.warn('Failed to refresh specific member data after role assignment:', error)
                    }
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

                // Refresh data based on whether it's a bot or user
                if (isBot) {
                    // For bots: refresh the entire server to get updated bot data
                    try {
                        await actions.servers.get(activeServerId, true)
                    } catch (error) {
                        console.warn('Failed to refresh server data after bot role removal:', error)
                    }
                } else {
                    // For users: fetch specific member data
                    try {
                        await actions.servers.getMember(activeServerId, userId)
                    } catch (error) {
                        console.warn('Failed to refresh specific member data after role removal:', error)
                    }
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

    // Only fetch data when popover opens if data is missing
    const handleOpenChange = useCallback(async (open: boolean) => {
        setIsOpen(open)

        if (open && !isRefreshing && !profile) {
            // Only fetch if we don't have profile data
            setIsRefreshing(true)

            try {
                if (isBot) {
                    // For bots: fetch global bot profile only if missing
                    await actions.bots.get(userId)
                } else {
                    // For users: fetch regular member global profile only if missing
                    await actions.profile.get(userId)
                }
            } catch (error) {
                console.error('Failed to fetch missing profile data:', error)
            } finally {
                setIsRefreshing(false)
            }
        }

        // Reset nickname editing state when popover closes
        if (!open) {
            setIsEditingNickname(false)
            setEditedNickname("")
        }
    }, [userId, activeServerId, actions, isRefreshing, isBot, profile])

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
                                    (profile as any)?.pfp ? "bg-transparent" : "bg-primary/20"
                                )}>
                                    {(profile as any)?.pfp ? (
                                        <img
                                            src={`https://arweave.net/${(profile as any).pfp}`}
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
                                        {/* Static Bot badge for bots */}
                                        {isBot && (
                                            <ProfileBadge
                                                logo={<Bot className="w-3.5 h-3.5 text-primary" />}
                                                hoverText="Bot"
                                                children={<span className="text-primary font-bold">BOT</span>}
                                                link="#"
                                            />
                                        )}

                                        {visibleBadges.map((badge, index) => (
                                            <ProfileBadge
                                                key={index}
                                                logo={badge.logo}
                                                hoverText={badge.hoverText}
                                                children={badge.children}
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
                                                            children={badge.children}
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
                                            {isBot
                                                ? ((profile as any)?.primaryName || (profile as any)?.name || shortenAddress(userId))
                                                : ((profile as any)?.primaryName || shortenAddress(userId))
                                            }
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