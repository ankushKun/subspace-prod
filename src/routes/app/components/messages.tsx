import { cn } from "@/lib/utils";
import { useGlobalState } from "@/hooks/use-global-state";
import { useSubspace } from "@/hooks/use-subspace";
import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { useNavigate } from "react-router";
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
    FileIcon, FileQuestion, LinkIcon, Eye
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
import { Mention, MentionsInput } from "react-mentions";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";

import alien from "@/assets/subspace/alien-green.svg"
import ProfilePopover from "./profile-popover"


// Global store for mentions data (temporary solution)
let currentMentions: { type: 'user' | 'channel'; display: string; id: string; }[] = [];

export const setCurrentMentions = (mentions: { type: 'user' | 'channel'; display: string; id: string; }[]) => {
    currentMentions = mentions;
};

// Markdown components for enhanced rendering
const mdComponents = {
    a: ({ node, ...props }: any) => {
        const href = props.href;
        const children = props.children;
        const { actions } = useGlobalState();
        const navigate = useNavigate();

        // Handle user mention placeholders
        if (href?.startsWith('#__user_mention_')) {
            const index = parseInt(href.replace('#__user_mention_', '').replace('__', ''));
            const mention = currentMentions[index];
            if (!mention) return <>{children}</>;

            return (
                <ProfilePopover userId={mention.id} side="bottom" align="center">
                    <span className="inline-flex items-center px-1 py-0.5 mx-0.5 text-sm font-medium text-primary bg-primary/20 hover:bg-primary/30 transition-colors duration-150 rounded-sm cursor-pointer">
                        @{mention.display}
                    </span>
                </ProfilePopover>
            );
        }

        // Handle channel mention placeholders
        if (href?.startsWith('#__channel_mention_')) {
            const index = parseInt(href.replace('#__channel_mention_', '').replace('__', ''));
            const mention = currentMentions[index];
            if (!mention) return <>{children}</>;

            const handleChannelClick = (e: React.MouseEvent) => {
                e.preventDefault();
                // Get current server from global state
                const { activeServerId } = useGlobalState.getState();
                if (activeServerId) {
                    // Navigate to the channel
                    navigate(`/app/${activeServerId}/${mention.id}`);
                }
            };

            return (
                <span
                    className="inline-flex items-center px-1 py-0.5 mx-0.5 text-sm font-medium text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors duration-150 rounded-sm cursor-pointer"
                    onClick={handleChannelClick}
                >
                    #{mention.display}
                </span>
            );
        }

        // Handle regular links
        return (
            <a
                {...props}
                className="text-blue-500 hover:underline cursor-pointer"
                target="_blank"
                rel="noopener noreferrer"
            >
                {children}
            </a>
        );
    },
};

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

// Helper function to shorten addresses
const shortenAddress = (address: string) => {
    if (!address) return '';
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Helper function to get display name with priority: server nickname → primary name → shortened address
const getDisplayName = (userId: string, profiles: Record<string, any>, activeServerId?: string, servers?: Record<string, any>) => {
    // Priority 1: Server nickname (if in an active server)
    if (activeServerId && servers?.[activeServerId]) {
        const server = servers[activeServerId]
        const member = server.members?.find((m: any) => m.userId === userId)
        if (member?.nickname) return member.nickname
    }

    // Priority 2: Primary name
    const profile = profiles[userId]
    if (profile?.primaryName) return profile.primaryName

    // Priority 3: Shortened wallet address
    return shortenAddress(userId)
};

// Helper function to get user's highest priority role color
const getUserRoleColor = (userId: string, activeServerId?: string, servers?: Record<string, any>) => {
    if (!activeServerId || !servers?.[activeServerId]) return undefined

    const server = servers[activeServerId]
    const member = server.members?.find((m: any) => m.userId === userId)

    if (!member?.roles || !Array.isArray(member.roles) || member.roles.length === 0) {
        return undefined
    }

    const serverRoles = Object.values(server?.roles || {})
    const memberRoles = serverRoles
        .filter((role: any) => member.roles.includes(role.roleId))
        .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))

    const highestRole = memberRoles[0] as any
    return highestRole?.color || undefined
};

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
                    <h1 className="text-base font-semibold text-foreground truncate">
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
                            "h-8 w-8 hover:bg-muted/50 transition-colors items-center justify-center",
                            showMemberList
                                ? "text-primary hover:text-primary"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                        title={showMemberList ? "Hide member list" : "Show member list"}
                    >
                        <UsersRound className="w-4 h-4" />
                    </Button>
                )}
            </div>
        </div>
    )
}

// Enhanced Message Avatar Component
const MessageAvatar = memo(({ authorId, size = "md" }: { authorId: string; size?: "sm" | "md" | "lg" }) => {
    const profile = useSubspace((state) => state.profiles[authorId])

    const sizeClasses = {
        sm: "w-6 h-6",
        md: "w-10 h-10",
        lg: "w-12 h-12"
    }

    return (
        <div className={cn(
            "relative rounded-md overflow-hidden bg-gradient-to-br from-primary/20 to-primary/10 flex-shrink-0",
            sizeClasses[size]
        )}>
            {profile?.pfp || profile?.primaryLogo ? (
                <img
                    src={`https://arweave.net/${profile.pfp || profile.primaryLogo}`}
                    alt={authorId}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <img
                        src={alien}
                        alt="Default avatar"
                        className="w-6 h-6 object-contain opacity-30"
                    />
                </div>
            )}
        </div>
    )
})

