import { useGlobalState } from "@/hooks/use-global-state";
import { useSubspace } from "@/hooks/use-subspace";
import { cn, shortenAddress } from "@/lib/utils";
import { Constants } from "@/lib/constants";
import type { Member, Role } from "@subspace-protocol/sdk";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Crown, Users, Search, MoreHorizontal, UsersRound, Loader2 } from "lucide-react";
import alien from "@/assets/subspace/alien-black.svg";
import alienGreen from "@/assets/subspace/alien-green.svg";
import ProfilePopover from "./profile-popover";

// Avatar Component with alien theme
const MemberAvatar = ({
    userId,
    profile,
    size = "sm"
}: {
    userId: string;
    profile?: any;
    size?: "xs" | "sm" | "md";
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
                {profile?.pfp ? (
                    <img
                        src={`https://arweave.net/${profile.pfp}`}
                        alt={profile.primaryName || userId}
                        className="w-full h-full object-cover"
                    />
                ) : profile?.primaryLogo ? (
                    <img
                        src={`https://arweave.net/${profile.primaryLogo}`}
                        alt={profile.primaryName || userId}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                        <img src={alien} alt="alien" className="w-1/2 h-1/2 opacity-60" />
                    </div>
                )}
            </div>
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
    server
}: {
    member: any;
    profile?: any & { primaryName: string, primaryLogo: string };
    isOwner?: boolean;
    roleColor?: string;
    server?: any;
}) => {
    const [isHovered, setIsHovered] = useState(false)

    const displayName = member.nickname || profile?.primaryName || shortenAddress(member.userId)

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
                            <MemberAvatar userId={member.userId} profile={profile} size="sm" />
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

                                {/* Owner indicator */}
                                {isOwner && (
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
    isOwnerSection = false,
    roleColor,
    server
}: {
    title: string;
    members: any[];
    profiles: Record<string, any & { primaryName: string, primaryLogo: string }>;
    isOwnerSection?: boolean;
    roleColor?: string;
    server?: any;
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

                    return (
                        <MemberItem
                            key={member.userId}
                            member={member}
                            profile={profiles[member.userId]}
                            isOwner={member.userId === server?.ownerId}
                            roleColor={memberRoleColor}
                            server={server}
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
    const { servers, actions, profiles } = useSubspace()
    const [searchQuery, setSearchQuery] = useState("")
    const [loadingProfiles, setLoadingProfiles] = useState(false)

    // For display, we can use the server from the servers record
    const server = servers[activeServerId]

    // Get members from cached server data
    const members = server?.members && Array.isArray(server.members)
        ? server.members
        : server?.members && typeof server.members === 'object'
            ? Object.values(server.members)
            : []


    const isLoadingMembers = (servers[activeServerId] as any)?.membersLoading || false



    // Only show loading state if we have no members AND we're loading
    // Don't show loading when refreshing existing members (better UX)
    const shouldShowLoading = isLoadingMembers && members.length === 0

    // Filter members based on search query
    const filteredMembers = useMemo(() => {
        if (!searchQuery.trim()) return members

        return members.filter(member => {
            const profile = profiles[member.userId]
            const displayName = member.nickname || profile?.primaryName || shortenAddress(member.userId)
            const lowerQuery = searchQuery.toLowerCase()

            return displayName.toLowerCase().includes(lowerQuery) ||
                member.userId.toLowerCase().includes(lowerQuery)
        })
    }, [members, searchQuery, profiles])



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

        // Categorize each member by their highest priority role
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
            const primaryKey = `role-${primaryRole.roleId.toString()}`

            if (roleGroups[primaryKey]) {
                roleGroups[primaryKey].members.push(member)
            } else {
                roleGroups['no-role'].members.push(member)
            }
        })

        // Sort members within each role group alphabetically
        Object.values(roleGroups).forEach(group => {
            group.members.sort((a, b) => {
                const profileA = profiles[a.userId]
                const profileB = profiles[b.userId]
                const displayNameA = a.nickname || profileA?.primaryName || shortenAddress(a.userId)
                const displayNameB = b.nickname || profileB?.primaryName || shortenAddress(b.userId)
                return displayNameA.toLowerCase().localeCompare(displayNameB.toLowerCase())
            })
        })



        return roleGroups
    }, [filteredMembers, server?.roles, profiles])

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
                    <span className="text-sm text-primary/60 ml-auto font-ocr">
                        {server.memberCount || members.length}
                    </span>
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
                                    isOwnerSection={false}
                                    roleColor={group.role?.color}
                                    server={server}
                                />
                            )
                        })}
                    </>
                )}
            </div>

            {/* Ambient alien glow at bottom */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-24 h-12 bg-primary/3 rounded-full blur-xl" />

            {/* Decorative alien elements */}
            <div className="absolute top-1/4 right-2 w-1 h-1 bg-primary/30 rounded-full animate-pulse" />
            <div className="absolute top-1/2 right-4 w-0.5 h-0.5 bg-primary/20 rounded-full animate-pulse delay-1000" />
            <div className="absolute bottom-1/3 right-3 w-1.5 h-1.5 bg-primary/10 rounded-full animate-pulse delay-2000" />
        </div>
    )
}