/**
 * Member List Component
 * 
 * Displays server members organized by roles with proper bot support.
 * 
 * Bot Data Fetching Improvements:
 * - Standardized display name logic: nickname > primaryName > shortenAddress
 * - Reduced bot profile fetching delays from 300ms to 100ms for better performance
 * - Proper bot profile loading through actions.bots.get()
 * - Consistent bot detection using isBotUserId helper
 * - Unified member/bot display with proper role support
 */

import { useGlobalState } from "@/hooks/use-global-state";
import { useSubspace, isBotUserId, getBotOrUserProfile } from "@/hooks/use-subspace";
import { cn, shortenAddress } from "@/lib/utils";
import { Constants } from "@/lib/constants";
import type { Member, Role } from "@subspace-protocol/sdk";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Crown, Users, Search, MoreHorizontal, UsersRound, Loader2, Bot } from "lucide-react";
import alien from "@/assets/subspace/alien-black.svg";
import alienGreen from "@/assets/subspace/alien-green.svg";
import ProfilePopover from "./profile-popover";

// Avatar Component with alien theme
const MemberAvatar = ({
    userId,
    profile,
    size = "sm",
    isBot = false
}: {
    userId: string;
    profile?: any;
    size?: "xs" | "sm" | "md";
    isBot?: boolean;
}) => {
    const sizeClasses = {
        xs: "w-6 h-6 text-[10px]",
        sm: "w-8 h-8 text-xs",
        md: "w-10 h-10 text-sm"
    }

    return (
        <div className="relative flex-shrink-0">
            <div className={cn(
                "relative rounded-sm overflow-hidden bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/30",
                sizeClasses[size]
            )}>
                {(profile as any)?.pfp ? (
                    <img
                        src={`https://arweave.net/${(profile as any).pfp}`}
                        alt={(profile as any)?.primaryName || (profile as any)?.name || userId}
                        className="w-full h-full object-cover"
                    />
                ) : (profile as any)?.primaryLogo ? (
                    <img
                        src={`https://arweave.net/${(profile as any).primaryLogo}`}
                        alt={(profile as any)?.primaryName || (profile as any)?.name || userId}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                        <img src={alien} alt="alien" className="w-1/2 h-1/2 opacity-60" />
                    </div>
                )}
            </div>
            {/* Bot indicator */}
            {isBot && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center border border-background">
                    <Bot className="w-1.5 h-1.5 text-white" />
                </div>
            )}
            {/* Subtle glow effect */}
            <div className="absolute inset-0 rounded-sm bg-primary/20 blur-sm scale-110 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
    )
}

// Member Item Component with space theme
const MemberItem = ({
    member,
    profile,
    isOwner = false,
    roleColor,
    server,
    isBot = false
}: {
    member: any;
    profile?: any;
    isOwner?: boolean;
    roleColor?: string;
    server?: any;
    isBot?: boolean;
}) => {
    const [isHovered, setIsHovered] = useState(false)

    // Use the correct profile data source for bots vs users
    const displayName = isBot
        ? (member.nickname || (profile as any)?.primaryName || (profile as any)?.name || `${shortenAddress(member.userId)}`)
        : (member.nickname || (profile as any)?.primaryName || shortenAddress(member.userId))

    return (
        <div className="relative group">
            <ProfilePopover userId={member.userId} side="left" align="start">
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "w-full h-10 px-3 justify-start text-sm transition-all duration-300 relative overflow-hidden cursor-pointer",
                        "hover:bg-primary/10 rounded-lg border border-transparent hover:border-primary/20",
                        "text-muted-foreground hover:text-foreground font-ocr",
                        "before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/5 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300"
                    )}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <div className="flex items-center gap-3 w-full relative z-10">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                            <MemberAvatar userId={member.userId} profile={profile} size="sm" isBot={isBot} />
                        </div>

                        {/* Member info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span
                                    className="font-medium truncate transition-colors"
                                    style={{
                                        color: roleColor || undefined
                                    }}
                                >
                                    {displayName}
                                </span>

                                {/* Bot indicator */}
                                {/* {isBot && (
                                    <Bot className="w-3 h-3 text-purple-500 flex-shrink-0" />
                                )} */}

                                {/* Owner indicator */}
                                {isOwner && !isBot && (
                                    <Crown className="w-3 h-3 text-primary flex-shrink-0 animate-pulse" />
                                )}
                            </div>
                        </div>

                        {/* Actions on hover */}
                        {isHovered && (
                            <div
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-primary/20 rounded-md cursor-pointer flex items-center justify-center"
                                onClick={(e) => {
                                    e.stopPropagation()
                                }}
                            >
                                <MoreHorizontal className="w-3 h-3" />
                            </div>
                        )}
                    </div>
                </Button>
            </ProfilePopover>
        </div>
    )
}

