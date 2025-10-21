import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useGlobalState } from "@/hooks/use-global-state"
import { useProfile, usePrimaryName, useServer, useSubspaceActions } from "@/hooks/use-subspace"
import { useServerDialogs } from "@/hooks/use-server-dialogs"
import { Users, MessageSquare, UserCheck, UserX, Check, X, Send, Mail, UserPlus } from "lucide-react"
import alienGreen from "@/assets/subspace/alien-green.svg"
import { useWallet } from "@/hooks/use-wallet"
import { ProfileAvatar, ProfilePopover } from "@/components/profile"
import { shortenAddress } from "@/lib/utils"
import React from "react"
import { Link } from "react-router"

function AppWelcome() {
    const { address } = useWallet()
    const myProfile = useProfile(address)
    const { actions: dialogActions } = useServerDialogs()

    const friends = myProfile ? myProfile.friends : { accepted: {}, sent: {}, received: {} }
    const acceptedIds = Object.keys(friends.accepted)
    const sentIds = Object.keys(friends.sent)
    const receivedIds = Object.keys(friends.received)

    return <FriendsView
        acceptedIds={acceptedIds}
        sentIds={sentIds}
        receivedIds={receivedIds}
    />
}

function FriendCard({ userId, type }: { userId: string, type: "accepted" | "sent" | "received" }) {
    const profile = useProfile(userId)
    const primaryName = usePrimaryName(userId)
    const actions = useSubspaceActions()
    const { address } = useWallet()
    const [loading, setLoading] = React.useState(false)

    React.useEffect(() => {
        if (!profile) {
            actions.profiles.get(userId)
        }
    }, [userId, profile])

    const handleAccept = async () => {
        setLoading(true)
        try {
            await actions.profiles.acceptFriend(userId)
            await actions.profiles.get(address)
            window.toast?.success("Friend request accepted!")
        } catch (error) {
            console.error("Failed to accept friend request:", error)
            window.toast?.error("Failed to accept friend request. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const handleReject = async () => {
        setLoading(true)
        try {
            await actions.profiles.rejectFriend(userId)
            await actions.profiles.get(address)
            window.toast?.success("Friend request rejected")
        } catch (error) {
            console.error("Failed to reject friend request:", error)
            window.toast?.error("Failed to reject friend request. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const handleRemove = async () => {
        setLoading(true)
        try {
            await actions.profiles.removeFriend(userId)
            await actions.profiles.get(address)
            window.toast?.success("Friend removed")
        } catch (error) {
            console.error("Failed to remove friend:", error)
            window.toast?.error("Failed to remove friend. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const displayName = primaryName || shortenAddress(userId)

    return (
        <Card className="group bg-secondary/20 transition-all duration-200 !p-0">
            <CardContent className="m-0 p-2">
                <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <ProfilePopover userId={userId} side="bottom" align="start" sideOffset={2}>
                        <ProfileAvatar tx={profile?.pfp} className="w-10 h-10" />
                    </ProfilePopover>

                    {/* User Info */}
                    {type == "accepted" ? (
                        <Link to={`/app/dm/${userId}`} className="w-full">
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-primary truncate">
                                    {displayName}
                                </div>
                                <div className="text-xs text-muted-foreground truncate font-mono">
                                    {primaryName ? shortenAddress(userId) : "No primary name"}
                                </div>
                            </div>
                        </Link>
                    ) : <ProfilePopover userId={userId} side="bottom" align="start" sideOffset={2}>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-primary truncate">
                                {displayName}
                            </div>
                            <div className="text-xs text-muted-foreground truncate font-mono">
                                {primaryName ? shortenAddress(userId) : "No primary name"}
                            </div>
                        </div>
                    </ProfilePopover>}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        {type === "received" && (
                            <>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={handleAccept}
                                    disabled={loading}
                                    className="h-9 w-9 bg-green-500/20 hover:bg-green-500/30 text-green-400 hover:text-green-300"
                                    title="Accept"
                                >
                                    {loading ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border border-current border-t-transparent" />
                                    ) : (
                                        <Check className="h-4 w-4" />
                                    )}
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={handleReject}
                                    disabled={loading}
                                    className="h-9 w-9 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300"
                                    title="Reject"
                                >
                                    {loading ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border border-current border-t-transparent" />
                                    ) : (
                                        <X className="h-4 w-4" />
                                    )}
                                </Button>
                            </>
                        )}
                        {type === "sent" && (
                            <div className="flex items-center gap-2">
                                <div className="text-xs text-muted-foreground flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded">
                                    <Send className="h-3 w-3" />
                                    Pending
                                </div>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={handleReject}
                                    disabled={loading}
                                    className="h-9 w-9 hover:bg-red-500/20 hover:text-red-400"
                                    title="Cancel Request"
                                >
                                    {loading ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border border-current border-t-transparent" />
                                    ) : (
                                        <X className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        )}
                        {type === "accepted" && (
                            <>
                                <Button
                                    size="icon"
                                    variant="destructive"
                                    onClick={handleRemove}
                                    disabled={loading}
                                    className="h-9 w-9 !bg-transparent hover:!bg-red-300/20 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Remove Friend"
                                >
                                    {loading ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border border-current border-t-transparent" />
                                    ) : (
                                        <UserX className="h-4 w-4" />
                                    )}
                                </Button>
                                <Link to={`/app/dm/${userId}`}>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-9 w-9 hover:bg-primary/20 text-primary"
                                        title="Message"
                                    >
                                        <MessageSquare className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

// TempConversationCard component removed - temporary DMs are no longer supported

function FriendsView({ acceptedIds, sentIds, receivedIds }: {
    acceptedIds: string[],
    sentIds: string[],
    receivedIds: string[]
}) {
    const { address } = useWallet()

    return (
        <div className="flex-1 flex flex-col bg-gradient-to-br from-background via-background to-primary/5 min-h-0">
            <div className="mx-auto w-full h-full flex flex-col">
                {/* Tabs Interface */}
                <Tabs defaultValue="friends" className="w-full h-full flex flex-col">
                    {/* Header with Tabs */}
                    <div className="border-b p-1.5 pl-4 flex items-center gap-4 font-ocr w-full">
                        <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 shrink-0 text-muted-foreground" />
                            <span className="text-muted-foreground">Friends</span>
                        </div>

                        <TabsList className="w-fit h-8 bg-transparent gap-4 ml-4">
                            <TabsTrigger value="friends" className="flex items-center gap-2 h-7 cursor-pointer">
                                <Users className="h-4 w-4" />
                                All
                            </TabsTrigger>
                            <TabsTrigger value="pending" className="flex items-center gap-2 h-7 cursor-pointer">
                                <UserPlus className="h-4 w-4" />
                                Pending
                                {receivedIds.length > 0 && (
                                    <span className="ml-1 bg-destructive text-primary-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center">
                                        {receivedIds.length}
                                    </span>
                                )}
                            </TabsTrigger>
                            {/* Temporary tab removed - temporary DMs are no longer supported */}
                        </TabsList>
                    </div>

                    {/* Friends Tab */}
                    <TabsContent value="friends" className="mt-2 px-0 w-full flex-1 flex flex-col min-h-0">
                        <div className="space-y-2 w-full flex-1 overflow-y-auto px-0">
                            {acceptedIds.length > 0 ? (<div className="px-4 space-y-2">
                                {acceptedIds.map(id => (
                                    <FriendCard key={id} userId={id} type="accepted" />
                                ))}
                            </div>
                            ) : (
                                <>
                                    <div className="w-full h-full flex items-center justify-center p-8 bg-gradient-to-br from-background via-background to-primary/5">
                                        <div className="max-w-2xl mx-auto text-center space-y-8 animate-in fade-in-50 duration-700">
                                            {/* Hero Section */}
                                            <div className="space-y-6">
                                                <div className="relative">
                                                    <img
                                                        src={alienGreen}
                                                        alt="Subspace"
                                                        className="w-16 h-24 mx-auto opacity-90 animate-breathe"
                                                    />
                                                    <div className="absolute inset-0 bg-primary/20 w-32 mx-auto rounded-full blur-3xl scale-75 animate-smooth-pulse" />
                                                </div>

                                                <div className="space-y-3">
                                                    <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent font-ocr">
                                                        Welcome to Subspace <span className="text-sm -ml-6">(beta)</span>
                                                    </h1>
                                                    <p className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
                                                        Your decentralized communication hub. Connect with communities, share ideas, and explore cyberspace.
                                                    </p>
                                                </div>
                                            </div>


                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </TabsContent>

                    {/* Pending Tab */}
                    <TabsContent value="pending" className="mt-2 px-4 w-full flex-1 flex flex-col min-h-0">
                        <div className="space-y-4 w-full flex-1 overflow-y-auto">
                            {/* Received Requests Section */}
                            {receivedIds.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 px-2 py-1">
                                        <Mail className="h-4 w-4 text-green-400" />
                                        <span className="text-sm font-semibold text-green-400">
                                            Received Requests
                                        </span>
                                        <span className="text-xs  px-1.5 py-0.5 rounded">
                                            {receivedIds.length}
                                        </span>
                                    </div>
                                    {receivedIds.map(id => (
                                        <FriendCard key={id} userId={id} type="received" />
                                    ))}
                                </div>
                            )}

                            {/* Sent Requests Section */}
                            {sentIds.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 px-2 py-1">
                                        <Send className="h-4 w-4 text-primary/70" />
                                        <span className="text-sm font-semibold text-primary/70">
                                            Sent Requests
                                        </span>
                                        <span className="text-xs px-1.5 py-0.5 rounded">
                                            {sentIds.length}
                                        </span>
                                    </div>
                                    {sentIds.map(id => (
                                        <FriendCard key={id} userId={id} type="sent" />
                                    ))}
                                </div>
                            )}

                            {/* Empty State for Pending */}
                            {receivedIds.length === 0 && sentIds.length === 0 && (
                                <div className="text-center py-8">
                                    <UserPlus className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">No pending requests</h3>
                                    <p className="text-xs text-muted-foreground">
                                        All friend requests have been handled
                                    </p>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* Temporary Conversations Tab removed - temporary DMs are no longer supported */}
                </Tabs>
            </div>
        </div>
    )
}

export default function Welcome() {
    const { activeServerId } = useGlobalState()
    const activeServer = useServer(activeServerId)

    // Scenario 1: No server active (app welcome)
    if (!activeServer || !activeServerId) {
        return <AppWelcome />
    }

    // Scenario 2: Server active but no channel selected (server welcome)
    const serverIcon = activeServer.profile?.pfp ? `https://arweave.net/${activeServer.profile.pfp}` : null
    const serverName = activeServer.profile?.name || "Unknown Server"
    const serverDescription = activeServer.profile?.description
    const memberCount = activeServer.member_count || 0

    return (
        <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-background via-background to-primary/5">
            <div className="max-w-2xl mx-auto text-center space-y-8 animate-in fade-in-50 duration-700">
                {/* Server Hero */}
                <div className="space-y-6">
                    <div className="relative">
                        <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-primary/20 shadow-2xl">
                            {serverIcon ? (
                                <img
                                    src={serverIcon}
                                    alt={serverName}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                                    <span className="text-4xl font-bold text-primary">
                                        {serverName.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="absolute inset-0 bg-primary/10 w-32 mx-auto rounded-full blur-3xl scale-75 animate-smooth-pulse" />
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent font-ocr">
                            Welcome to {serverName}
                        </h1>
                        {serverDescription && (
                            <p className="text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
                                {serverDescription}
                            </p>
                        )}
                    </div>
                </div>

                {/* Server Stats or Quick Actions */}
                <div className="grid md:grid-cols-3 gap-4 mt-8">
                    <div className="text-center space-y-2">
                        <div className="text-2xl font-bold text-primary">
                            {Object.keys(activeServer.channels || {}).length}
                        </div>
                        <div className="text-sm text-muted-foreground">Channels</div>
                    </div>
                    <div className="text-center space-y-2">
                        <div className="text-2xl font-bold text-primary">
                            {memberCount}
                        </div>
                        <div className="text-sm text-muted-foreground">Members</div>
                    </div>
                    <div className="text-center space-y-2">
                        <div className="text-2xl font-bold text-primary">
                            {Object.keys(activeServer.roles || {}).length}
                        </div>
                        <div className="text-sm text-muted-foreground">Roles</div>
                    </div>
                </div>

                <div className="text-sm text-muted-foreground">
                    Open a channel from the left sidebar to start chatting.
                </div>
            </div>
        </div>
    )
}