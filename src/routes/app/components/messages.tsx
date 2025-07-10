import { cn } from "@/lib/utils";
import { useGlobalState } from "@/hooks/use-global-state";
import { useSubspace } from "@/hooks/use-subspace";
import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Send,
    Hash,
    Paperclip,
    Smile,
    Reply,
    MoreHorizontal,
    Edit3,
    Trash2,
    Copy,
    AlertCircle,
    Loader2,
    Pin,
    Search,
    Inbox,
    UsersRound,
    Plus,
    Fingerprint,
    Check,
    CornerLeftDown,
    Bell,
    BellOff,
    Users,
    HelpCircle,
    Gift,
    Mic,
    AtSign,
    CornerDownRight,
    CornerDownLeft,
    UserPlus,
    UserCheck,
    UserX,
    Clock,
    Edit,
    FileIcon,
    FileQuestion,
    LinkIcon
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

interface Message {
    messageId: string;
    content: string;
    authorId: string;
    timestamp: number;
    edited: boolean;
    attachments: string[] | string; // Can be JSON string or array
    replyTo?: string;
    messageTxId: string;
    replyToMessage?: Message;
}

// Enhanced Channel Header Component
const ChannelHeader = ({ channelName, channelDescription, memberCount, onToggleMemberList, showMemberList }: {
    channelName?: string;
    channelDescription?: string;
    memberCount?: number;
    onToggleMemberList?: () => void;
    showMemberList?: boolean;
}) => {
    const [isNotificationMuted, setIsNotificationMuted] = useState(false)
    const { activeServerId } = useGlobalState()
    const isMobile = useIsMobile()

    return (
        <div className="flex items-center justify-between px-4 py-3 pr-2 border-b border-border/50 bg-background/80 backdrop-blur-sm relative z-10">
            {/* Left side - Channel info */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <Hash className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <h1 className="text-lg font-semibold text-foreground truncate">
                        {channelName || 'channel'}
                    </h1>
                </div>

                {channelDescription && (
                    <>
                        <div className="w-px h-6 bg-border/50 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground truncate max-w-md">
                            {channelDescription}
                        </p>
                    </>
                )}
            </div>

            {/* Right side - Action buttons */}
            <div className="flex items-center justify-center gap-1 h-full">
                <div className="w-px h-6 bg-border/50 mx-1" />

                {!isMobile && activeServerId && (
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={onToggleMemberList}
                        className={cn(
                            "!h-8 !w-8 hover:bg-muted/50 transition-colors items-center justify-center",
                            showMemberList
                                ? "text-primary hover:text-primary"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                        title={showMemberList ? "Hide member list" : "Show member list"}
                    >
                        <UsersRound className="!w-4 !h-4" />
                    </Button>
                )}
            </div>
        </div>
    )
}

// Enhanced Message Avatar Component
const MessageAvatar = memo(({ authorId, size = "md" }: { authorId: string; size?: "sm" | "md" | "lg" }) => {
    const { profiles } = useSubspace()
    const profile = profiles[authorId]

    const sizeClasses = {
        sm: "w-6 h-6",
        md: "w-10 h-10",
        lg: "w-12 h-12"
    }

    return (
        <div className={cn(
            "relative rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/10 flex-shrink-0",
            sizeClasses[size]
        )}>
            {profile?.pfp ? (
                <img
                    src={`https://arweave.net/${profile.pfp}`}
                    alt={authorId}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-primary font-semibold text-sm">
                    {(profile?.primaryName || authorId).charAt(0).toUpperCase()}
                </div>
            )}
        </div>
    )
})

MessageAvatar.displayName = "MessageAvatar"

// Enhanced Message Timestamp Component
const MessageTimestamp = memo(({ timestamp, className, ...props }: { timestamp: number } & React.HTMLAttributes<HTMLSpanElement>) => {
    const formatTime = (ts: number) => {
        const date = new Date(ts)
        const now = new Date()

        // Get start of today and yesterday for comparison
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
        const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

        if (messageDate.getTime() === today.getTime()) {
            // Same day - show relative time
            const diffMs = now.getTime() - date.getTime()
            const diffMinutes = Math.floor(diffMs / (1000 * 60))
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

            if (diffMinutes < 1) {
                return 'just now'
            } else if (diffMinutes < 60) {
                return `${diffMinutes}m ago`
            } else if (diffHours < 24) {
                return `${diffHours}h ago`
            } else {
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
        } else if (messageDate.getTime() === yesterday.getTime()) {
            // Yesterday
            return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        } else {
            // Older - show short date and time
            return date.toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        }
    }

    return (
        <span className={cn("text-muted-foreground/60 hover:text-muted-foreground transition-colors", className)} {...props}>
            {formatTime(timestamp)}
        </span>
    )
})

MessageTimestamp.displayName = "MessageTimestamp"

interface MessageItemProps {
    message: Message;
    profile: any;
    onReply: (messageId: string) => void;
    onEdit: (messageId: string, content: string) => void;
    onDelete: (messageId: string) => void;
    isOwnMessage: boolean;
    channel: any;
    showAvatar?: boolean;
    isGrouped?: boolean;
    onJumpToMessage?: (messageId: string) => void;
}

// Enhanced Message Actions Component
const MessageActions = ({ message, onReply, onEdit, onDelete }: {
    message: Message;
    onReply?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
}) => {
    const { profile } = useSubspace()

    // Check if current user can edit (only message author)
    const canEdit = message.authorId === profile?.userId

    // Check if current user can delete (message author for now)
    const canDelete = message.authorId === profile?.userId

    function copyFingerprint() {
        navigator.clipboard.writeText(message.messageTxId)
        toast.success("Message fingerprint copied to clipboard")
    }

    return (
        <div className="absolute -top-4 right-4 bg-background border border-border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-muted" onClick={onReply}>
                <Reply className="w-4 h-4" />
            </Button>
            {canEdit && (
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-muted" onClick={onEdit}>
                    <Edit className="w-4 h-4" />
                </Button>
            )}
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-muted" onClick={copyFingerprint}>
                <Fingerprint className="w-4 h-4" />
            </Button>
            {canDelete && (
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 hover:bg-muted text-destructive hover:text-destructive"
                    onClick={onDelete}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            )}
        </div>
    )
}

// Enhanced Message Content Component
const MessageContent = ({ content, attachments }: { content: string; attachments?: string | string[] }) => {
    // Parse attachments if they exist
    const parsedAttachments = useMemo(() => {
        if (!attachments) return []
        try {
            return typeof attachments === 'string' ? JSON.parse(attachments) : attachments
        } catch {
            return []
        }
    }, [attachments])

    // emoji only or multiple emojis up to 10
    const isEmojiOnly = /^\p{Emoji}{1,10}$/u.test(content)

    return (
        <div className="space-y-2">
            {/* Message text */}
            {content && (
                <div className={cn(
                    "text-base whitespace-normal break-after-all max-w-[80vw] md:max-w-full text-foreground leading-relaxed break-words",
                    isEmojiOnly ? "text-4xl" : ""
                )}>
                    {content}
                </div>
            )}

            {/* Attachments */}
            {parsedAttachments.length > 0 && (
                <div className="space-y-2">
                    {parsedAttachments.map((attachment: string, index: number) => (
                        <div key={index} className="w-fit">
                            {(() => {
                                const attachmentType = attachment.split(":")[0]
                                const attachmentId = attachment.split(":")[1]

                                switch (attachmentType) {
                                    case "image/png":
                                    case "image/jpeg":
                                    case "image/gif":
                                    case "image/webp":
                                        return (
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <img
                                                        src={`https://arweave.net/${attachmentId}`}
                                                        alt="Attachment"
                                                        className="max-w-40 md:max-w-128 cursor-pointer max-h-64 object-cover rounded"
                                                    />
                                                </DialogTrigger>
                                                <DialogContent className="bg-transparent outline-0 backdrop-blur-xs border-0 shadow-none max-w-screen max-h-screen items-center justify-center p-0">
                                                    <div className="max-w-[80vw] max-h-[80vh] w-screen h-full">
                                                        <img
                                                            src={`https://arweave.net/${attachmentId}`}
                                                            alt="Attachment"
                                                            className="w-full h-full object-contain"
                                                        />
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        )
                                    default:
                                        return (
                                            <div className="flex items-center justify-center gap-1 w-fit my-1 border p-1 rounded py-1.5 bg-muted/70 hover:bg-muted/50 transition-all duration-100">
                                                <FileQuestion className="w-5 h-5" />
                                                <div
                                                    className="text-xs cursor-pointer w-40 md:w-fit whitespace-normal break-after-all text-muted-foreground truncate hover:underline flex items-center gap-1 hover:text-primary"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(attachmentId)
                                                        toast.success("Copied to clipboard")
                                                    }}
                                                >
                                                    <LinkIcon className="w-4 h-4" />
                                                    <span className="text-xs truncate whitespace-normal break-after-all">{attachmentId}</span>
                                                </div>
                                            </div>
                                        )
                                }
                            })()}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// Date Divider Component
const DateDivider = memo(({ timestamp }: { timestamp: number }) => {
    const formatDate = (ts: number) => {
        const date = new Date(ts)
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
        const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

        if (messageDate.getTime() === today.getTime()) {
            return 'Today'
        } else if (messageDate.getTime() === yesterday.getTime()) {
            return 'Yesterday'
        } else {
            return date.toLocaleDateString([], {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        }
    }

    return (
        <div className="relative flex items-center justify-center py-4 my-2">
            {/* Line */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

            {/* Date badge */}
            <div className="relative bg-background px-2.5 py-0.5 flex items-center justify-center rounded-full border border-border/50 shadow-sm">
                <span className="text-xs font-medium text-muted-foreground">
                    {formatDate(timestamp)}
                </span>
            </div>
        </div>
    )
})

DateDivider.displayName = "DateDivider"

// Enhanced Empty Channel State
const EmptyChannelState = memo(({ channelName }: { channelName?: string }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 relative">
            {/* Ambient background effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Primary glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
                {/* Secondary glows */}
                <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/8 rounded-full blur-2xl animate-pulse delay-1000" />
                <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-primary/3 rounded-full blur-2xl animate-pulse delay-2000" />
            </div>

            {/* Content */}
            <div className="relative z-10 space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-700">
                {/* Icon container with enhanced styling */}
                <div className="relative group">
                    {/* Icon glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500 scale-110" />

                    {/* Main icon container */}
                    <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-background via-background/90 to-background/80 border border-border/50 shadow-2xl shadow-primary/10 flex items-center justify-center group-hover:scale-105 transition-all duration-300">
                        {/* Inner glow */}
                        <div className="absolute inset-2 rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-primary/5 opacity-80" />

                        {/* Hash icon with gradient */}
                        <Hash className="w-10 h-10 text-primary relative z-10 drop-shadow-lg group-hover:scale-110 transition-transform duration-300" />

                        {/* Subtle inner shadow for depth */}
                        <div className="absolute inset-0 rounded-3xl shadow-inner shadow-black/5" />
                    </div>
                </div>

                {/* Welcome text with enhanced typography */}
                <div className="space-y-3">
                    <h3 className="text-2xl font-bold bg-gradient-to-br from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent leading-tight">
                        Welcome to #{channelName || 'this channel'}!
                    </h3>

                    <div className="space-y-2">
                        <p className="text-muted-foreground/80 text-base leading-relaxed max-w-md mx-auto">
                            This is the beginning of the{' '}
                            <span className="font-semibold text-primary/80">
                                #{channelName || 'channel'}
                            </span>{' '}
                            channel.
                        </p>
                        <p className="text-muted-foreground/60 text-sm leading-relaxed max-w-sm mx-auto">
                            Start the conversation by sending your first message below.
                        </p>
                    </div>
                </div>

                {/* Decorative elements */}
                <div className="flex items-center justify-center space-x-3 opacity-30">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary/60 to-primary/40 animate-pulse" />
                    <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-primary/40 to-primary/20 animate-pulse delay-150" />
                    <div className="w-1 h-1 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 animate-pulse delay-300" />
                </div>
            </div>
        </div>
    )
})

EmptyChannelState.displayName = "EmptyChannelState"

function MessageItem({ message, profile, onReply, onEdit, onDelete, isOwnMessage, channel, showAvatar = true, isGrouped = false, onJumpToMessage }: MessageItemProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className={cn(
                "group relative hover:bg-accent/30 transition-colors duration-150",
                isGrouped ? "py-0.5" : "pt-2 pb-1"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="flex gap-1">
                {/* Avatar or timestamp spacer */}
                <div className="w-16 flex-shrink-0 flex justify-center cursor-pointer h-fit">
                    {showAvatar ? (
                        <MessageAvatar authorId={message.authorId} />
                    ) : (
                        <div data-hovered={isHovered} className="data-[hovered=true]:opacity-100 data-[hovered=false]:opacity-0 transition-opacity duration-150 !text-[11px] mt-1 h-fit text-center">
                            <MessageTimestamp timestamp={message.timestamp} className="text-[11px]" />
                        </div>
                    )}
                </div>

                {/* Message content */}
                <div className="flex-1 min-w-0 m-0 my-1 p-0">
                    {showAvatar && (
                        <div className="flex items-baseline gap-2">
                            <span className="hover:underline cursor-pointer font-medium text-foreground">
                                {profile?.primaryName || message.authorId.slice(0, 8) + '...'}
                            </span>
                            <MessageTimestamp timestamp={message.timestamp} className="text-[11px]" />
                            {message.edited && (
                                <span className="text-xs text-muted-foreground/80 italic" title="This message has been edited">
                                    (edited)
                                </span>
                            )}
                        </div>
                    )}

                    <MessageContent
                        content={message.content}
                        attachments={message.attachments}
                    />
                </div>
            </div>

            {/* Message actions */}
            {isHovered && (
                <MessageActions
                    message={message}
                    onReply={() => onReply(message.messageId)}
                    onEdit={() => onEdit(message.messageId, message.content)}
                    onDelete={() => onDelete(message.messageId)}
                />
            )}
        </div>
    );
}

export default function Messages({ className, onToggleMemberList, showMemberList }: {
    className?: string;
    onToggleMemberList?: () => void;
    showMemberList?: boolean;
}) {
    const { activeServerId, activeChannelId } = useGlobalState();
    const { servers, profile, profiles, actions } = useSubspace();

    // State
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [messageInput, setMessageInput] = useState("");
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [editingMessage, setEditingMessage] = useState<{ id: string; content: string } | null>(null);
    const [sending, setSending] = useState(false);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Get current server and channel
    const server = servers[activeServerId];

    // Try multiple ways to find the channel
    let channel = null;
    if (server?.channels) {
        // Try exact match first
        channel = server.channels.find(c => c.channelId === activeChannelId);

        // Try converting to number and back to string
        if (!channel && activeChannelId) {
            const numericId = parseInt(activeChannelId);
            channel = server.channels.find(c =>
                c.channelId === numericId.toString() ||
                c.orderId === numericId ||
                c.channelId === numericId
            );
        }

        // If still not found and activeChannelId is "1", try to get the first channel
        if (!channel && activeChannelId === "1" && server.channels.length > 0) {
            channel = server.channels[0];
        }
    }

    // Helper function to check if two timestamps are on the same day
    const isSameDay = (timestamp1: number, timestamp2: number) => {
        const date1 = new Date(timestamp1)
        const date2 = new Date(timestamp2)
        return date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate()
    }

    // Load server if not available
    useEffect(() => {
        if (activeServerId && !server) {
            console.log('Loading server:', activeServerId);
            actions.servers.get(activeServerId).catch(console.error);
        }
    }, [activeServerId, server, actions.servers]);

    // Load messages when channel changes
    useEffect(() => {
        if (!server || !activeChannelId || !channel) {
            setMessages([]);
            return;
        }

        loadMessages();
    }, [server, activeChannelId, channel]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Focus input when replying or editing
    useEffect(() => {
        if (replyingTo || editingMessage) {
            inputRef.current?.focus();
        }
    }, [replyingTo, editingMessage]);

    const loadMessages = async () => {
        if (!server || !activeChannelId) return;

        setLoading(true);
        try {
            const response = await server.getMessages({
                channelId: activeChannelId,
                limit: 50
            });

            if (response.messages) {
                // Process messages to ensure proper data types
                const processedMessages = response.messages.map((rawMessage: any) => ({
                    ...rawMessage,
                    // Ensure attachments is handled properly (can be string or array)
                    attachments: rawMessage.attachments || "[]",
                    // Ensure edited is boolean
                    edited: Boolean(rawMessage.edited),
                    // Ensure timestamp is number
                    timestamp: Number(rawMessage.timestamp)
                }));

                setMessages(processedMessages);

                // Load profiles for message authors
                const authorIds = [...new Set(processedMessages.map((m: Message) => m.authorId))];
                if (authorIds.length > 0) {
                    actions.profile.getBulk(authorIds).catch(console.error);
                }
            }
        } catch (error) {
            console.error("Failed to load messages:", error);
            toast.error("Failed to load messages");
        } finally {
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const sendMessage = async () => {
        if (!messageInput.trim() || !server || !activeChannelId || sending) return;

        setSending(true);
        try {
            const success = await server.sendMessage({
                channelId: activeChannelId,
                content: messageInput.trim(),
                replyTo: replyingTo || undefined,
                attachments: []
            });

            if (success) {
                setMessageInput("");
                setReplyingTo(null);
                // Reload messages to get the new message
                setTimeout(() => loadMessages(), 500);
                toast.success("Message sent!");
            } else {
                toast.error("Failed to send message");
            }
        } catch (error) {
            console.error("Failed to send message:", error);
            toast.error("Failed to send message");
        } finally {
            setSending(false);
        }
    };

    const editMessage = async () => {
        if (!editingMessage || !messageInput.trim() || !server || sending) return;

        setSending(true);
        try {
            const success = await server.editMessage({
                messageId: editingMessage.id,
                content: messageInput.trim()
            });

            if (success) {
                setMessageInput("");
                setEditingMessage(null);
                // Reload messages to get the updated message
                setTimeout(() => loadMessages(), 500);
                toast.success("Message updated!");
            } else {
                toast.error("Failed to update message");
            }
        } catch (error) {
            console.error("Failed to update message:", error);
            toast.error("Failed to update message");
        } finally {
            setSending(false);
        }
    };

    const deleteMessage = async (messageId: string) => {
        if (!server) return;

        try {
            const success = await server.deleteMessage(messageId);
            if (success) {
                // Remove message from local state
                setMessages(prev => prev.filter(m => m.messageId !== messageId));
                toast.success("Message deleted");
            } else {
                toast.error("Failed to delete message");
            }
        } catch (error) {
            console.error("Failed to delete message:", error);
            toast.error("Failed to delete message");
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingMessage) {
            editMessage();
        } else {
            sendMessage();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
        if (e.key === 'Escape') {
            setReplyingTo(null);
            setEditingMessage(null);
            setMessageInput("");
        }
    };

    const handleReply = (messageId: string) => {
        setReplyingTo(messageId);
        setEditingMessage(null);
        inputRef.current?.focus();
    };

    const handleEdit = (messageId: string, content: string) => {
        setEditingMessage({ id: messageId, content });
        setMessageInput(content);
        setReplyingTo(null);
        inputRef.current?.focus();
    };

    // Check if no channel is selected
    const hasActiveChannel = activeChannelId && activeChannelId !== "0"

    if (!hasActiveChannel) {
        return (
            <div className={cn(
                "flex flex-col h-full items-center justify-center",
                "bg-gradient-to-b from-background via-background/98 to-background/95",
                className
            )}>
                <EmptyChannelState />
            </div>
        );
    }

    if (!server) {
        return (
            <div className={cn(
                "flex flex-col h-full items-center justify-center",
                "bg-gradient-to-b from-background via-background/95 to-background/90",
                "border-r border-border/50 backdrop-blur-sm",
                className
            )}>
                <div className="text-center animate-in fade-in-50 slide-in-from-bottom-4 duration-700">
                    <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Loading Server</h3>
                    <p className="text-sm text-muted-foreground">
                        Fetching server data...
                    </p>
                </div>
            </div>
        );
    }

    if (!channel) {
        return (
            <div className={cn(
                "flex flex-col h-full items-center justify-center",
                "bg-gradient-to-b from-background via-background/95 to-background/90",
                "border-r border-border/50 backdrop-blur-sm",
                className
            )}>
                <div className="text-center animate-in fade-in-50 slide-in-from-bottom-4 duration-700">
                    <Hash className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Channel Not Found</h3>
                    <p className="text-sm text-muted-foreground">
                        Channel "{activeChannelId}" not found in server "{server.name}"
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                        Available channels: {server.channels?.map(c => c.name).join(', ') || 'None'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "flex flex-col h-full relative overflow-clip",
            "bg-gradient-to-b from-background via-background/98 to-background/95",
            className
        )}>
            {/* Enhanced Channel Header */}
            <ChannelHeader
                channelName={channel.name}
                memberCount={server.memberCount}
                onToggleMemberList={onToggleMemberList}
                showMemberList={showMemberList}
            />

            {/* Messages container */}
            <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/40"
            >
                {loading && messages.length === 0 ? (
                    <div className="pt-6 mb-0.5 px-4">
                        {Array.from({ length: 15 }, (_, index) => (
                            <div key={`skeleton-${index}`} className="group relative hover:bg-accent/30 transition-colors duration-150 pt-2 pb-1">
                                <div className="flex gap-1">
                                    <div className="w-16 flex-shrink-0 flex justify-center">
                                        <Skeleton className="w-10 h-10 rounded-full" />
                                    </div>
                                    <div className="flex-1 min-w-0 m-0 my-1 p-0">
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <Skeleton className="w-24 h-4" />
                                            <Skeleton className="w-16 h-3" />
                                        </div>
                                        <div className="space-y-1">
                                            <Skeleton className="w-full h-4" />
                                            <Skeleton className="w-3/4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                ) : messages.length === 0 ? (
                    <EmptyChannelState channelName={channel.name} />
                ) : (
                    <div className="pt-6 px-4">
                        {messages.map((message, index) => {
                            const prevMessage = messages[index - 1]
                            const shouldShowDateDivider = index === 0 || (prevMessage && !isSameDay(prevMessage.timestamp, message.timestamp))
                            const shouldShowAvatar = index === 0 || shouldShowDateDivider || messages[index - 1]?.authorId !== message.authorId
                            const isGrouped = index > 0 && !shouldShowDateDivider && messages[index - 1]?.authorId === message.authorId

                            return (
                                <React.Fragment key={message.messageId}>
                                    {/* Date divider */}
                                    {shouldShowDateDivider && (
                                        <DateDivider timestamp={message.timestamp} />
                                    )}

                                    {/* Message */}
                                    <div data-message-id={message.messageId}>
                                        <MessageItem
                                            message={message}
                                            profile={profiles[message.authorId]}
                                            onReply={handleReply}
                                            onEdit={handleEdit}
                                            onDelete={deleteMessage}
                                            isOwnMessage={message.authorId === profile?.userId}
                                            channel={channel}
                                            showAvatar={shouldShowAvatar}
                                            isGrouped={isGrouped}
                                        />
                                    </div>
                                </React.Fragment>
                            )
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Enhanced Input Area */}
            <div className="border-t border-border/50 bg-background/50 backdrop-blur-sm">
                {/* Reply/Edit Bar */}
                {(replyingTo || editingMessage) && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-muted/20">
                        <AlertCircle className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                            {editingMessage ? "Editing message" : "Replying to message"}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setReplyingTo(null);
                                setEditingMessage(null);
                                setMessageInput("");
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                )}

                {/* Message Input */}
                <form onSubmit={handleSubmit} className="p-4">
                    <div className="flex items-end gap-2">
                        <div className="flex-1 relative">
                            <Input
                                ref={inputRef}
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={`Message #${channel.name}`}
                                disabled={sending}
                                className="pr-20"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="w-8 h-8"
                                    disabled
                                >
                                    <Paperclip className="w-4 h-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="w-8 h-8"
                                    disabled
                                >
                                    <Smile className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={!messageInput.trim() || sending}
                            className="h-9"
                        >
                            {sending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </Button>
                    </div>

                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                        <span>
                            Press Enter to send, Shift+Enter for new line
                        </span>
                        <span>
                            {messageInput.length}/2000
                        </span>
                    </div>
                </form>
            </div>
        </div>
    );
}