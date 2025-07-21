import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Search,
    MoreHorizontal,
    UserPlus,
    Shield,
    Ban,
    UserX,
    Calendar,
    MessageSquare
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Member {
    id: string
    username: string
    displayName?: string
    avatar?: string
    roles: string[]
    joinedAt: string
    lastActive: string
    status: "online" | "idle" | "dnd" | "offline"
}

interface Role {
    id: string
    name: string
    color: string
}

const mockRoles: Role[] = [
    { id: "1", name: "@everyone", color: "#99AAB5" },
    { id: "2", name: "Core", color: "#1ABC9C" },
    { id: "3", name: "Moderators", color: "#3498DB" },
    { id: "4", name: "Developer", color: "#E74C3C" },
    { id: "5", name: "Member", color: "#95A5A6" },
]

const mockMembers: Member[] = [
    {
        id: "1",
        username: "alice_dev",
        displayName: "Alice",
        avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150",
        roles: ["2", "4"], // Core, Developer
        joinedAt: "2023-01-15",
        lastActive: "2 minutes ago",
        status: "online"
    },
    {
        id: "2",
        username: "bob_mod",
        displayName: "Bob",
        roles: ["3"], // Moderators
        joinedAt: "2023-02-10",
        lastActive: "1 hour ago",
        status: "idle"
    },
    {
        id: "3",
        username: "charlie_user",
        displayName: "Charlie",
        roles: ["5"], // Member
        joinedAt: "2023-06-20",
        lastActive: "Yesterday",
        status: "offline"
    },
    {
        id: "4",
        username: "diana_core",
        displayName: "Diana",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
        roles: ["2", "3"], // Core, Moderators  
        joinedAt: "2023-01-05",
        lastActive: "30 minutes ago",
        status: "dnd"
    },
    {
        id: "5",
        username: "eve_dev",
        displayName: "Eve",
        roles: ["4"], // Developer
        joinedAt: "2023-03-15",
        lastActive: "5 minutes ago",
        status: "online"
    }
]