MessageAvatar.displayName = "MessageAvatar"

// Enhanced Message Timestamp Component
const MessageTimestamp = memo(({ timestamp, showDate = false, className, ...props }: { timestamp: number, showDate?: boolean } & React.HTMLAttributes<HTMLSpanElement>) => {
    const date = new Date(timestamp)

    // Format the display string based on showDate
    const displayString = showDate
        ? `${date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`
        : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })

    // Full date and time for tooltip
    const fullDateTime = date.toLocaleString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    })

    return (
        <span
            className={cn("text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors", className)}
            title={fullDateTime}
            {...props}
        >
            {displayString}
        </span>
    )
})

MessageTimestamp.displayName = "MessageTimestamp"

// Reply Preview Component
const ReplyPreview = ({ replyToMessage, onJumpToMessage, replyToId, ...props }: React.HTMLAttributes<HTMLDivElement> & {
    replyToMessage: Message['replyToMessage'];
    onJumpToMessage?: (messageId: string) => void;
    replyToId?: string;
}) => {
    const { profiles, servers } = useSubspace()
    const { activeServerId } = useGlobalState()

    if (!replyToMessage) {
        return (
            <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground/60">
                <CornerLeftDown className="w-3 h-3" />
                <span className="italic">
                    {replyToId ? "Replying to a message not in current view" : "Original message not found"}
                </span>
            </div>
        )
    }

    const displayName = getDisplayName(replyToMessage.authorId, profiles, activeServerId, servers)
    const authorProfile = profiles[replyToMessage.authorId]
    const roleColor = getUserRoleColor(replyToMessage.authorId, activeServerId, servers)

    // Truncate content for preview
    const previewContent = replyToMessage.content.length > 50
        ? replyToMessage.content.substring(0, 50) + "..."
        : replyToMessage.content


    return (
        <div
            {...props}
            className={cn("flex items-start gap-2 border-muted-foreground/30 hover:border-primary/50 transition-all duration-200 cursor-pointer rounded-r-md hover:bg-muted/30 py-1.5 pl-2 -mb-2 group/reply", props.className)}
            onClick={() => onJumpToMessage?.(replyToMessage.messageId)}
            title="Click to jump to original message"
        >
            <CornerLeftDown className="w-3 h-3 text-muted-foreground/50 group-hover/reply:text-primary/70 mt-0.5 flex-shrink-0 transition-colors" />
            <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* Small avatar */}
                <ProfilePopover userId={replyToMessage.authorId} side="bottom" align="start">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex-shrink-0 flex items-center justify-center overflow-hidden border border-border/20">
                        {authorProfile?.pfp ? (
                            <img
                                src={`https://arweave.net/${authorProfile.pfp}`}
                                alt={displayName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-[8px] font-semibold text-primary">
                                {displayName.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                </ProfilePopover>

                {/* Author name and content preview */}
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <ProfilePopover userId={replyToMessage.authorId} side="bottom" align="start">
                        <span
                            className="text-xs font-medium group-hover/reply:text-primary flex-shrink-0 hover:underline text-foreground cursor-pointer transition-colors hover:text-primary"
                            style={{ color: roleColor || undefined }}
                        >
                            {displayName}
                        </span>
                    </ProfilePopover>
                    <span className="text-xs text-muted-foreground/60 group-hover/reply:text-muted-foreground truncate">
                        {previewContent}
                    </span>
                </div>
            </div>
        </div>
    )
}

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
const MessageContent = memo(({ content, attachments }: { content: string; attachments?: string | string[] }) => {
    // Parse attachments if they exist
    const parsedAttachments = useMemo(() => {
        if (!attachments) return []
        try {
            return typeof attachments === 'string' ? JSON.parse(attachments) : attachments
        } catch {
            return []
        }
    }, [attachments])

    function preProcessContent(content: string) {
        // Process mentions similar to legacy implementation
        const mentions: { type: 'user' | 'channel'; display: string; id: string; }[] = [];
        let processedContent = content;

        // Extract and store user mentions: @[Display Name](userId)
        const userMentionRegex = /@\[([^\]]+)\]\(([A-Za-z0-9_-]+)\)/g;
        processedContent = processedContent.replace(userMentionRegex, (match, display, id) => {
            const index = mentions.length;
            mentions.push({ type: 'user', display, id });
            return `[${display}](#__user_mention_${index}__)`;
        });

        // Extract and store channel mentions: #[Display Name](channelId)
        const channelMentionRegex = /#\[([^\]]+)\]\(([0-9]+)\)/g;
        processedContent = processedContent.replace(channelMentionRegex, (match, display, id) => {
            const index = mentions.length;
            mentions.push({ type: 'channel', display, id });
            return `[${display}](#__channel_mention_${index}__)`;
        });

        // Also handle the expected format for backward compatibility
        const expectedMentionRegex = /<@([A-Za-z0-9_-]+)>/g;
        const expectedChannelRegex = /<#([0-9]+)>/g;

        processedContent = processedContent.replace(expectedMentionRegex, (match, id) => {
            const index = mentions.length;
            mentions.push({ type: 'user', display: id, id });
            return `[${id}](#__user_mention_${index}__)`;
        });

        processedContent = processedContent.replace(expectedChannelRegex, (match, id) => {
            const index = mentions.length;
            mentions.push({ type: 'channel', display: id, id });
            return `[${id}](#__channel_mention_${index}__)`;
        });

        // Set mentions data for the markdown components to access
        setCurrentMentions(mentions);

        return processedContent;
    }

    // emoji only or multiple emojis up to 10
    const isEmojiOnly = /^\p{Emoji}{1,10}$/u.test(content)

    return (
        <div className="">
            {/* Message text */}
            {content && (
                <div className={cn(
                    "text-sm whitespace-pre-wrap break-words max-w-[80vw] text-left md:max-w-full text-foreground leading-relaxed",
                    isEmojiOnly ? "text-3xl" : ""
                )}>
                    <Markdown
                        skipHtml
                        components={mdComponents}
                        remarkPlugins={[remarkGfm, remarkBreaks]}
                        rehypePlugins={[rehypeKatex]}
                        disallowedElements={["img"]}
                    >
                        {preProcessContent(content)}
                    </Markdown>
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
                                                        className="max-w-60 md:max-w-96 cursor-pointer max-h-64 object-cover rounded"
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
                                    case "tenor":
                                        return (
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <img
                                                        src={attachment.replace("tenor:", "")}
                                                        alt="Attachment"
                                                        className="max-w-60 md:max-w-96 cursor-pointer max-h-64 object-cover rounded"
                                                    />
                                                </DialogTrigger>
                                                <DialogContent className="bg-transparent outline-0 backdrop-blur-xs border-0 shadow-none max-w-screen max-h-screen items-center justify-center p-0">
                                                    <div className="max-w-[80vw] max-h-[80vh] w-screen h-full">
                                                        <img
                                                            src={attachment.replace("tenor:", "")}
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
                                                    className="text-xs cursor-pointer w-40 md:w-fit whitespace-normal break-words text-muted-foreground truncate hover:underline flex items-center gap-1 hover:text-primary"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(attachmentId)
                                                        toast.success("Copied to clipboard")
                                                    }}
                                                >
                                                    <LinkIcon className="w-4 h-4" />
                                                    <span className="text-xs truncate">{attachmentId}</span>
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
})

MessageContent.displayName = "MessageContent"

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
        <div className="relative flex items-center justify-center py-1">
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

const MessageItem = memo(({ message, profile, onReply, onEdit, onDelete, isOwnMessage, channel, showAvatar = true, isGrouped = false, onJumpToMessage }: MessageItemProps) => {
    const [isHovered, setIsHovered] = useState(false);
    const { profiles, servers } = useSubspace()
    const { activeServerId } = useGlobalState()

    const isMyReply = message.replyToMessage?.authorId === profile?.userId
    const authorRoleColor = getUserRoleColor(message.authorId, activeServerId, servers)


    return (
        <div
            data-highlight={isMyReply}
            className={cn(
                "group relative hover:bg-accent/30 transition-colors duration-150 px-1 data-[highlight=true]:bg-amber-400/10 data-[highlight=true]:border-l data-[highlight=true]:border-amber-300",
                isGrouped ? "py-0.5" : "pt-2 pb-1 px-1"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Reply preview - show if this message is a reply */}
            {message.replyTo && (
                <div className="relative left-12 mb-1">
                    <ReplyPreview
                        replyToMessage={message.replyToMessage}
                        onJumpToMessage={onJumpToMessage}
                        replyToId={message.replyTo}
                    />
                </div>
            )}

            <div className="flex gap-2">
                {/* Avatar or timestamp spacer */}
                <div className="w-12 flex-shrink-0 flex justify-center cursor-pointer h-fit">
                    {showAvatar ? (
                        <ProfilePopover userId={message.authorId} side="right" align="start">
                            <div className="cursor-pointer">
                                <MessageAvatar authorId={message.authorId} />
                            </div>
                        </ProfilePopover>
                    ) : (
                        <div data-hovered={isHovered} className="data-[hovered=true]:opacity-100 data-[hovered=false]:opacity-0 transition-opacity duration-150 text-xs mt-0.5 h-fit text-center">
                            <MessageTimestamp timestamp={message.timestamp} />
                        </div>
                    )}
                </div>

                {/* Message content */}
                <div className=" min-w-0">
                    {showAvatar && (
                        <div className="flex items-baseline gap-2 mb-1">
                            <ProfilePopover userId={message.authorId} side="bottom" align="start">
                                <span
                                    className="hover:underline cursor-pointer font-medium text-foreground text-sm transition-colors hover:text-primary"
                                    style={{ color: authorRoleColor || undefined }}
                                >
                                    {getDisplayName(message.authorId, profiles, activeServerId, servers)}
                                </span>
                            </ProfilePopover>
                            <MessageTimestamp timestamp={message.timestamp} showDate={new Date(message.timestamp).toDateString() !== new Date().toDateString()} />
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
})

MessageItem.displayName = "MessageItem"

// Enhanced Message Input with Mentions
interface MessageInputRef {
    focus: () => void;
    blur: () => void;
}

interface MessageInputProps {
    onSendMessage: (content: string, attachments?: string[]) => void;
    replyingTo?: Message | null;
    onCancelReply?: () => void;
    disabled?: boolean;
    channelName?: string;
    messagesInChannel?: Message[];
    servers?: any;
    activeServerId?: string;
    activeChannelId?: string;
}

const MessageInput = React.forwardRef<MessageInputRef, MessageInputProps>(({
    onSendMessage,
    replyingTo,
    onCancelReply,
    disabled = false,
    channelName,
    messagesInChannel = [],
    servers = {},
    activeServerId,
    activeChannelId
}, ref) => {
    const [message, setMessage] = useState("")
    const [isSending, setIsSending] = useState(false)
    const [attachments, setAttachments] = useState<string[]>([])
    const mentionsInputRef = useRef<any>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { profiles } = useSubspace()
    const isMobile = useIsMobile()

    // Expose focus and blur methods to parent component
    React.useImperativeHandle(ref, () => ({
        focus: () => {
            if (isMobile) return
            setTimeout(() => {
                focusTextarea()
            }, 100)
        },
        blur: () => {
            const mentionsContainer = mentionsInputRef.current
            if (mentionsContainer) {
                const textarea = mentionsContainer.querySelector('textarea')
                if (textarea) {
                    textarea.blur()
                }
            }
        }
    }))

    const focusTextarea = () => {
        if (isMobile) return
        const mentionsContainer = mentionsInputRef.current
        if (mentionsContainer) {
            const textarea = mentionsContainer.querySelector('textarea')
            if (textarea) {
                textarea.focus()
                // Move cursor to end
                const length = textarea.value.length
                textarea.setSelectionRange(length, length)
            }
        }
    }

    // Function to get members data for mentions
    const getMembersData = (query: string, callback: (data: any[]) => void) => {
        if (!activeServerId) {
            callback([])
            return
        }

        const serverMembers = servers[activeServerId]?.members || []

        // Extract unique user IDs from messages in the current channel
        const chatParticipants = new Set<string>()
        messagesInChannel.forEach(message => {
            chatParticipants.add(message.authorId)
        })

        // Create a unified list of users
        const allUsers = new Map<string, {
            id: string;
            display: string;
            isServerMember: boolean;
            isChatParticipant: boolean;
        }>()

        // Add server members
        serverMembers.forEach((member: any) => {
            const displayName = getDisplayName(member.userId, profiles, activeServerId, servers)
            allUsers.set(member.userId, {
                id: member.userId,
                display: displayName,
                isServerMember: true,
                isChatParticipant: chatParticipants.has(member.userId),
            })
        })

        // Add chat participants who might not be in server members list
        chatParticipants.forEach(userId => {
            if (!allUsers.has(userId)) {
                const displayName = getDisplayName(userId, profiles, activeServerId, servers)
                allUsers.set(userId, {
                    id: userId,
                    display: displayName,
                    isServerMember: false,
                    isChatParticipant: true
                })
            }
        })

        const allUsersArray = Array.from(allUsers.values())

        if (!query.trim()) {
            const sortedUsers = allUsersArray
                .sort((a, b) => {
                    if (a.isChatParticipant && !b.isChatParticipant) return -1
                    if (!a.isChatParticipant && b.isChatParticipant) return 1
                    if (a.isServerMember && !b.isServerMember) return -1
                    if (!a.isServerMember && b.isServerMember) return 1
                    return a.display.localeCompare(b.display)
                })
                .slice(0, 10)
                .map(user => ({
                    id: user.id,
                    display: user.display
                }))

            callback(sortedUsers)
            return
        }

        const lowerQuery = query.toLowerCase()
        const filteredUsers = allUsersArray
            .filter(user => {
                const primaryName = profiles[user.id]?.primaryName
                return user.display.toLowerCase().includes(lowerQuery) ||
                    user.id.toLowerCase().includes(lowerQuery) ||
                    (primaryName && primaryName.toLowerCase().includes(lowerQuery))
            })
            .sort((a, b) => {
                const aDisplay = a.display.toLowerCase()
                const bDisplay = b.display.toLowerCase()

                const aStartsWith = aDisplay.startsWith(lowerQuery)
                const bStartsWith = bDisplay.startsWith(lowerQuery)

                if (aStartsWith && !bStartsWith) return -1
                if (!aStartsWith && bStartsWith) return 1

                if (a.isChatParticipant && !b.isChatParticipant) return -1
                if (!a.isChatParticipant && b.isChatParticipant) return 1
                if (a.isServerMember && !b.isServerMember) return -1
                if (!a.isServerMember && b.isServerMember) return 1

                return aDisplay.localeCompare(bDisplay)
            })
            .slice(0, 10)
            .map(user => ({
                id: user.id,
                display: user.display
            }))

        callback(filteredUsers)
    }

    // Custom render function for member suggestions
    const renderMemberSuggestion = (
        suggestion: { id: string; display: string },
        search: string,
        highlightedDisplay: React.ReactNode,
        index: number,
        focused: boolean
    ) => {
        const profile = profiles[suggestion.id]
        const serverMember = servers[activeServerId]?.members?.find((m: any) => m.userId === suggestion.id)
        const isChatParticipant = messagesInChannel.some(m => m.authorId === suggestion.id)
        const roleColor = getUserRoleColor(suggestion.id, activeServerId, servers)

        return (
            <div
                className={cn(
                    "flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg transition-all duration-150 group",
                    "hover:bg-gradient-to-r hover:from-accent/80 hover:to-accent/60 hover:shadow-sm",
                    focused
                        ? "bg-gradient-to-r from-primary/20 to-primary/10 text-foreground ring-1 ring-primary/20 shadow-md"
                        : "hover:bg-accent/60"
                )}
            >
                <div className="relative">
                    <MessageAvatar authorId={suggestion.id} size="sm" />
                    {/* Online indicator - you could add real online status here */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-background rounded-full opacity-80" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span
                            className="font-semibold text-sm text-foreground group-hover:text-foreground truncate"
                            style={{ color: roleColor || undefined }}
                        >
                            {highlightedDisplay}
                        </span>
                        {serverMember && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary border-primary/20">
                                <Users className="w-2.5 h-2.5 mr-1" />
                                Member
                            </Badge>
                        )}
                        {isChatParticipant && !serverMember && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-muted/50 text-muted-foreground border-muted-foreground/30">
                                <AtSign className="w-2.5 h-2.5 mr-1" />
                                Participant
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground/80 truncate font-mono">
                            {shortenAddress(suggestion.id)}
                        </span>
                        {profile?.primaryName && (
                            <>
                                <span className="text-xs text-muted-foreground/60">•</span>
                                <span className="text-xs text-muted-foreground/80 truncate">
                                    {profile.primaryName}
                                </span>
                            </>
                        )}
                    </div>
                </div>
                <div className={cn(
                    "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
                    focused && "opacity-100"
                )}>
                    <AtSign className="w-3.5 h-3.5 text-muted-foreground/60" />
                </div>
            </div>
        )
    }

    // Function to get channels data for mentions
    const getChannelsData = (query: string, callback: (data: any[]) => void) => {
        if (!activeServerId) {
            callback([]);
            return;
        }

        const server = servers[activeServerId];
        if (!server?.channels) {
            callback([]);
            return;
        }

        const filteredChannels = server.channels
            .filter((channel: any) => {
                const lowerQuery = query.toLowerCase();
                return channel.name.toLowerCase().includes(lowerQuery);
            })
            .sort((a: any, b: any) => {
                const aName = a.name.toLowerCase();
                const bName = b.name.toLowerCase();
                const lowerQuery = query.toLowerCase();

                const aStartsWith = aName.startsWith(lowerQuery);
                const bStartsWith = bName.startsWith(lowerQuery);

                if (aStartsWith && !bStartsWith) return -1;
                if (!aStartsWith && bStartsWith) return 1;

                return aName.localeCompare(bName);
            })
            .slice(0, 10)
            .map((channel: any) => ({
                id: channel.channelId.toString(),
                display: channel.name
            }));

        callback(filteredChannels);
    };

    // Custom render function for channel suggestions
    const renderChannelSuggestion = (
        suggestion: { id: string; display: string },
        search: string,
        highlightedDisplay: React.ReactNode,
        index: number,
        focused: boolean
    ) => {
        const channel = servers[activeServerId]?.channels?.find((c: any) => c.channelId.toString() === suggestion.id)
        const isCurrentChannel = activeChannelId === suggestion.id

        return (
            <div
                className={cn(
                    "flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg transition-all duration-150 group",
                    "hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-blue-50/60 dark:hover:from-blue-950/40 dark:hover:to-blue-950/30 hover:shadow-sm",
                    focused
                        ? "bg-gradient-to-r from-blue-100/60 to-blue-50/40 dark:from-blue-900/30 dark:to-blue-950/20 text-foreground ring-1 ring-blue-200 dark:ring-blue-800 shadow-md"
                        : "hover:bg-accent/60",
                    isCurrentChannel && "opacity-60"
                )}
            >
                <div className={cn(
                    "flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150",
                    "bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50",
                    "group-hover:from-blue-200 group-hover:to-blue-300 dark:group-hover:from-blue-800/60 dark:group-hover:to-blue-700/60",
                    "border border-blue-200/50 dark:border-blue-700/50 shadow-sm",
                    focused && "ring-2 ring-blue-300/50 dark:ring-blue-600/50"
                )}>
                    <Hash className={cn(
                        "w-3.5 h-3.5 transition-colors duration-150",
                        "text-blue-600 dark:text-blue-400",
                        "group-hover:text-blue-700 dark:group-hover:text-blue-300"
                    )} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm text-foreground group-hover:text-foreground truncate">
                            {highlightedDisplay}
                        </span>
                        {isCurrentChannel && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-muted/50 text-muted-foreground border-muted-foreground/30">
                                <Eye className="w-2.5 h-2.5 mr-1" />
                                Current
                            </Badge>
                        )}
                    </div>
                    {channel?.description && (
                        <span className="text-xs text-muted-foreground/80 truncate">
                            {channel.description}
                        </span>
                    )}
                    {!channel?.description && (
                        <span className="text-xs text-muted-foreground/60 truncate">
                            Channel #{suggestion.id}
                        </span>
                    )}
                </div>
                <div className={cn(
                    "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
                    focused && "opacity-100"
                )}>
                    <Hash className="w-3.5 h-3.5 text-blue-500/60" />
                </div>
            </div>
        )
    }

    const handleSend = async () => {
        if ((!message.trim() && attachments.length === 0) || isSending) return

        setIsSending(true)
        try {
            await onSendMessage(message.trim(), attachments)
            setMessage("") // Clear input after sending
            setAttachments([]) // Clear attachments
            if (replyingTo && onCancelReply) {
                onCancelReply()
            }
        } catch (error) {
            console.error("Error sending message:", error)
            toast.error("Failed to send message")
        } finally {
            setIsSending(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (!isSending) {
                handleSend()
            }
        }
    }

    const handleFileUpload = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        fileInputRef.current?.click()
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files) return

        // Handle file upload logic here
        // This would need to be implemented based on your file upload system
        toast.info("File upload not implemented yet")
    }

    return (
        <div className="backdrop-blur-sm">
            {/* Reply indicator */}
            {replyingTo && (
                <>
                    <div className="flex items-center gap-2 px-4 -mb-3">
                        <Reply className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                            Replying to <ProfilePopover userId={replyingTo.authorId} side="top" align="start">
                                <span className="cursor-pointer hover:underline transition-colors hover:text-primary">
                                    {getDisplayName(replyingTo.authorId, profiles, activeServerId, servers)}
                                </span>
                            </ProfilePopover>
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onCancelReply}
                        >
                            Cancel
                        </Button>
                    </div>
                    {replyingTo.replyToMessage ? (
                        <div className="flex items-center gap-2 px-4 py-2 bg-muted/20">
                            <span className="text-sm text-muted-foreground">
                                {replyingTo.replyToMessage.content}
                            </span>
                        </div>
                    ) : null}
                </>
            )}

            {/* Message Input */}
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-4">
                {/* Attachments preview */}
                {attachments.length > 0 && (
                    <div className="mb-3 p-2 border border-border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 mb-2">
                            <Paperclip className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">
                                {attachments.length} attachment{attachments.length > 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="space-y-1">
                            {attachments.map((attachment, index) => (
                                <div key={index} className="flex items-center gap-2 text-xs">
                                    <FileIcon className="w-3 h-3 text-muted-foreground" />
                                    <span className="truncate flex-1">{attachment}</span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-4 w-4 p-0"
                                        onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex items-center border gap-0.5 rounded p-0.5">
                    {/* File upload button */}
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11"
                        onClick={handleFileUpload}
                        disabled={isSending || disabled}
                    >
                        <Paperclip className="w-4 h-4" />
                    </Button>

                    <div className="relative grow h-fit p-0" ref={mentionsInputRef}>
                        <MentionsInput
                            value={message}
                            onChange={(event, newValue) => setMessage(newValue)}
                            onKeyDown={handleKeyPress}
                            placeholder={`Message #${channelName || 'channel'}`}
                            disabled={isSending || disabled}
                            singleLine={false}
                            forceSuggestionsAboveCursor
                            className="mentions-input"
                            style={{
                                control: {
                                    backgroundColor: 'transparent',
                                    fontWeight: 'normal',
                                    minHeight: '44px',
                                    maxHeight: '128px',
                                    padding: '0',
                                    margin: '0',
                                    lineHeight: '1.5',
                                    fontSize: '14px',
                                    fontFamily: 'inherit',
                                    outline: 'none',
                                },
                                '&multiLine': {
                                    control: {
                                        fontFamily: 'inherit',
                                        minHeight: message.split("\n").length > 1 ? '44px' : '22px',
                                        maxHeight: message.split("\n").length > 1 ? '128px' : '22px',
                                        outline: 'none',
                                        overflow: 'hidden',
                                    },
                                    highlighter: {
                                        padding: '0px !important',
                                        border: 'none',
                                        minHeight: '44px',
                                        maxHeight: '128px',
                                        overflow: 'auto',
                                        boxSizing: 'border-box',
                                    },
                                    input: {
                                        padding: '0px !important',
                                        fontSize: '14px',
                                        border: 'none',
                                        outline: 'none',
                                        backgroundColor: 'transparent',
                                        color: 'var(--foreground)',
                                        fontFamily: 'inherit',
                                        lineHeight: '1.5',
                                        minHeight: '44px',
                                        maxHeight: '128px',
                                        resize: 'none',
                                        overflow: 'auto',
                                        boxSizing: 'border-box',
                                    },
                                },
                                suggestions: {
                                    zIndex: 1999,
                                    backgroundColor: 'transparent',
                                    list: {
                                        backgroundColor: 'var(--background)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        boxShadow: '0 8px 16px -4px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        padding: '4px',
                                        margin: '4px 0',
                                    },
                                    item: {
                                        padding: '0',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        '&focused': {
                                            backgroundColor: 'transparent',
                                        },
                                    },
                                },
                            }}
                        >
                            <Mention
                                data={getMembersData}
                                trigger="@"
                                markup="@[__display__](__id__)"
                                displayTransform={(id) => {
                                    const displayName = getDisplayName(id, profiles, activeServerId, servers)
                                    return `@${displayName}`
                                }}
                                appendSpaceOnAdd
                                renderSuggestion={renderMemberSuggestion}
                                style={{
                                    color: 'var(--primary)',
                                    borderRadius: '4px',
                                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                                    position: "relative",
                                    zIndex: 500,
                                    pointerEvents: "none",
                                }}
                            />
                            <Mention
                                data={getChannelsData}
                                trigger="#"
                                markup="#[__display__](__id__)"
                                displayTransform={(id) => {
                                    const channel = servers[activeServerId]?.channels?.find((c: any) => c.channelId.toString() === id)
                                    return `#${channel?.name || id}`
                                }}
                                appendSpaceOnAdd
                                renderSuggestion={renderChannelSuggestion}
                                style={{
                                    color: '#2563eb',
                                    backgroundColor: 'rgba(37, 99, 235, 0.2)',
                                    borderRadius: '4px',
                                    position: "relative",
                                    zIndex: 500,
                                    pointerEvents: "none",
                                }}
                            />
                        </MentionsInput>
                    </div>

                    <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        disabled={(!message.trim() && attachments.length === 0) || isSending || disabled}
                        className="h-11 w-11"
                    >
                        {isSending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </Button>
                </div>

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                    onChange={handleFileChange}
                />

                <div className="flex items-center justify-between text-[10px] mt-1 -mb-2.5 px-2 text-xs text-muted-foreground/50">
                    <span>
                        Press Enter to send, Shift+Enter for new line
                    </span>
                    <span>
                        {message.length}/2000
                    </span>
                </div>
            </form>
        </div>
    )
})

MessageInput.displayName = "MessageInput"

export default function Messages({ className, onToggleMemberList, showMemberList }: {
    className?: string;
    onToggleMemberList?: () => void;
    showMemberList?: boolean;
}) {
    const { activeServerId, activeChannelId } = useGlobalState();
    const { servers, profile, profiles, actions, subspace } = useSubspace();

    // State
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [editingMessage, setEditingMessage] = useState<{ id: string; content: string } | null>(null);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<MessageInputRef>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Get current server and channel
    const server = servers[activeServerId];

    // Try multiple ways to find the channel
    let channel = null;
    if (server?.channels) {
        // Handle both string and number channel IDs for compatibility
        channel = server.channels.find(c =>
            c.channelId.toString() === activeChannelId ||
            (typeof c.channelId === 'string' && c.channelId === activeChannelId) ||
            (typeof c.channelId === 'number' && c.channelId === parseInt(activeChannelId))
        );
    }

    // Helper function to check if two timestamps are on the same day
    const isSameDay = (timestamp1: number, timestamp2: number) => {
        const date1 = new Date(timestamp1)
        const date2 = new Date(timestamp2)
        return date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate()
    }

    // Helper function to populate replyToMessage field for messages that have replyTo
    const populateReplyToMessages = (messages: Message[]): Message[] => {
        if (!messages || messages.length === 0) return messages;

        // Create a map for quick lookups
        const messageMap = new Map<string, Message>();
        messages.forEach(message => {
            messageMap.set(message.messageId, message);
        });

        // Populate replyToMessage field
        return messages.map(message => {
            if (message.replyTo && messageMap.has(message.replyTo)) {
                return {
                    ...message,
                    replyToMessage: messageMap.get(message.replyTo)
                };
            }
            return message;
        });
    }

    // Load server if not available
    useEffect(() => {
        if (activeServerId && !server) {
            actions.servers.get(activeServerId).catch(console.error);
        }
    }, [activeServerId, server, actions.servers]);

    // Load messages when channel changes
    useEffect(() => {
        if (!server || !activeChannelId || !channel) {
            setMessages([]);
            return;
        }

        // Check if we have cached messages for this channel
        const cachedMessages = actions.servers.getCachedMessages?.(activeServerId, activeChannelId);
        if (cachedMessages && cachedMessages.length > 0) {
            setMessages(populateReplyToMessages(cachedMessages));
            setLoading(false);

            // Load fresh messages in the background (no loading state)
            loadMessages(false);
        } else {
            // No cached messages, show loading state
            setMessages([]);
            loadMessages(true);
        }
    }, [server, activeChannelId, channel]);

    // Load messages when subspace becomes available
    useEffect(() => {
        if (subspace && server && activeChannelId && channel && messages.length === 0) {

            // Check for cached messages first
            const cachedMessages = actions.servers.getCachedMessages?.(activeServerId, activeChannelId);
            if (cachedMessages && cachedMessages.length > 0) {
                setMessages(populateReplyToMessages(cachedMessages));
                loadMessages(false); // Background refresh
            } else {
                loadMessages(true); // Show loading state
            }
        }
    }, [subspace, server, activeChannelId, channel]);

    // Auto-refresh messages every 2 seconds when channel is active
    useEffect(() => {
        // Clear any existing interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        // Only start auto-refresh if we have an active channel and subspace is ready
        if (subspace && server && activeChannelId && channel) {
            intervalRef.current = setInterval(() => {
                loadMessages(false); // Background refresh, no loading state
            }, 2000);
        }

        // Cleanup on unmount or channel change
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [subspace, server, activeChannelId, channel]);

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

    const loadMessages = async (showLoadingState: boolean = true) => {
        if (!server || !activeChannelId) return;

        // Don't attempt to load if subspace is not ready yet
        if (!subspace) {
            return;
        }

        if (showLoadingState) {
            setLoading(true);
        }

        try {
            const messages = await actions.servers.getMessages(activeServerId, activeChannelId, 50);

            if (messages && messages.length > 0) {
                setMessages(populateReplyToMessages(messages));

                // Load profiles for message authors
                const authorIds = [...new Set(messages.map((m: Message) => m.authorId))] as string[];
                if (authorIds.length > 0) {
                    actions.profile.getBulk(authorIds).catch(console.error);
                }
            } else {
                setMessages([]);
            }
        } catch (error) {
            console.error("Failed to load messages:", error);
            if (showLoadingState) {
                toast.error("Failed to load messages");
            }
            setMessages([]);
        } finally {
            if (showLoadingState) {
                setLoading(false);
            }
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const sendMessage = async (content: string, attachments: string[] = []) => {
        if ((!content.trim() && attachments.length === 0) || !server || !activeChannelId) return;

        // Don't attempt to send if subspace is not ready yet
        if (!subspace) {
            toast.error("Connection not ready, please wait...");
            return;
        }

        try {
            const success = await actions.servers.sendMessage(activeServerId, {
                channelId: activeChannelId,
                content: content.trim(),
                replyTo: replyingTo?.messageId || undefined,
                attachments: JSON.stringify(attachments)
            });

            if (success) {
                setReplyingTo(null);
                toast.success("Message sent!");
            } else {
                toast.error("Failed to send message");
            }
        } catch (error) {
            console.error("Failed to send message:", error);
            toast.error("Failed to send message");
        }
    };

    const editMessage = async (messageId: string, content: string) => {
        if (!content.trim() || !server || !activeChannelId) return;

        // Don't attempt to edit if subspace is not ready yet
        if (!subspace) {
            toast.error("Connection not ready, please wait...");
            return;
        }

        try {
            const success = await actions.servers.editMessage(activeServerId, activeChannelId, messageId, content.trim());

            if (success) {
                setEditingMessage(null);
                toast.success("Message updated!");
            } else {
                toast.error("Failed to update message");
            }
        } catch (error) {
            console.error("Failed to update message:", error);
            toast.error("Failed to update message");
        }
    };

    const deleteMessage = async (messageId: string) => {
        if (!server || !activeChannelId) return;

        // Don't attempt to delete if subspace is not ready yet
        if (!subspace) {
            toast.error("Connection not ready, please wait...");
            return;
        }

        try {
            const success = await actions.servers.deleteMessage(activeServerId, activeChannelId, messageId);
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

    const handleReply = (messageId: string) => {
        const message = messages.find(m => m.messageId === messageId);
        if (message) {
            setReplyingTo(message);
            setEditingMessage(null);
            inputRef.current?.focus();
        }
    };

    const handleEdit = (messageId: string, content: string) => {
        setEditingMessage({ id: messageId, content });
        setReplyingTo(null);
        inputRef.current?.focus();
    };

    const handleJumpToMessage = (messageId: string) => {
        // Find the message element and scroll to it
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            messageElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });

            // Add a brief highlight effect
            messageElement.classList.add('bg-primary/20', 'transition-colors', 'duration-300');
            setTimeout(() => {
                messageElement.classList.remove('bg-primary/20');
                setTimeout(() => {
                    messageElement.classList.remove('transition-colors', 'duration-300');
                }, 300);
            }, 1500);
        } else {
            toast.info("Message not found in current view");
        }
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

    // Show initialization state when subspace is not ready
    if (!subspace) {
        return (
            <div className={cn(
                "flex flex-col h-full items-center justify-center",
                "bg-gradient-to-b from-background via-background/95 to-background/90",
                "border-r border-border/50 backdrop-blur-sm",
                className
            )}>
                <div className="text-center animate-in fade-in-50 slide-in-from-bottom-4 duration-700">
                    <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Initializing Connection</h3>
                    <p className="text-sm text-muted-foreground">
                        Setting up secure connection to the network...
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
                    <div className="pt-6 mb-0.5">
                        {Array.from({ length: 15 }, (_, index) => (
                            <div key={`skeleton-${index}`} className="group relative hover:bg-accent/30 transition-colors duration-150 pt-3 pb-1 px-4">
                                <div className="flex gap-3">
                                    <div className="w-10 flex-shrink-0 flex justify-center">
                                        <Skeleton className="w-10 h-10 rounded-full" />
                                    </div>
                                    <div className="flex-1 min-w-0">
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
                    <div className="pt-6">
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
                                            onJumpToMessage={handleJumpToMessage}
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
            <MessageInput
                ref={inputRef}
                onSendMessage={sendMessage}
                replyingTo={replyingTo}
                onCancelReply={() => setReplyingTo(null)}
                disabled={!server || !channel || !subspace}
                channelName={channel?.name}
                messagesInChannel={messages}
                servers={servers}
                activeServerId={activeServerId}
                activeChannelId={activeChannelId}
            />
        </div>
    );
}