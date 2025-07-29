import React, { useEffect, useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    X,
    Search,
    Crown,
    Users,
    ChevronDown,
    ChevronUp,
    MoreHorizontal
} from "lucide-react"
import { useGlobalState } from "@/hooks/use-global-state"
import { useSubspace } from "@/hooks/use-subspace"
import { shortenAddress } from "@/lib/utils"
import alien from "@/assets/subspace/alien-black.svg"
import ProfilePopover from "./profile-popover"
import type { Member, Role } from "@subspace-protocol/sdk"

interface MobileMemberSheetProps {
    isOpen: boolean
    onClose: () => void
    className?: string
}

export default function MobileMemberSheet({
    isOpen,
    onClose,
    className
}: MobileMemberSheetProps) {
    const { activeServerId } = useGlobalState()
    const { servers, profiles } = useSubspace()
    const [searchQuery, setSearchQuery] = useState("")
    const [isMinimized, setIsMinimized] = useState(false)

    // Get current server
    const server = servers[activeServerId]

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown)
            // Prevent body scroll when overlay is open
            document.body.style.overflow = 'hidden'
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.body.style.overflow = 'unset'
        }
    }, [isOpen, onClose])

    // Handle backdrop click
    const handleBackdropClick = (event: React.MouseEvent) => {
        if (event.target === event.currentTarget) {
            onClose()
        }
    }

    // Organize members by roles (reused logic from member-list.tsx)
    const { membersByRole, filteredMembers } = useMemo(() => {
        if (!server || !server.members) {
            return { membersByRole: new Map(), filteredMembers: [] }
        }

        // Convert members to array if it's an object
        let membersArray: any[] = []
        if (Array.isArray(server.members)) {
            membersArray = server.members
        } else if (typeof server.members === 'object') {
            membersArray = Object.entries(server.members).map(([userId, member]) => ({
                userId,
                ...member
            }))
        }

        // Filter members by search query
        const filtered = membersArray.filter(member => {
            if (!searchQuery.trim()) return true

            const profile = profiles[member.userId]
            const displayName = member.nickname || profile?.primaryName || member.userId

            return displayName.toLowerCase().includes(searchQuery.toLowerCase())
        })

        // Group members by role
        const roleGroups = new Map<string, any[]>()

        // Add members without specific roles to "Members" group
        const membersGroup: any[] = []

        for (const member of filtered) {
            // For now, we'll put everyone in the members group
            // In a full implementation, you'd check member.roles and group accordingly
            membersGroup.push(member)
        }

        if (membersGroup.length > 0) {
            roleGroups.set('Members', membersGroup)
        }

        return { membersByRole: roleGroups, filteredMembers: filtered }
    }, [server, profiles, searchQuery])

    if (!isOpen) return null

    const memberCount = filteredMembers.length
    const totalMembers = server?.memberCount || Object.keys(server?.members || {}).length

    return (
        <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0"
                )}
                onClick={handleBackdropClick}
            />

            {/* Bottom sheet */}
            <div
                className={cn(
                    "fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-2xl",
                    "transform transition-transform duration-300 ease-out",
                    "flex flex-col rounded-t-2xl overflow-hidden",
                    isOpen ? "translate-y-0" : "translate-y-full",
                    isMinimized ? "h-20" : "h-[70vh]",
                    className
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border/50 bg-background">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Users className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                            <h2 className="text-lg font-semibold text-foreground font-ocr truncate">
                                Members
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {memberCount} of {totalMembers} members
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setIsMinimized(!isMinimized)}
                            className="h-10 w-10 hover:bg-muted/50 transition-colors"
                            aria-label={isMinimized ? "Expand member list" : "Minimize member list"}
                        >
                            {isMinimized ? (
                                <ChevronUp className="w-5 h-5" />
                            ) : (
                                <ChevronDown className="w-5 h-5" />
                            )}
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={onClose}
                            className="h-10 w-10 hover:bg-muted/50 transition-colors"
                            aria-label="Close member list"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* Content (hidden when minimized) */}
                {!isMinimized && (
                    <>
                        {/* Search */}
                        <div className="p-4 border-b border-border/50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search members..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 h-10"
                                />
                            </div>
                        </div>

                        {/* Member List */}
                        <ScrollArea className="flex-1">
                            <div className="p-4 space-y-6">
                                {Array.from(membersByRole.entries()).map(([roleName, members]) => (
                                    <div key={roleName} className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                {roleName} — {members.length}
                                            </h3>
                                        </div>

                                        <div className="space-y-1">
                                            {members.map((member) => (
                                                <MobileMemberItem
                                                    key={member.userId}
                                                    member={member}
                                                    profile={profiles[member.userId]}
                                                    server={server}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {membersByRole.size === 0 && (
                                    <div className="flex items-center justify-center h-32">
                                        <p className="text-muted-foreground">
                                            {searchQuery ? 'No members found' : 'No members to display'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </>
                )}
            </div>
        </div>
    )
}

// Mobile member item component
interface MobileMemberItemProps {
    member: any
    profile?: any & { primaryName: string, primaryLogo: string }
    server?: any
}

function MobileMemberItem({ member, profile, server }: MobileMemberItemProps) {
    const displayName = member.nickname || profile?.primaryName || shortenAddress(member.userId)
    const isOwner = server?.ownerId === member.userId

    return (
        <div className="relative group">
            <ProfilePopover userId={member.userId} side="top" align="start">
                <Button
                    variant="ghost"
                    size="lg"
                    className={cn(
                        "w-full h-14 px-4 justify-start text-sm transition-all duration-200 relative overflow-hidden cursor-pointer",
                        "hover:bg-primary/10 rounded-xl border border-transparent hover:border-primary/20",
                        "text-muted-foreground hover:text-foreground font-medium"
                    )}
                >
                    <div className="flex items-center gap-3 w-full relative z-10">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                            <MemberAvatar userId={member.userId} profile={profile} size="md" />
                        </div>

                        {/* Member info */}
                        <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground truncate">
                                    {displayName}
                                </span>
                                {isOwner && (
                                    <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                                )}
                            </div>

                            {member.nickname && profile?.primaryName && (
                                <p className="text-xs text-muted-foreground truncate">
                                    {profile.primaryName}
                                </p>
                            )}
                        </div>

                        {/* Action button */}
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                                e.stopPropagation()
                                // Handle member actions
                            }}
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </div>
                </Button>
            </ProfilePopover>
        </div>
    )
}

// Mobile member avatar component
const MemberAvatar = ({
    userId,
    profile,
    size = "sm"
}: {
    userId: string;
    profile?: any;
    size?: "sm" | "md" | "lg";
}) => {
    const sizeClasses = {
        sm: "w-8 h-8 text-xs",
        md: "w-10 h-10 text-sm",
        lg: "w-12 h-12 text-base"
    }

    return (
        <div className="relative flex-shrink-0">
            <div className={cn(
                "relative rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/30",
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
        </div>
    )
} 