export default function ServerMembers() {
    const [members, setMembers] = useState(mockMembers)
    const [searchQuery, setSearchQuery] = useState("")
    const [roleFilter, setRoleFilter] = useState("all")
    const [statusFilter, setStatusFilter] = useState("all")

    const getRoleColor = (roleId: string) => {
        return mockRoles.find(r => r.id === roleId)?.color || "#99AAB5"
    }

    const getRoleName = (roleId: string) => {
        return mockRoles.find(r => r.id === roleId)?.name || "Unknown"
    }

    const getHighestRole = (member: Member) => {
        if (member.roles.length === 0) return mockRoles[0] // @everyone
        const memberRoles = member.roles.map(roleId => mockRoles.find(r => r.id === roleId)).filter(Boolean)
        return memberRoles.sort((a, b) => parseInt(b!.id) - parseInt(a!.id))[0] || mockRoles[0]
    }

    const filteredMembers = members.filter(member => {
        const matchesSearch = member.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.displayName?.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesRole = roleFilter === "all" || member.roles.includes(roleFilter)
        const matchesStatus = statusFilter === "all" || member.status === statusFilter

        return matchesSearch && matchesRole && matchesStatus
    })

    const getStatusColor = (status: Member["status"]) => {
        switch (status) {
            case "online": return "#43B581"
            case "idle": return "#FAA61A"
            case "dnd": return "#F04747"
            case "offline": return "#747F8D"
        }
    }

    const getStatusLabel = (status: Member["status"]) => {
        switch (status) {
            case "online": return "Online"
            case "idle": return "Away"
            case "dnd": return "Do Not Disturb"
            case "offline": return "Offline"
        }
    }

    const kickMember = (memberId: string) => {
        setMembers(members.filter(m => m.id !== memberId))
        console.log("Kicked member:", memberId)
    }

    const banMember = (memberId: string) => {
        setMembers(members.filter(m => m.id !== memberId))
        console.log("Banned member:", memberId)
    }

    return (
        <div className="p-6 space-y-6">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary)/0.02)_0%,transparent_50%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(var(--primary)/0.02)_0%,transparent_50%)] pointer-events-none" />

            <div className="relative z-10 max-w-6xl mx-auto space-y-6">
                {/* Filters */}
                <Card className="border-primary/30 shadow-lg backdrop-blur-sm relative">
                    {/* Card glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-xl pointer-events-none" />

                    <CardHeader className="relative z-10 pb-3">
                        <CardTitle className="font-freecam text-primary tracking-wide">MEMBER SEARCH & FILTERS</CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-primary/60" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search members..."
                                    className="pl-10 font-ocr bg-background/80 border-primary/30 focus:border-primary focus:ring-primary/20"
                                />
                            </div>
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger className="w-full sm:w-48 font-ocr bg-background/80 border-primary/30 focus:border-primary focus:ring-primary/20">
                                    <SelectValue placeholder="Filter by role" />
                                </SelectTrigger>
                                <SelectContent className="border-primary/20 bg-background/95 backdrop-blur-sm">
                                    <SelectItem value="all" className="font-ocr">All Roles</SelectItem>
                                    {mockRoles.slice(1).map((role) => (
                                        <SelectItem key={role.id} value={role.id} className="font-ocr">
                                            {role.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full sm:w-48 font-ocr bg-background/80 border-primary/30 focus:border-primary focus:ring-primary/20">
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent className="border-primary/20 bg-background/95 backdrop-blur-sm">
                                    <SelectItem value="all" className="font-ocr">All Status</SelectItem>
                                    <SelectItem value="online" className="font-ocr">Online</SelectItem>
                                    <SelectItem value="idle" className="font-ocr">Away</SelectItem>
                                    <SelectItem value="dnd" className="font-ocr">Do Not Disturb</SelectItem>
                                    <SelectItem value="offline" className="font-ocr">Offline</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Members List */}
                <Card className="border-primary/30 shadow-lg backdrop-blur-sm relative">
                    {/* Card glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-xl pointer-events-none" />

                    <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-3">
                        <CardTitle className="font-freecam text-primary tracking-wide">
                            MEMBERS - {filteredMembers.length}
                        </CardTitle>
                        <Button className="font-freecam tracking-wide">
                            <UserPlus className="w-4 h-4 mr-2" />
                            INVITE MEMBERS
                        </Button>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="space-y-2">
                            {filteredMembers.map((member) => {
                                const highestRole = getHighestRole(member)

                                return (
                                    <div
                                        key={member.id}
                                        className="flex items-center justify-between p-4 rounded-lg border border-primary/20 hover:bg-primary/5 transition-colors hover:border-primary/30"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <Avatar className="w-10 h-10 ring-1 ring-primary/20">
                                                    <AvatarImage src={member.avatar} />
                                                    <AvatarFallback className="bg-primary/10 text-primary font-ocr">
                                                        {(member.displayName || member.username)[0].toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div
                                                    className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ring-1 ring-black/20"
                                                    style={{ backgroundColor: getStatusColor(member.status) }}
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-ocr font-medium text-foreground">
                                                        {member.displayName || member.username}
                                                    </span>
                                                    {member.displayName && (
                                                        <span className="text-sm text-primary/60 font-ocr">
                                                            @{member.username}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-primary/60 font-ocr">
                                                    <div
                                                        className="w-2 h-2 rounded-full"
                                                        style={{ backgroundColor: getStatusColor(member.status) }}
                                                    />
                                                    {getStatusLabel(member.status)}
                                                    <span>•</span>
                                                    <Calendar className="w-3 h-3" />
                                                    Joined {new Date(member.joinedAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-wrap gap-1">
                                                {member.roles.slice(0, 3).map((roleId) => (
                                                    <Badge
                                                        key={roleId}
                                                        variant="secondary"
                                                        className="text-xs font-ocr border"
                                                        style={{
                                                            backgroundColor: `${getRoleColor(roleId)}20`,
                                                            color: getRoleColor(roleId),
                                                            borderColor: `${getRoleColor(roleId)}40`
                                                        }}
                                                    >
                                                        {getRoleName(roleId)}
                                                    </Badge>
                                                ))}
                                                {member.roles.length > 3 && (
                                                    <Badge variant="secondary" className="text-xs font-ocr bg-primary/10 text-primary border-primary/30">
                                                        +{member.roles.length - 3}
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="text-sm text-primary/60 font-ocr">
                                                {member.lastActive}
                                            </div>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="hover:bg-primary/10 text-primary/60 hover:text-primary">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="border-primary/20 bg-background/95 backdrop-blur-sm">
                                                    <DropdownMenuItem className="font-ocr hover:bg-primary/10 focus:bg-primary/10">
                                                        <MessageSquare className="w-4 h-4 mr-2" />
                                                        Send Message
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="font-ocr hover:bg-primary/10 focus:bg-primary/10">
                                                        <Shield className="w-4 h-4 mr-2" />
                                                        Manage Roles
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="bg-primary/20" />
                                                    <DropdownMenuItem
                                                        className="font-ocr text-red-500 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-500"
                                                        onClick={() => kickMember(member.id)}
                                                    >
                                                        <UserX className="w-4 h-4 mr-2" />
                                                        Kick Member
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="font-ocr text-red-500 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-500"
                                                        onClick={() => banMember(member.id)}
                                                    >
                                                        <Ban className="w-4 h-4 mr-2" />
                                                        Ban Member
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                )
                            })}

                            {filteredMembers.length === 0 && (
                                <div className="text-center py-8 text-primary/60 font-ocr">
                                    No members found matching your filters
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
