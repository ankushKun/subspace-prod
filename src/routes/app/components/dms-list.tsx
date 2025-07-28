import { useGlobalState } from "@/hooks/use-global-state";
import { useSubspace } from "@/hooks/use-subspace";
import { cn } from "@/lib/utils";
import { useState, useMemo, useEffect } from "react";
import { MessageCircle, UserPlus, Users, Check, X, Plus, Search, Loader2, User, Hash } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useWallet } from "@/hooks/use-wallet";
import type { ExtendedFriend } from "@/hooks/use-subspace";

export default function DmsList({ className }: { className?: string }) {
    const { activeFriendId, actions } = useGlobalState()
    const { friends, dmConversations, profile, actions: subspaceActions } = useSubspace()
    const navigate = useNavigate()
    const { address, connected } = useWallet()

    // Track previous address to detect changes
    const [previousAddress, setPreviousAddress] = useState<string>(address || "")

    const [addFriendOpen, setAddFriendOpen] = useState(false)
    const [friendAddress, setFriendAddress] = useState("")
    const [isAddingFriend, setIsAddingFriend] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    // Get friends data and organize it
    const { acceptedFriends, sentRequests, receivedRequests } = useMemo(() => {
        const friendsList = Object.values(friends)
        return {
            acceptedFriends: friendsList.filter(f => f.status === 'accepted'),
            sentRequests: friendsList.filter(f => f.status === 'sent'),
            receivedRequests: friendsList.filter(f => f.status === 'received')
        }
    }, [friends])

    // Filter friends based on search query
    const filteredFriends = useMemo(() => {
        if (!searchQuery.trim()) return acceptedFriends

        const query = searchQuery.toLowerCase()
        return acceptedFriends.filter(friend =>
            friend.profile?.primaryName?.toLowerCase().includes(query) ||
            friend.profile?.displayName?.toLowerCase().includes(query) ||
            friend.userId?.toLowerCase().includes(query)
        )
    }, [acceptedFriends, searchQuery])

    // Detect address changes and clear active friend selection
    useEffect(() => {
        if (address && previousAddress && address !== previousAddress) {
            console.log(`📧 Address changed in DMs list from ${previousAddress} to ${address}, clearing active friend`)
            actions.setActiveFriendId("")
        }
        setPreviousAddress(address || "")
    }, [address])

    // Load friends on component mount, clear when disconnected, refresh on address change
    useEffect(() => {
        if (profile && address && connected) {
            console.log(`📧 Loading friends for address: ${address}`)
            subspaceActions.friends.getFriends()
        }
    }, [profile, address, connected])

    const selectFriend = (friendId: string) => {
        actions.setActiveFriendId?.(friendId)
        navigate(`/app/dm/${friendId}`)
    }

    const handleAddFriend = async () => {
        if (!connected || !address) {
            toast.error("Please connect your wallet first")
            return
        }

        if (!friendAddress.trim()) {
            toast.error("Please enter a friend's address")
            return
        }

        if (friendAddress.trim() === address) {
            toast.error("You cannot add yourself as a friend")
            return
        }

        setIsAddingFriend(true)
        try {
            const success = await subspaceActions.friends.sendFriendRequest(friendAddress.trim())

            if (success) {
                toast.success("Friend request sent!")
                setFriendAddress("")
                setAddFriendOpen(false)
            } else {
                toast.error("Failed to send friend request")
            }
        } catch (error) {
            console.error("Error adding friend:", error)
            toast.error("Failed to send friend request")
        } finally {
            setIsAddingFriend(false)
        }
    }

    const handleAcceptFriend = async (friendId: string) => {
        try {
            const success = await subspaceActions.friends.acceptFriendRequest(friendId)
            if (success) {
                toast.success("Friend request accepted!")
            } else {
                toast.error("Failed to accept friend request")
            }
        } catch (error) {
            console.error("Error accepting friend:", error)
            toast.error("Failed to accept friend request")
        }
    }

    const handleRejectFriend = async (friendId: string) => {
        try {
            const success = await subspaceActions.friends.rejectFriendRequest(friendId)
            if (success) {
                toast.success("Friend request rejected")
            } else {
                toast.error("Failed to reject friend request")
            }
        } catch (error) {
            console.error("Error rejecting friend:", error)
            toast.error("Failed to reject friend request")
        }
    }

    // Get last message preview for a friend
    const getLastMessagePreview = (friendId: string) => {
        const conversation = dmConversations[friendId]
        if (!conversation) return null

        const messages = Object.values(conversation.messages)
        if (messages.length === 0) return null

        const lastMessage = messages.sort((a, b) => b.timestamp - a.timestamp)[0]
        return {
            content: lastMessage.content.length > 50
                ? lastMessage.content.substring(0, 50) + "..."
                : lastMessage.content,
            isOwn: lastMessage.senderId === address,
            timestamp: lastMessage.timestamp
        }
    }

    // Format timestamp
    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffHours = diffMs / (1000 * 60 * 60)
        const diffDays = diffMs / (1000 * 60 * 60 * 24)

        if (diffHours < 1) {
            const diffMinutes = Math.floor(diffMs / (1000 * 60))
            return diffMinutes <= 1 ? "now" : `${diffMinutes}m`
        } else if (diffDays < 1) {
            return `${Math.floor(diffHours)}h`
        } else if (diffDays < 7) {
            return `${Math.floor(diffDays)}d`
        } else {
            return date.toLocaleDateString()
        }
    }

    return (
        <div className={cn(
            "flex flex-col w-60 h-full relative !z-10",
            "bg-gradient-to-b from-background via-background/95 to-background/90",
            "backdrop-blur-sm rounded-br-xl",
            "scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/40",
            "before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.02)_0%,transparent_50%)] before:pointer-events-none",
            className
        )}>
            {/* Ambient glow at top */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16 bg-primary/5 rounded-full blur-2xl" />

            {/* Header */}
            <div className="mb-4 p-4 flex flex-col justify-center items-center relative">
                <div className="flex items-center justify-between w-full group">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-primary/20 flex items-center justify-center border border-primary/30 flex-shrink-0">
                            <MessageCircle className="w-4 h-4 text-primary/80" />
                        </div>
                        <h2 className="text-lg font-semibold text-foreground text-left truncate flex-1">
                            Direct Messages
                        </h2>
                    </div>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAddFriendOpen(true)}
                        disabled={!connected || !address}
                        className="h-8 w-8 p-0 hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!connected || !address ? "Connect wallet to add friends" : "Add friend"}
                    >
                        <UserPlus className="w-4 h-4" />
                    </Button>
                </div>
                <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-border to-transparent absolute bottom-0" />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-2 space-y-4">
                {/* Friend Requests Section */}
                {(receivedRequests.length > 0 || sentRequests.length > 0) && (
                    <div className="space-y-2">
                        {/* Received Friend Requests */}
                        {receivedRequests.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    <Users className="w-3 h-3" />
                                    <span>Friend Requests ({receivedRequests.length})</span>
                                </div>
                                <div className="space-y-1">
                                    {receivedRequests.map((friend) => (
                                        <div
                                            key={friend.userId}
                                            className="w-full p-2 flex items-center gap-3 text-sm transition-all duration-200 bg-muted/20 hover:bg-muted/40 rounded-md"
                                        >
                                            {/* Avatar */}
                                            <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center border border-primary/30 flex-shrink-0">
                                                {friend.profile?.pfp ? (
                                                    <img
                                                        src={`https://arweave.net/${friend.profile.pfp}`}
                                                        alt={friend.profile?.primaryName || "Friend"}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <User className="w-4 h-4 text-primary/80" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-foreground truncate">
                                                    {friend.profile?.primaryName || friend.profile?.displayName || `${friend.userId.substring(0, 8)}...`}
                                                </div>
                                                <div className="text-xs text-muted-foreground truncate">
                                                    wants to be friends
                                                </div>
                                            </div>

                                            <div className="flex gap-1 flex-shrink-0">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleAcceptFriend(friend.userId)}
                                                    className="h-6 w-6 p-0 hover:bg-green-500/20 hover:text-green-500"
                                                >
                                                    <Check className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleRejectFriend(friend.userId)}
                                                    className="h-6 w-6 p-0 hover:bg-red-500/20 hover:text-red-500"
                                                >
                                                    <X className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Sent Friend Requests */}
                        {sentRequests.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    <Users className="w-3 h-3" />
                                    <span>Pending ({sentRequests.length})</span>
                                </div>
                                <div className="space-y-1">
                                    {sentRequests.map((friend) => (
                                        <div
                                            key={friend.userId}
                                            className="w-full p-2 flex items-center gap-3 text-sm transition-all duration-200 bg-muted/10 rounded-md"
                                        >
                                            {/* Avatar */}
                                            <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center border border-primary/30 flex-shrink-0">
                                                {friend.profile?.pfp ? (
                                                    <img
                                                        src={`https://arweave.net/${friend.profile.pfp}`}
                                                        alt={friend.profile?.primaryName || "Friend"}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <User className="w-4 h-4 text-primary/80" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-foreground truncate">
                                                    {friend.profile?.primaryName || friend.profile?.displayName || `${friend.userId.substring(0, 8)}...`}
                                                </div>
                                                <div className="text-xs text-muted-foreground truncate">
                                                    request sent
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Friends Section */}
                {acceptedFriends.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            <MessageCircle className="w-3 h-3" />
                            <span>Messages</span>
                        </div>

                        {/* Search */}
                        {acceptedFriends.length > 5 && (
                            <div className="relative px-2">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                <Input
                                    placeholder="Search conversations..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-8 pl-8 text-xs bg-muted/20 border-muted"
                                />
                            </div>
                        )}

                        {/* Friends List */}
                        <div className="space-y-1">
                            {filteredFriends.map((friend) => {
                                const lastMessage = getLastMessagePreview(friend.userId)
                                const conversation = dmConversations[friend.userId]

                                return (
                                    <div
                                        key={friend.userId}
                                        className={cn(
                                            "w-full p-2 flex items-center gap-3 text-sm transition-all duration-200 relative overflow-hidden cursor-pointer",
                                            "hover:bg-muted/50 rounded-md",
                                            activeFriendId === friend.userId
                                                ? "bg-accent/20 text-foreground"
                                                : "text-muted-foreground hover:text-foreground",
                                            "before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/5 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300"
                                        )}
                                        onClick={() => selectFriend(friend.userId)}
                                    >
                                        {/* Avatar */}
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center border border-primary/30 flex-shrink-0 relative">
                                            {friend.profile?.pfp ? (
                                                <img
                                                    src={`https://arweave.net/${friend.profile.pfp}`}
                                                    alt={friend.profile?.primaryName || "Friend"}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <User className="w-5 h-5 text-primary/80" />
                                            )}
                                            {/* Unread indicator */}
                                            {conversation?.unreadCount && conversation.unreadCount > 0 && (
                                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                                                    {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <div className="font-medium text-foreground truncate">
                                                    {friend.profile?.primaryName || friend.profile?.displayName || `${friend.userId.substring(0, 8)}...`}
                                                </div>
                                                {lastMessage && (
                                                    <div className="text-xs text-muted-foreground/60 flex-shrink-0 ml-2">
                                                        {formatTime(lastMessage.timestamp)}
                                                    </div>
                                                )}
                                            </div>
                                            {lastMessage ? (
                                                <div className="text-xs text-muted-foreground truncate">
                                                    {lastMessage.isOwn ? "You: " : ""}{lastMessage.content}
                                                </div>
                                            ) : (
                                                <div className="text-xs text-muted-foreground/60 truncate">
                                                    Click to start conversation
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {acceptedFriends.length === 0 && receivedRequests.length === 0 && sentRequests.length === 0 && (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center animate-in fade-in-50 slide-in-from-bottom-4 duration-700">
                            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                            {!connected || !address ? (
                                <>
                                    <p className="text-sm mb-2">Connect your wallet</p>
                                    <p className="text-xs mb-4 text-muted-foreground/60">
                                        Connect a wallet to start messaging friends
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm mb-2">No friends yet</p>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setAddFriendOpen(true)}
                                        className="text-xs"
                                    >
                                        <UserPlus className="w-3 h-3 mr-1" />
                                        Add Friend
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Ambient glow at bottom */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-24 h-12 bg-primary/3 rounded-full blur-xl" />

            {/* Add Friend Dialog */}
            <Dialog open={addFriendOpen && connected && !!address} onOpenChange={setAddFriendOpen}>
                <DialogContent className="max-w-md w-[95vw] p-0 outline-0 overflow-hidden bg-background border border-primary/30 shadow-2xl">
                    {/* Background decoration */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-lg pointer-events-none" />

                    <DialogHeader className="relative z-10 p-6 pb-0">
                        <DialogTitle className="flex items-center gap-3 font-freecam text-xl text-primary">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-sm bg-primary/20 flex items-center justify-center border border-primary/40">
                                    <UserPlus className="h-5 w-5 text-primary" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-sm bg-primary/30 border border-primary/50" />
                            </div>
                            <span>Add Friend</span>
                        </DialogTitle>
                        <DialogDescription className="font-ocr text-primary/70 text-left mt-3 leading-relaxed">
                            Connect with friends across the decentralized web by entering their wallet address below.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="relative z-10 p-6 space-y-6">
                        {/* Address input section */}
                        <div className="space-y-3">
                            <Label
                                htmlFor="friend-address"
                                className="flex items-center gap-2 font-ocr text-sm text-primary/80 font-medium"
                            >
                                <Hash className="h-4 w-4" />
                                Friend's Wallet Address
                            </Label>
                            <div className="relative">
                                <Input
                                    id="friend-address"
                                    placeholder="0x1234567890abcdef..."
                                    value={friendAddress}
                                    onChange={(e) => setFriendAddress(e.target.value)}
                                    disabled={!connected || !address}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && friendAddress.trim() && connected && address) {
                                            handleAddFriend();
                                        }
                                    }}
                                    className={cn(
                                        "font-mono text-sm pl-4 pr-12 py-3 bg-background/50 border border-primary/30 rounded-sm",
                                        "focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all duration-200",
                                        "placeholder:text-primary/40 placeholder:font-ocr"
                                    )}
                                />
                                {friendAddress.trim() && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setAddFriendOpen(false)}
                                disabled={isAddingFriend}
                                className={cn(
                                    "flex-1 font-ocr bg-transparent border border-primary/30 text-primary/80",
                                    "hover:bg-primary/10 hover:border-primary/50 hover:text-primary",
                                    "transition-all duration-200",
                                    isAddingFriend && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={handleAddFriend}
                                disabled={isAddingFriend || !friendAddress.trim() || !connected || !address}
                                className={cn(
                                    "flex-1 font-ocr bg-primary text-black border border-primary/30",
                                    "hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]",
                                    "transition-all duration-200 shadow-lg shadow-primary/20",
                                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                )}
                            >
                                {isAddingFriend ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Sending...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <UserPlus className="h-4 w-4" />
                                        <span>Send Request</span>
                                    </div>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Bottom glow effect */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-16 bg-primary/10 rounded-full blur-xl pointer-events-none" />
                </DialogContent>
            </Dialog>
        </div>
    )
}