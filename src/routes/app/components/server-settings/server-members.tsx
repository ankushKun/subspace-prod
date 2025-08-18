/**
 * Server Members Management Component
 * 
 * Provides comprehensive member management including role assignment, nickname editing,
 * and member moderation with proper bot support.
 * 
 * Bot Data Fetching Improvements:
 * - Added bot profile fetching to loadMembers function
 * - Standardized display name logic: nickname > primaryName > truncateAddress
 * - Helper function ensureBotProfilesLoaded for consistent bot profile loading
 * - Proper bot profile handling in all role management functions
 * - Automatic bot profile loading when server bots change
 */

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Search,
    MoreHorizontal,
    UserPlus,
    Shield,
    Ban,
    UserX,
    Calendar,
    MessageSquare,
    Loader2,
    X,
    Users,
    Copy,
    Edit,
    Check,
    Plus,
    Minus,
    Bot as BotIcon
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSubspace, isBotUserId } from "@/hooks/use-subspace"
import { useGlobalState } from "@/hooks/use-global-state"
import { useWallet } from "@/hooks/use-wallet"
import { toast } from "sonner"
import { PermissionHelpers, Permissions } from "@/lib/permissions"
import type { Member, Role, Bot, ServerBot } from "@subspace-protocol/sdk"

// Extended interfaces for UI purposes
interface ExtendedMember extends Omit<Member, 'joinedAt'> {
    displayName?: string
    avatar?: string
    joinedAt?: string | number
    isBot?: false
}

interface ExtendedBot extends ServerBot {
    displayName?: string
    avatar?: string
    isBot: true
    // roles and nickname are already defined in ServerBot
}

interface ExtendedRole extends Role {
    memberCount?: number
}

type ExtendedMemberOrBot = ExtendedMember | ExtendedBot