// Member Section Component with alien theme
const MemberSection = ({
    title,
    members,
    profiles,
    bots,
    isOwnerSection = false,
    roleColor,
    server,
    activeServerId
}: {
    title: string;
    members: any[];
    profiles: Record<string, any & { primaryName: string, primaryLogo: string }>;
    bots: Record<string, any>;
    isOwnerSection?: boolean;
    roleColor?: string;
    server?: any;
    activeServerId?: string;
}) => {
    const memberCount = members.length

    return (
        <div className="mb-4">
            {/* Section header with alien styling */}
            <div className={cn(
                "w-full h-8 px-3 flex items-center text-xs font-bold uppercase tracking-wider",
                "text-primary/80 font-ocr relative"
            )}>
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        <div
                            className="w-1 h-1 rounded-full animate-pulse"
                            style={{
                                backgroundColor: roleColor || 'rgba(var(--primary), 1)'
                            }}
                        />
                        <span
                            className="truncate"
                            style={{
                                color: roleColor ? `${roleColor}` : undefined
                            }}
                        >
                            {title}
                        </span>
                    </div>
                    <span className="text-[8px] text-primary/60 font-ocr">{memberCount}</span>
                </div>
                {/* Subtle line under section */}
                <div
                    className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent"
                    style={{
                        background: roleColor
                            ? `linear-gradient(to right, transparent, ${roleColor}40, transparent)`
                            : undefined
                    }}
                />
            </div>

            {/* Members list */}
            <div className="mt-2 space-y-1">
                {members.map((member) => {
                    // Get individual member's highest role color
                    const memberHighestRole = server?.roles && member.roles ?
                        Object.values(server.roles)
                            .filter((role: any) => {
                                const roleIdStr = role.roleId.toString()
                                const roleIdNum = parseInt(role.roleId)
                                return member.roles.includes(roleIdStr) || member.roles.includes(roleIdNum) || member.roles.includes(role.roleId)
                            })
                            .sort((a: any, b: any) => (b.orderId || b.position || 0) - (a.orderId || a.position || 0))
                        : []

                    // Find the highest priority role that has a non-default color
                    const defaultColor = Constants.DEFAULT_ROLE_COLOR
                    const roleWithColor = (memberHighestRole as any[]).find((role: any) => role.color && role.color !== defaultColor)
                    const memberRoleColor = roleWithColor?.color || roleColor

                    // Get the correct profile data for this member
                    const profile = getBotOrUserProfile(member.userId, activeServerId)

                    return (
                        <MemberItem
                            key={member.userId}
                            member={member}
                            profile={profile}
                            isOwner={member.userId === server?.ownerId}
                            roleColor={memberRoleColor}
                            server={server}
                            isBot={isBotUserId(member.userId, activeServerId)}
                        />
                    )
                })}
            </div>
        </div>
    )
}