export default function ServerMembers() {
    const { activeServerId } = useGlobalState()
    const { servers, profiles, bots, actions: subspaceActions } = useSubspace()
    const { address: walletAddress } = useWallet()

    // Get the current server
    const server = servers[activeServerId]

    // Component state
    const [searchQuery, setSearchQuery] = useState("")
    const [roleFilter, setRoleFilter] = useState("all")
    const [isLoadingMembers, setIsLoadingMembers] = useState(false)
    const [selectedMember, setSelectedMember] = useState<ExtendedMemberOrBot | null>(null)
    const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
    const [isUpdatingRoles, setIsUpdatingRoles] = useState(false)
    const [isKicking, setIsKicking] = useState<string | null>(null)
    const [isBanning, setIsBanning] = useState<string | null>(null)
    const [editingNickname, setEditingNickname] = useState<string | null>(null)
    const [nicknameValue, setNicknameValue] = useState("")
    const [isUpdatingNickname, setIsUpdatingNickname] = useState(false)
    const [togglingRoles, setTogglingRoles] = useState<Set<string>>(new Set())

    // Process server members and bots with profile data
    const members = useMemo((): Record<string, ExtendedMemberOrBot> => {
        if (!server) return {}

        const combined: Record<string, ExtendedMemberOrBot> = {}

        // Process regular members
        const serverMembers = server.members || {}
        Object.values(serverMembers).forEach((member: Member) => {
            const profile = profiles[member.userId]
            combined[member.userId] = {
                ...member,
                displayName: member.nickname || profile?.primaryName || null,  // Fixed priority order
                avatar: profile?.pfp,
                isBot: false
            } as ExtendedMember
        })

        // Process bots
        const serverBots: Record<string, ServerBot> = server.bots || {}
        Object.entries(serverBots).forEach(([botId, botInfo]) => {
            // Get bot details from store if available
            const botProfile = bots[botId]
            combined[botId] = {
                userId: botId,
                displayName: botInfo.nickname || botProfile?.name || `${botId.slice(0, 8)}`,  // Fixed priority order
                avatar: botProfile?.pfp,
                joinedAt: botInfo.joinedAt || "Unknown",
                isBot: true,
                approved: botInfo.approved,
                process: botInfo.process,
                roles: botInfo.roles || ["1"], // Bots now have roles, default to @everyone
                nickname: botInfo.nickname || undefined // Bots now support nicknames
            } as ExtendedBot
        })

        return combined
    }, [server, profiles, bots, server?.members, server?.bots])

    // Ensure bot profiles are loaded when members change
    useEffect(() => {
        if (server?.bots && Object.keys(server.bots).length > 0) {
            const botIds = Object.keys(server.bots)
            ensureBotProfilesLoaded(botIds)
        }
    }, [server?.bots, bots])

    // Process server roles
    const roles = useMemo((): ExtendedRole[] => {
        if (!server || !server.roles) return []

        return Object.values(server.roles).map(role => {
            // Count members with this role (include bots since they now have roles)
            const memberCount = Object.values(members).filter(member =>
                member.roles && member.roles.includes(role.roleId.toString())
            ).length

            return {
                ...role,
                memberCount
            } as ExtendedRole
        }).sort((a, b) => (b.position || 0) - (a.position || 0)) // Sort by position descending
    }, [server, members, server?.roles, server?.members])

    // Check if user has permission to manage members
    const canManageMembers = useMemo(() => {
        if (!server || !walletAddress) return false

        // Server owner can always manage members
        if (server.ownerId === walletAddress) return true

        // Check if user has appropriate permissions
        const serverMembers = server.members || {}
        const currentMember = Object.values(serverMembers).find((m: Member) => m.userId === walletAddress)

        if (!currentMember || !currentMember.roles) return false

        // Check permissions from user's roles
        for (const roleId of currentMember.roles) {
            const role = server.roles[roleId.toString()]
            if (role) {
                if (PermissionHelpers.hasPermission(role.permissions, Permissions.ADMINISTRATOR) ||
                    PermissionHelpers.hasPermission(role.permissions, Permissions.MANAGE_MEMBERS) ||
                    PermissionHelpers.hasPermission(role.permissions, Permissions.MANAGE_ROLES)) {
                    return true
                }
            }
        }

        return false
    }, [server, walletAddress, server?.members])

    // Check if user can manage nicknames
    const canManageNicknames = useMemo(() => {
        if (!server || !walletAddress) return false

        // Server owner can always manage nicknames
        if (server.ownerId === walletAddress) return true

        // Check if user has appropriate permissions
        const serverMembers = server.members || {}
        const currentMember = Object.values(serverMembers).find((m: Member) => m.userId === walletAddress)

        if (!currentMember || !currentMember.roles) return false

        // Check permissions from user's roles
        for (const roleId of currentMember.roles) {
            const role = server.roles[roleId.toString()]
            if (role) {
                if (PermissionHelpers.hasPermission(role.permissions, Permissions.ADMINISTRATOR) ||
                    PermissionHelpers.hasPermission(role.permissions, Permissions.MANAGE_MEMBERS)) {
                    return true
                }
            }
        }

        return false
    }, [server, walletAddress, server?.members])

    // Helper function to ensure bot profiles are loaded
    const ensureBotProfilesLoaded = async (botIds: string[]) => {
        if (botIds.length === 0) return

        const unloadedBotIds = botIds.filter(botId => !bots[botId])
        if (unloadedBotIds.length === 0) return

        console.log(`🤖 Loading ${unloadedBotIds.length} bot profiles...`)

        // Load bot profiles in small batches
        for (let i = 0; i < unloadedBotIds.length; i += 3) {
            const batch = unloadedBotIds.slice(i, i + 3)
            await Promise.all(batch.map((botId: string) =>
                subspaceActions.bots.get(botId).catch(console.error)
            ))
            // Small delay between batches
            if (i + 3 < unloadedBotIds.length) {
                await new Promise(resolve => setTimeout(resolve, 100))
            }
        }
    }

    // Load members when component mounts or server changes
    useEffect(() => {
        if (activeServerId && server) {
            loadMembers()
        }
    }, [activeServerId])

    const loadMembers = async () => {
        if (!activeServerId) return

        try {
            setIsLoadingMembers(true)
            await subspaceActions.servers.getMembers(activeServerId)

            // Get updated member list after loading
            const currentServer = servers[activeServerId]
            const currentMembers = currentServer?.members || {}

            // Load profiles for all members to ensure we have complete data
            const memberUserIds = Object.values(currentMembers).map((m: Member) => m.userId)
            if (memberUserIds.length > 0) {
                // Load profiles in small batches to avoid overwhelming the system
                for (let i = 0; i < memberUserIds.length; i += 3) {
                    const batch = memberUserIds.slice(i, i + 3)
                    await Promise.all(batch.map((userId: string) => {
                        if (isBotUserId(userId, activeServerId)) {
                            return subspaceActions.bots.get(userId).catch(console.error)
                        } else {
                            return subspaceActions.profile.get(userId).catch(console.error)
                        }
                    }))
                    // Small delay between batches
                    if (i + 3 < memberUserIds.length) {
                        await new Promise(resolve => setTimeout(resolve, 200))
                    }
                }
            }

            // Also load profiles for any bots in the server
            const serverBots = currentServer?.bots || {}
            const botIds = Object.keys(serverBots)
            if (botIds.length > 0) {
                await ensureBotProfilesLoaded(botIds)
            }
        } catch (error) {
            console.error("Failed to load members:", error)
            toast.error("Failed to load members")
        } finally {
            setIsLoadingMembers(false)
        }
    }

    const getRoleColor = (roleId: string | number) => {
        const role = roles.find(r => r.roleId.toString() === roleId.toString())
        return role?.color || "#99AAB5"
    }

    const getRoleName = (roleId: string | number) => {
        const role = roles.find(r => r.roleId.toString() === roleId.toString())
        return role?.name || "Unknown"
    }

    const getHighestRole = (member: ExtendedMember) => {
        if (!member.roles || member.roles.length === 0) {
            // Return @everyone role (roleId 1)
            return roles.find(r => r.roleId.toString() === "1") || roles[0]
        }

        const memberRoles = member.roles
            .map(roleId => roles.find(r => r.roleId.toString() === roleId.toString()))
            .filter(Boolean)

        return memberRoles.sort((a, b) => (b!.position || 0) - (a!.position || 0))[0] || roles[0]
    }

    const filteredMembers = Object.values(members).filter(member => {
        const searchTerm = searchQuery.toLowerCase()
        const matchesSearch = member.userId.toLowerCase().includes(searchTerm) ||
            member.displayName?.toLowerCase().includes(searchTerm) ||
            member.nickname?.toLowerCase().includes(searchTerm)

        // Apply role filtering for both members and bots (bots now have roles)
        const matchesRole = roleFilter === "all" || (member.roles && member.roles.includes(roleFilter))
        return matchesSearch && matchesRole
    })

    const openRoleDialog = (member: ExtendedMemberOrBot) => {
        setSelectedMember(member)
        setIsRoleDialogOpen(true)
    }

    const updateMemberRoles = async (member: ExtendedMemberOrBot, newRoles: string[]) => {
        if (!activeServerId || !canManageMembers) {
            toast.error("Insufficient permissions to manage member roles")
            return
        }

        setIsUpdatingRoles(true)
        try {
            const currentRoles = member.roles || []

            // Find roles to add and remove
            const rolesToAdd = newRoles.filter(roleId => !currentRoles.includes(roleId))
            const rolesToRemove = currentRoles.filter(roleId => !newRoles.includes(roleId) && roleId !== "1") // Never remove default role

            let allSuccessful = true

            // Remove roles first
            for (const roleId of rolesToRemove) {
                const success = await subspaceActions.servers.unassignRole(activeServerId, {
                    userId: member.userId,
                    roleId: roleId
                })
                if (!success) {
                    allSuccessful = false
                    break
                }
            }

            // Add new roles if removals were successful
            if (allSuccessful) {
                for (const roleId of rolesToAdd) {
                    const success = await subspaceActions.servers.assignRole(activeServerId, {
                        userId: member.userId,
                        roleId: roleId
                    })
                    if (!success) {
                        allSuccessful = false
                        break
                    }
                }
            }

            if (allSuccessful) {
                toast.success(`Updated roles for ${member.displayName || member.nickname || member.userId}`)
                // Refresh members to get updated data and update UI
                await subspaceActions.servers.refreshMembers(activeServerId)
                // Refetch the user's profile to ensure changes are reflected globally
                if (member.isBot) {
                    await subspaceActions.bots.get(member.userId)
                } else {
                    await subspaceActions.profile.get(member.userId)
                }
                // Reload members to update the UI with fresh data
                await loadMembers()
                setIsRoleDialogOpen(false)
                setSelectedMember(null)
            } else {
                toast.error("Failed to update member roles")
            }
        } catch (error) {
            console.error("Error updating member roles:", error)
            toast.error("Failed to update member roles")
        } finally {
            setIsUpdatingRoles(false)
        }
    }

    const toggleMemberRole = async (member: ExtendedMemberOrBot, roleId: string) => {
        if (!activeServerId || !canManageMembers) {
            toast.error("Insufficient permissions to manage member roles")
            return
        }

        // Don't allow toggling @everyone role
        if (roleId === "1") {
            toast.error("Cannot modify @everyone role")
            return
        }

        // Check if trying to modify server owner roles
        if (member.userId === server?.ownerId) {
            toast.error("Cannot modify server owner roles")
            return
        }

        const toggleKey = `${member.userId}-${roleId}`
        if (togglingRoles.has(toggleKey)) return

        setTogglingRoles(prev => new Set(prev).add(toggleKey))

        try {
            const currentRoles = member.roles || []
            const hasRole = currentRoles.includes(roleId)

            const success = hasRole
                ? await subspaceActions.servers.unassignRole(activeServerId, {
                    userId: member.userId,
                    roleId: roleId
                })
                : await subspaceActions.servers.assignRole(activeServerId, {
                    userId: member.userId,
                    roleId: roleId
                })

            if (success) {
                const roleName = getRoleName(roleId)
                toast.success(`${hasRole ? 'Removed' : 'Added'} ${roleName} ${hasRole ? 'from' : 'to'} ${member.displayName || member.nickname || member.userId}`)
                // Refresh members to get updated data and update UI
                await subspaceActions.servers.refreshMembers(activeServerId)
                // Refetch the user's profile to ensure changes are reflected globally
                if (member.isBot) {
                    await subspaceActions.bots.get(member.userId)
                } else {
                    await subspaceActions.profile.get(member.userId)
                }
                // Reload members to update the UI with fresh data
                await loadMembers()
            } else {
                toast.error("Failed to update member role")
            }
        } catch (error) {
            console.error("Error toggling member role:", error)
            toast.error("Failed to update member role")
        } finally {
            setTogglingRoles(prev => {
                const newSet = new Set(prev)
                newSet.delete(toggleKey)
                return newSet
            })
        }
    }

    const startEditingNickname = (member: ExtendedMemberOrBot) => {
        setEditingNickname(member.userId)
        setNicknameValue(member.nickname || "")
    }

    const cancelEditingNickname = () => {
        setEditingNickname(null)
        setNicknameValue("")
    }

    const saveNickname = async (member: ExtendedMemberOrBot) => {
        const isCurrentUser = member.userId === walletAddress && !member.isBot // Bots are never current user
        if (!activeServerId || (!canManageNicknames && !isCurrentUser)) {
            toast.error("Insufficient permissions to edit nicknames")
            return
        }

        setIsUpdatingNickname(true)
        try {
            const success = await subspaceActions.servers.updateMember(activeServerId, {
                userId: member.userId,
                nickname: nicknameValue.trim() || undefined
            })

            if (success) {
                toast.success(`Updated nickname for ${member.displayName || member.userId}`)
                // Refresh members to get updated data and update UI
                await subspaceActions.servers.refreshMembers(activeServerId)
                // Refetch the user's profile to ensure changes are reflected globally
                if (member.isBot) {
                    await subspaceActions.bots.get(member.userId)
                } else {
                    await subspaceActions.profile.get(member.userId)
                }
                // Reload members to update the UI with fresh data
                await loadMembers()
                setEditingNickname(null)
                setNicknameValue("")
            } else {
                toast.error("Failed to update nickname")
            }
        } catch (error) {
            console.error("Error updating nickname:", error)
            toast.error("Failed to update nickname")
        } finally {
            setIsUpdatingNickname(false)
        }
    }

    const kickMember = async (member: ExtendedMemberOrBot) => {
        if (!activeServerId || !canManageMembers) {
            toast.error("Insufficient permissions to kick members")
            return
        }

        // Check if trying to kick server owner
        if (member.userId === server?.ownerId) {
            toast.error("Cannot kick the server owner")
            return
        }

        // Check if trying to kick yourself
        if (member.userId === walletAddress) {
            toast.error("Cannot kick yourself")
            return
        }

        setIsKicking(member.userId)
        try {
            const success = await subspaceActions.servers.kickMember(activeServerId, member.userId)

            if (success) {
                const actionText = member.isBot ? "removed" : "kicked"
                toast.success(`${member.displayName || member.nickname || member.userId} has been ${actionText} from the server`)
                // Refresh members and update UI
                await loadMembers()
            } else {
                const actionText = member.isBot ? "remove" : "kick"
                toast.error(`Failed to ${actionText} ${member.isBot ? "bot" : "member"}`)
            }
        } catch (error) {
            console.error("Error kicking member:", error)
            const actionText = member.isBot ? "removing bot" : "kicking member"
            toast.error(`Failed to ${actionText}`)
        } finally {
            setIsKicking(null)
        }
    }



    const banMember = async (member: ExtendedMemberOrBot) => {
        if (member.isBot) {
            toast.info("Use bot removal instead of banning bots")
            return
        }
        if (!activeServerId || !canManageMembers) {
            toast.error("Insufficient permissions to ban members")
            return
        }

        // Check if trying to ban server owner
        if (member.userId === server?.ownerId) {
            toast.error("Cannot ban the server owner")
            return
        }

        // Check if trying to ban yourself
        if (member.userId === walletAddress) {
            toast.error("Cannot ban yourself")
            return
        }

        setIsBanning(member.userId)
        try {
            // For now, we'll simulate ban by removing all roles
            const success = await subspaceActions.servers.updateMember(activeServerId, {
                userId: member.userId,
                roles: []
            })

            if (success) {
                toast.success(`${member.displayName || member.nickname || member.userId} has been banned from the server`)
                // Refresh members and update UI
                await loadMembers()
            } else {
                toast.error("Failed to ban member")
            }
        } catch (error) {
            console.error("Error banning member:", error)
            toast.error("Failed to ban member")
        } finally {
            setIsBanning(null)
        }
    }

    const copyUserId = (userId: string) => {
        navigator.clipboard.writeText(userId)
        toast.success("User ID copied to clipboard")
    }

    const truncateUserId = (userId: string, maxLength: number = 16) => {
        if (userId.length <= maxLength) return userId
        return `${userId.slice(0, maxLength)}...`
    }

    const getDisplayName = (member: ExtendedMemberOrBot) => {
        // Standardized display name logic matching other components
        if (member.isBot) {
            return member.nickname || member.displayName || `${member.userId.slice(0, 8)}...`
        } else {
            return member.nickname || member.displayName || truncateUserId(member.userId, 20)
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

    if (!canManageMembers) {
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
                            You don't have permission to manage members
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6 relative h-full overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary)/0.01)_0%,transparent_50%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(var(--primary)/0.01)_0%,transparent_50%)] pointer-events-none" />

            <div className="relative z-10 max-w-7xl mx-auto space-y-6 h-full flex flex-col">
                {/* Filters */}
                <Card className="border-primary/10 shadow-md backdrop-blur-sm bg-card/30 relative flex-shrink-0">
                    {/* Card glow effect */}
                    <div className="absolute inset-0 from-primary/2 via-transparent to-primary/2 rounded-xl pointer-events-none" />

                    <CardHeader className="relative z-10 pb-3">
                        <CardTitle className="font-freecam text-primary/80 tracking-wide text-sm uppercase">Member Search & Filters</CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="flex flex-col lg:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-primary/60" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search members..."
                                    className="pl-10 font-ocr bg-background/80 border-primary/20 focus:border-primary/40 focus:ring-primary/20"
                                />
                            </div>
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger className="w-full lg:w-48 font-ocr bg-background/80 border-primary/20 focus:border-primary/40 focus:ring-primary/20">
                                    <SelectValue placeholder="Filter by role" />
                                </SelectTrigger>
                                <SelectContent className="border-primary/15 bg-background/95 backdrop-blur-sm">
                                    <SelectItem value="all" className="font-ocr">All Roles</SelectItem>
                                    {roles.map((role) => (
                                        <SelectItem key={role.roleId} value={role.roleId.toString()} className="font-ocr">
                                            {role.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Members List */}
                <Card className="border-primary/10 shadow-md backdrop-blur-sm bg-card/30 relative flex-1 min-h-0">
                    {/* Card glow effect */}
                    <div className="absolute inset-0 from-primary/2 via-transparent to-primary/2 rounded-xl pointer-events-none" />

                    <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-3 flex-shrink-0">
                        <CardTitle className="font-freecam text-primary/80 tracking-wide text-sm uppercase flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary/40" />
                            Members - {filteredMembers.length}
                            {isLoadingMembers && (
                                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            )}
                        </CardTitle>
                        <Button
                            className="font-freecam tracking-wide bg-primary hover:bg-primary/90 text-primary-foreground"
                            onClick={loadMembers}
                            disabled={isLoadingMembers}
                        >
                            <UserPlus className="w-4 h-4 mr-2" />
                            {isLoadingMembers ? "LOADING..." : "REFRESH MEMBERS"}
                        </Button>
                    </CardHeader>
                    <CardContent className="relative z-10 flex-1 min-h-0 p-0">
                        {isLoadingMembers && Object.keys(members).length === 0 ? (
                            <div className="text-center py-12">
                                <Loader2 className="w-8 h-8 mx-auto text-primary/60 animate-spin mb-4" />
                                <p className="text-primary/60 font-ocr">Loading members...</p>
                            </div>
                        ) : (
                            <ScrollArea className="h-full px-6 pb-6">
                                <div className="space-y-3">
                                    {filteredMembers.map((member) => {
                                        const isOwner = member.userId === server.ownerId
                                        const isCurrentUser = member.userId === walletAddress
                                        const isEditingThisNickname = editingNickname === member.userId

                                        return (
                                            <div
                                                key={member.userId}
                                                className="group relative overflow-hidden rounded-xl border border-primary/10 bg-gradient-to-r from-background/90 via-background/95 to-background/90 hover:from-primary/5 hover:via-primary/3 hover:to-primary/5 transition-all duration-300 hover:border-primary/20 hover:shadow-lg"
                                            >
                                                {/* Card hover glow */}
                                                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                                                <div className="relative p-4 lg:p-5">
                                                    <div className="flex items-start gap-4 lg:gap-6">
                                                        {/* Avatar Section */}
                                                        <div className="relative flex-shrink-0">
                                                            <Avatar className="w-12 h-12 lg:w-14 lg:h-14 ring-2 ring-primary/20 group-hover:ring-primary/30 transition-all duration-300">
                                                                <AvatarImage src={(() => {
                                                                    const pfp = member.avatar
                                                                    const primaryLogo = (profiles as any)?.[member.userId]?.primaryLogo
                                                                    const pick = pfp || primaryLogo
                                                                    if (!pick) return undefined
                                                                    return String(pick).startsWith('http') ? String(pick) : `https://arweave.net/${pick}`
                                                                })()} />
                                                                <AvatarFallback className="bg-primary/10 text-primary font-freecam text-lg">
                                                                    {getDisplayName(member)[0].toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            {/* Bot indicator */}
                                                            {member.isBot && (
                                                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center border-2 border-background">
                                                                    <BotIcon className="w-3 h-3 text-white" />
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Member Info Section */}
                                                        <div className="flex-1 min-w-0 space-y-3">
                                                            {/* Name and Badges Row */}
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                {isEditingThisNickname ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <Input
                                                                            value={nicknameValue}
                                                                            onChange={(e) => setNicknameValue(e.target.value)}
                                                                            placeholder="Enter nickname..."
                                                                            className="font-ocr text-sm h-8 w-48 bg-background/80 border-primary/20 focus:border-primary/40"
                                                                            maxLength={32}
                                                                            disabled={isUpdatingNickname}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') {
                                                                                    saveNickname(member)
                                                                                } else if (e.key === 'Escape') {
                                                                                    cancelEditingNickname()
                                                                                }
                                                                            }}
                                                                        />
                                                                        <Button
                                                                            size="sm"
                                                                            className="h-8 w-8 p-0"
                                                                            onClick={() => saveNickname(member)}
                                                                            disabled={isUpdatingNickname}
                                                                        >
                                                                            {isUpdatingNickname ? (
                                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                                            ) : (
                                                                                <Check className="w-3 h-3" />
                                                                            )}
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="h-8 w-8 p-0"
                                                                            onClick={cancelEditingNickname}
                                                                            disabled={isUpdatingNickname}
                                                                        >
                                                                            <X className="w-3 h-3" />
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-2">
                                                                        <h3 className="font-ocr font-semibold text-foreground text-lg truncate">
                                                                            {getDisplayName(member)}
                                                                        </h3>
                                                                        {((canManageNicknames && !isOwner) || isCurrentUser) && (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="ghost"
                                                                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                onClick={() => startEditingNickname(member)}
                                                                            >
                                                                                <Edit className="w-3 h-3" />
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {isOwner && (
                                                                    <Badge variant="secondary" className="text-xs font-freecam bg-yellow-500/15 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/20 transition-colors">
                                                                        OWNER
                                                                    </Badge>
                                                                )}
                                                                {isCurrentUser && !member.isBot && (
                                                                    <Badge variant="secondary" className="text-xs font-freecam bg-blue-500/15 text-blue-500 border-blue-500/30 hover:bg-blue-500/20 transition-colors">
                                                                        YOU
                                                                    </Badge>
                                                                )}
                                                                {member.isBot && (
                                                                    <Badge variant="secondary" className="text-xs font-freecam bg-purple-500/15 text-purple-500 border-purple-500/30 hover:bg-purple-500/20 transition-colors">
                                                                        <BotIcon className="w-3 h-3 mr-1" />
                                                                        BOT
                                                                    </Badge>
                                                                )}
                                                            </div>

                                                            {/* User ID and Join Date Row */}
                                                            <div className="flex items-center gap-3 text-sm text-primary/70">
                                                                <div className="flex items-center gap-2 group/userid cursor-pointer" onClick={() => copyUserId(member.userId)}>
                                                                    <span className="font-mono text-xs">
                                                                        {truncateUserId(member.userId, 24)}
                                                                    </span>
                                                                    <Copy className="w-3 h-3 opacity-0 group-hover/userid:opacity-100 transition-opacity" />
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <Calendar className="w-3 h-3" />
                                                                    <span className="font-ocr text-xs">
                                                                        Joined {member.joinedAt !== "Unknown" && typeof member.joinedAt === 'number' ? new Date(member.joinedAt).toLocaleDateString() : "Unknown"}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Roles Section */}
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {member.roles && member.roles.length > 0 ? (
                                                                    <>
                                                                        {member.roles.slice(0, 6).map((roleId) => {
                                                                            const isEveryoneRole = roleId === "1"
                                                                            const toggleKey = `${member.userId}-${roleId}`
                                                                            const isToggling = togglingRoles.has(toggleKey)

                                                                            return (
                                                                                <div key={roleId} className="relative">
                                                                                    <Badge
                                                                                        variant="secondary"
                                                                                        className={cn(
                                                                                            "text-xs font-ocr border transition-all duration-200",
                                                                                            !isEveryoneRole && canManageMembers && !isOwner ? "cursor-pointer hover:scale-105 hover:shadow-md" : "",
                                                                                            isToggling ? "opacity-50" : ""
                                                                                        )}
                                                                                        style={{
                                                                                            backgroundColor: `${getRoleColor(roleId)}20`,
                                                                                            color: getRoleColor(roleId),
                                                                                            borderColor: `${getRoleColor(roleId)}40`
                                                                                        }}
                                                                                        onClick={() => {
                                                                                            if (!isEveryoneRole && canManageMembers && !isOwner && !isToggling) {
                                                                                                toggleMemberRole(member, roleId)
                                                                                            }
                                                                                        }}
                                                                                    >
                                                                                        {getRoleName(roleId)}
                                                                                        {!isEveryoneRole && canManageMembers && !isOwner && (
                                                                                            <Minus className="w-3 h-3 ml-1 opacity-60" />
                                                                                        )}
                                                                                    </Badge>
                                                                                    {isToggling && (
                                                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )
                                                                        })}
                                                                        {member.roles.length > 6 && (
                                                                            <Badge variant="secondary" className="text-xs font-ocr bg-primary/10 text-primary/70 border-primary/20">
                                                                                +{member.roles.length - 6} more
                                                                            </Badge>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <Badge variant="secondary" className="text-xs font-ocr bg-primary/10 text-primary/70 border-primary/20">
                                                                        No roles assigned
                                                                    </Badge>
                                                                )}

                                                                {/* Quick Add Role Button */}
                                                                {canManageMembers && !isOwner && (
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="text-xs font-ocr border-dashed border-primary/30 text-primary/60 cursor-pointer hover:border-primary/50 hover:text-primary/80 transition-all duration-200"
                                                                            >
                                                                                <Plus className="w-3 h-3 mr-1" />
                                                                                Add Role
                                                                            </Badge>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent className="border-primary/15 bg-background/95 backdrop-blur-sm">
                                                                            {roles.filter(role =>
                                                                                role.roleId.toString() !== "1" &&
                                                                                !(member.roles?.includes(role.roleId.toString()))
                                                                            ).map((role) => (
                                                                                <DropdownMenuItem
                                                                                    key={role.roleId}
                                                                                    className="font-ocr hover:bg-primary/5 focus:bg-primary/5"
                                                                                    onClick={() => toggleMemberRole(member, role.roleId.toString())}
                                                                                >
                                                                                    <div
                                                                                        className="w-3 h-3 rounded-full mr-2"
                                                                                        style={{ backgroundColor: role.color || "#99AAB5" }}
                                                                                    />
                                                                                    {role.name}
                                                                                </DropdownMenuItem>
                                                                            ))}
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Actions Section */}
                                                        <div className="flex-shrink-0">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="hover:bg-primary/10 text-primary/50 hover:text-primary/80 transition-all duration-200 rounded-lg"
                                                                    >
                                                                        <MoreHorizontal className="w-5 h-5" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="border-primary/15 bg-background/95 backdrop-blur-sm w-48">
                                                                    <DropdownMenuItem
                                                                        className="font-ocr hover:bg-primary/5 focus:bg-primary/5"
                                                                        disabled={true}
                                                                    >
                                                                        <MessageSquare className="w-4 h-4 mr-2" />
                                                                        Send Message
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        className="font-ocr hover:bg-primary/5 focus:bg-primary/5"
                                                                        onClick={() => openRoleDialog(member)}
                                                                        disabled={isOwner || isUpdatingRoles}
                                                                    >
                                                                        <Shield className="w-4 h-4 mr-2" />
                                                                        Manage Roles
                                                                    </DropdownMenuItem>
                                                                    {((canManageNicknames && !isOwner) || isCurrentUser) && (
                                                                        <DropdownMenuItem
                                                                            className="font-ocr hover:bg-primary/5 focus:bg-primary/5"
                                                                            onClick={() => startEditingNickname(member)}
                                                                        >
                                                                            <Edit className="w-4 h-4 mr-2" />
                                                                            Edit Nickname
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    <DropdownMenuItem
                                                                        className="font-ocr hover:bg-primary/5 focus:bg-primary/5"
                                                                        onClick={() => copyUserId(member.userId)}
                                                                    >
                                                                        <Copy className="w-4 h-4 mr-2" />
                                                                        Copy User ID
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator className="bg-primary/15" />
                                                                    <DropdownMenuItem
                                                                        className="font-ocr text-red-500/80 hover:bg-red-500/5 focus:bg-red-500/5 focus:text-red-500"
                                                                        onClick={() => kickMember(member)}
                                                                        disabled={isOwner || isCurrentUser || isKicking === member.userId}
                                                                    >
                                                                        {isKicking === member.userId ? (
                                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                        ) : (
                                                                            member.isBot ? <BotIcon className="w-4 h-4 mr-2" /> : <UserX className="w-4 h-4 mr-2" />
                                                                        )}
                                                                        {member.isBot ? "Remove Bot" : "Kick Member"}
                                                                    </DropdownMenuItem>
                                                                    {!member.isBot && (
                                                                        <DropdownMenuItem
                                                                            className="font-ocr text-red-500/80 hover:bg-red-500/5 focus:bg-red-500/5 focus:text-red-500"
                                                                            onClick={() => banMember(member)}
                                                                            disabled={isOwner || isCurrentUser || isBanning === member.userId}
                                                                        >
                                                                            {isBanning === member.userId ? (
                                                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                            ) : (
                                                                                <Ban className="w-4 h-4 mr-2" />
                                                                            )}
                                                                            Ban Member
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}

                                    {filteredMembers.length === 0 && !isLoadingMembers && (
                                        <div className="text-center py-12 text-primary/60 font-ocr">
                                            <Users className="w-12 h-12 mx-auto mb-4 text-primary/30" />
                                            <p className="text-lg mb-2">
                                                {Object.keys(members).length === 0 ? "No members found" : "No members match your filters"}
                                            </p>
                                            <p className="text-sm text-primary/40">
                                                {Object.keys(members).length === 0 ? "Try refreshing the member list" : "Try adjusting your search or filters"}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>

                {/* Role Management Dialog */}
                <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
                    <DialogContent className="border-primary/20 bg-card/95 backdrop-blur-sm max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-freecam text-sm uppercase tracking-wide text-primary">
                                Manage Roles
                            </DialogTitle>
                            <p className="text-xs text-primary/60 font-ocr mt-1">
                                {selectedMember?.nickname || selectedMember?.displayName || truncateUserId(selectedMember?.userId || "", 30)}
                            </p>
                        </DialogHeader>
                        {selectedMember && (
                            <div className="space-y-4">
                                <ScrollArea className="max-h-80">
                                    <div className="space-y-3 pr-4">
                                        {roles.map((role) => {
                                            const hasRole = selectedMember.roles?.includes(role.roleId.toString()) || false
                                            const isEveryoneRole = role.roleId.toString() === "1"

                                            return (
                                                <div
                                                    key={role.roleId}
                                                    className="flex items-center justify-between p-3 rounded-lg border border-primary/15 bg-background/30 hover:bg-background/50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <div
                                                            className="w-4 h-4 rounded-full flex-shrink-0"
                                                            style={{ backgroundColor: role.color || "#99AAB5" }}
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <Label className="font-ocr text-sm font-medium text-foreground block truncate">
                                                                {role.name}
                                                            </Label>
                                                            <p className="text-xs text-primary/60 font-ocr">
                                                                {role.memberCount || 0} members
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Checkbox
                                                        checked={hasRole}
                                                        disabled={isEveryoneRole || isUpdatingRoles}
                                                        onCheckedChange={(checked) => {
                                                            if (!selectedMember.roles) return

                                                            const currentRoles = [...selectedMember.roles]
                                                            const roleIdStr = role.roleId.toString()

                                                            if (checked) {
                                                                if (!currentRoles.includes(roleIdStr)) {
                                                                    currentRoles.push(roleIdStr)
                                                                }
                                                            } else {
                                                                const index = currentRoles.indexOf(roleIdStr)
                                                                if (index > -1) {
                                                                    currentRoles.splice(index, 1)
                                                                }
                                                            }

                                                            updateMemberRoles(selectedMember, currentRoles)
                                                        }}
                                                    />
                                                </div>
                                            )
                                        })}
                                    </div>
                                </ScrollArea>
                                <div className="flex justify-end gap-2 pt-2 border-t border-primary/10">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setIsRoleDialogOpen(false)
                                            setSelectedMember(null)
                                        }}
                                        className="font-ocr text-xs border-primary/20 hover:border-primary/40"
                                        disabled={isUpdatingRoles}
                                    >
                                        Close
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    )
}