export default function MemberList({ className, isVisible = true, style }: {
    className?: string
    isVisible?: boolean
    style?: React.CSSProperties
}) {
    const { activeServerId } = useGlobalState()
    const { servers, actions, profiles, bots, loadingMembers } = useSubspace()
    const [searchQuery, setSearchQuery] = useState("")
    const [loadingProfiles, setLoadingProfiles] = useState(false)

    // For display, we can use the server from the servers record
    const server = servers[activeServerId]

    // Get members from cached server data
    const regularMembers = server?.members && typeof server.members === 'object'
        ? Array.isArray(server.members)
            ? server.members
            : Object.values(server.members)
        : []

    // Get bots from cached server data and convert to member-like format
    const serverBots = server?.bots && typeof server.bots === 'object'
        ? Object.entries(server.bots).map(([botId, botInfo]) => ({
            userId: botId,
            serverId: server.serverId,
            nickname: (botInfo as any).nickname || undefined,
            roles: (botInfo as any).roles || ["1"], // Bots have roles now, default to @everyone
            joinedAt: (botInfo as any).joinedAt || "Unknown",
            isBot: true,
            approved: (botInfo as any).approved,
            process: (botInfo as any).process
        }))
        : []

    // Combine members and bots
    const members = [...regularMembers, ...serverBots]

    // Check if members are currently loading for the active server
    const isLoadingMembers = activeServerId ? loadingMembers.has(activeServerId) : false

    // Automatically fetch members when active server changes
    useEffect(() => {
        if (activeServerId && server && (!server.members || Object.keys(server.members).length === 0)) {
            // Fetch members if they don't exist
            actions.servers.getMembers(activeServerId)
        }
    }, [activeServerId, server, actions.servers])

    // Fetch profiles for all members in batches when members are loaded
    useEffect(() => {
        const fetchMemberProfiles = async () => {
            if (!activeServerId || !server || !members.length || loadingProfiles) return

            setLoadingProfiles(true)
            try {
                // Separate regular members and bots using helper function
                const regularMemberIds = members
                    .filter(member => !isBotUserId(member.userId, activeServerId))
                    .map(member => member.userId)
                    .filter(userId => !profiles[userId]) // Only fetch if not already cached

                const botMemberIds = members
                    .filter(member => isBotUserId(member.userId, activeServerId))
                    .map(member => member.userId)
                    .filter(userId => !bots[userId]) // Only fetch if not already cached

                // Fetch regular member profiles in batches of 10 through SDK
                if (regularMemberIds.length > 0) {
                    console.log(`👥 Starting to fetch ${regularMemberIds.length} member profiles...`)
                    const profileResults = await actions.profile.getBulk(regularMemberIds)
                    const successCount = Object.values(profileResults).filter(p => p !== null).length
                    console.log(`✅ Completed member profile fetching: ${successCount}/${regularMemberIds.length} successful`)
                }

                // Fetch bot profiles individually with delays (since they use different API)
                if (botMemberIds.length > 0) {
                    console.log(`🤖 Starting to fetch ${botMemberIds.length} bot profiles...`)
                    let botSuccessCount = 0

                    for (let i = 0; i < botMemberIds.length; i++) {
                        const botId = botMemberIds[i]
                        console.log(`🤖 Fetching bot profile ${i + 1}/${botMemberIds.length}: ${botId}`)

                        try {
                            await actions.bots.get(botId)
                            botSuccessCount++
                        } catch (error) {
                            console.error(`❌ Failed to fetch bot profile for ${botId}:`, error)
                        }

                        // Reduced delay between bot fetches for better performance
                        // Note: This delay is minimal to prevent overwhelming the system while maintaining good UX
                        if (i < botMemberIds.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 100))  // Reduced from 300ms to 100ms
                        }
                    }

                    console.log(`✅ Completed bot profile fetching: ${botSuccessCount}/${botMemberIds.length} successful`)
                }

                console.log(`🎉 All profile fetching completed for server ${activeServerId}`)
            } catch (error) {
                console.error('❌ Error fetching member profiles:', error)
            } finally {
                setLoadingProfiles(false)
            }
        }

        // Only run if we have members and aren't already loading profiles
        if (members.length > 0 && !loadingProfiles) {
            fetchMemberProfiles()
        }
    }, [members, activeServerId, server, actions.profile, actions.bots, profiles, bots, loadingProfiles])

    // Check if server has members loaded
    const hasMembers = activeServerId && server ? (server.members && Object.keys(server.members).length > 0) : false


    // Only show loading state if we have no members AND we're loading
    // Don't show loading when refreshing existing members (better UX)
    const shouldShowLoading = isLoadingMembers && members.length === 0

    // Filter members based on search query
    const filteredMembers = useMemo(() => {
        if (!searchQuery.trim()) return members

        return members.filter(member => {
            // Use getBotOrUserProfile helper to get the correct profile data
            const profile = getBotOrUserProfile(member.userId, activeServerId)
            // Standardized display name logic matching other components
            const displayName = member.isBot
                ? (member.nickname || (profile as any)?.primaryName || (profile as any)?.name || shortenAddress(member.userId))
                : (member.nickname || (profile as any)?.primaryName || shortenAddress(member.userId))
            const lowerQuery = searchQuery.toLowerCase()

            return displayName.toLowerCase().includes(lowerQuery) ||
                member.userId.toLowerCase().includes(lowerQuery)
        })
    }, [members, searchQuery, activeServerId])



    // Organize members by their ACTUAL roles - create sections for each role they have
    const organizedMembersByRole = useMemo(() => {
        const roleGroups: Record<string, { role: any | null; members: any[] }> = {}

        // Get ALL roles in the server
        const serverRoles = Object.values(server?.roles || {})

        // Initialize role groups for ALL roles (including @everyone)
        serverRoles.forEach((role: any) => {
            roleGroups[`role-${role.roleId.toString()}`] = { role, members: [] }
        })

        // Add "No Role" section for members without any roles at all
        roleGroups['no-role'] = { role: null, members: [] }

        // Categorize each member by their highest priority role (including bots)
        filteredMembers.forEach(member => {
            if (!member.roles || !Array.isArray(member.roles) || member.roles.length === 0) {
                roleGroups['no-role'].members.push(member)
                return
            }

            // Find which roles this member actually has
            const memberActualRoles = serverRoles.filter((role: any) => {
                const roleIdStr = role.roleId.toString()
                const roleIdNum = parseInt(role.roleId.toString())
                const memberRolesList = member.roles as (string | number)[]
                return memberRolesList.includes(roleIdStr) || memberRolesList.includes(roleIdNum)
            })

            if (memberActualRoles.length === 0) {
                roleGroups['no-role'].members.push(member)
                return
            }

            // Get the highest priority role (highest orderId) to determine primary categorization
            const sortedMemberRoles = memberActualRoles.sort((a: any, b: any) => (b.orderId || b.position || 0) - (a.orderId || a.position || 0))

            // Categorization: Always use the highest priority role (regardless of color)
            const primaryRole = sortedMemberRoles[0]
            const primaryKey = `role-${(primaryRole as any).roleId.toString()}`

            if (roleGroups[primaryKey]) {
                roleGroups[primaryKey].members.push(member)
            } else {
                roleGroups['no-role'].members.push(member)
            }
        })

        // Sort members within each role group based on profile completeness
        Object.values(roleGroups).forEach(group => {
            group.members.sort((a, b) => {
                // Use getBotOrUserProfile helper to get the correct profile data
                const profileA = getBotOrUserProfile(a.userId, activeServerId)
                const profileB = getBotOrUserProfile(b.userId, activeServerId)

                // Helper function to get member category (1-3, where 1 is highest priority)
                const getMemberCategory = (member: any, profile: any) => {
                    const hasPfp = profile?.pfp || profile?.primaryLogo
                    const hasName = member.nickname || (profile as any)?.primaryName || (profile as any)?.name

                    if (hasPfp && hasName) return 1 // Both pfp and name
                    if (hasName || hasPfp) return 2 // Either name or pfp (but not both)
                    return 3 // Neither name nor pfp
                }

                const categoryA = getMemberCategory(a, profileA)
                const categoryB = getMemberCategory(b, profileB)

                // First sort by category (1-4)
                if (categoryA !== categoryB) {
                    return categoryA - categoryB
                }

                // Within same category, sort alphabetically by display name
                const displayNameA = a.nickname || (profileA as any)?.primaryName || (profileA as any)?.name || shortenAddress(a.userId)
                const displayNameB = b.nickname || (profileB as any)?.primaryName || (profileB as any)?.name || shortenAddress(b.userId)
                return displayNameA.toLowerCase().localeCompare(displayNameB.toLowerCase())
            })
        })



        return roleGroups
    }, [filteredMembers, server?.roles, activeServerId])

    // Sort role groups by their actual role hierarchy (lower orderId = higher priority)
    const sortedRoleGroups = useMemo(() => {
        const groups = Object.entries(organizedMembersByRole)
            .filter(([key, group]) => group.members.length > 0) // Only show groups with members
            .sort(([keyA, groupA], [keyB, groupB]) => {
                // No role section always goes last
                if (keyA === 'no-role') return 1
                if (keyB === 'no-role') return -1

                // Sort by actual role orderId (higher orderId = higher hierarchy = appears first) - matches server-roles.tsx
                const roleA = groupA.role
                const roleB = groupB.role

                if (!roleA || !roleB) return 0

                return (roleB.orderId || roleB.position || 0) - (roleA.orderId || roleA.position || 0)
            })



        return groups
    }, [organizedMembersByRole])

    if (!server) {
        return (
            <div className={cn(
                "flex flex-col w-60 h-full py-4 px-3",
                "bg-gradient-to-b from-background via-background/95 to-background/90",
                "border-l border-border/50 backdrop-blur-sm",
                className
            )}>
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center animate-in fade-in-50 slide-in-from-bottom-4 duration-700">
                        <img src={alien} alt="alien" className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-ocr">NO SIGNAL DETECTED</p>
                    </div>
                </div>
            </div>
        )
    }

    if (shouldShowLoading) {
        return (
            <div className={cn(
                "flex flex-col w-60 h-full py-4 px-3",
                "bg-gradient-to-b from-background via-background/95 to-background/90",
                "border-l border-border/50 backdrop-blur-sm",
                className
            )}>
                <div className="flex items-center justify-center h-full text-primary">
                    <div className="text-center animate-in fade-in-50 slide-in-from-bottom-4 duration-700">
                        <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                        <p className="text-sm font-ocr">SCANNING FOR LIFE...</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div
            className={cn(
                "flex flex-col w-60 h-full relative",
                "bg-gradient-to-b from-background via-background/95 to-background/90",
                "border-l border-border/50 backdrop-blur-sm",
                "scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/40",
                // Alien pattern overlay
                "before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary)/0.03)_0%,transparent_50%)] before:pointer-events-none",
                !isVisible && "pointer-events-none",
                className
            )}
            style={style}
        >
            {/* Ambient alien glow at top */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16 bg-primary/5 rounded-full blur-2xl" />

            {/* Header with alien theme */}
            <div className="mb-4 p-4 flex flex-col justify-center items-start relative">
                <div className="flex items-center gap-3 w-full">
                    <h2 className="text-xs font-bold text-primary font-freecam tracking-wider">
                        LIFE FORMS
                    </h2>
                    <div className="flex items-center gap-2 ml-auto">
                        <span className="text-sm text-primary/60 font-ocr">
                            {server.memberCount || members.length}
                        </span>
                        {/* {hasMembers && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => actions.servers.refreshMembers(activeServerId)}
                                disabled={isLoadingMembers}
                                className="h-6 w-6 p-0 hover:bg-primary/10 text-primary/60 hover:text-primary/80 transition-colors"
                                title="Refresh members"
                            >
                                <Loader2 className={`w-3 h-3 ${isLoadingMembers ? 'animate-spin' : ''}`} />
                            </Button>
                        )} */}
                    </div>
                </div>
                <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent absolute bottom-0" />
            </div>

            {/* Search with alien styling */}
            <div className="px-4 mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/60" />
                    <Input
                        placeholder="SCAN FOR ENTITIES..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={cn(
                            "pl-9 h-9 bg-primary/5 border-primary/20 focus:border-primary/50 font-ocr text-xs",
                            "placeholder:text-primary/30 placeholder:top-0.5 placeholder:relative",
                            "focus-visible:ring-2 focus-visible:ring-primary/20 rounded-lg",
                            "leading-9"
                        )}
                    />
                </div>
            </div>

            {/* Members list organized by roles */}
            <div className="flex-1 overflow-y-auto space-y-2 px-2">
                {filteredMembers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-center">
                        <img src={alienGreen} alt="alien" className="w-8 h-8 mb-2 opacity-40" />
                        <p className="text-sm text-primary/60 font-ocr">
                            {searchQuery ? "NO ENTITIES FOUND" : "NO LIFE DETECTED"}
                        </p>
                        {searchQuery && (
                            <p className="text-xs text-primary/40 mt-1 font-ocr">
                                ADJUST SCAN PARAMETERS
                            </p>
                        )}
                    </div>
                ) : (
                    <>
                        {sortedRoleGroups.map(([key, group]) => {
                            const sectionTitle = group.role ? group.role.name.toUpperCase() : "UNCLASSIFIED"

                            return (
                                <MemberSection
                                    key={key}
                                    title={sectionTitle}
                                    members={group.members}
                                    profiles={profiles}
                                    bots={bots}
                                    isOwnerSection={false}
                                    roleColor={group.role?.color}
                                    server={server}
                                    activeServerId={activeServerId}
                                />
                            )
                        })}
                    </>
                )}
            </div>

            {/* Ambient alien glow at bottom */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-24 h-12 bg-primary/3 rounded-full blur-xl" />


        </div>
    )
}