/**
 * Messages Component
 * 
 * IMPROVED MESSAGE FETCHING LOGIC:
 * 1. AUTOMATIC POLLING: Messages are fetched every 1.5 seconds when channel is active
 * 2. INITIAL LOAD: Shows loading state while fetching initial messages
 * 3. AUTOMATIC SYNCING: Automatically refreshes after send/edit/delete operations
 * 4. BACKGROUND FETCHING: All fetching happens in background without UI indicators
 * 5. SMART POLLING: Only fetches when channel is active and conditions are met
 * 6. ERROR HANDLING: Graceful handling of failed message fetches
 * 7. PERFORMANCE: Efficient polling with cleanup to prevent memory leaks
 * 8. REQUEST LIMITING: Maximum 5 concurrent requests with queuing and throttling
 * 9. THROTTLING: Minimum 800ms between requests for the same channel
 * 10. PAGE VISIBILITY: Pauses fetching when page is hidden to save resources
 * 
 * IMPROVED AUTOSCROLL SYSTEM:
 * 11. INITIAL SCROLL: Always scrolls to bottom when messages first load or channel changes
 * 12. SMART DETECTION: Robust scroll position detection with race condition prevention
 * 13. USER INTENT: Only auto-scrolls new messages when user is already at bottom
 * 14. SMOOTH SCROLLING: Instant scroll for initial loads, smooth for new messages
 * 15. STATE MANAGEMENT: Proper state tracking to prevent scroll fighting
 * 16. DYNAMIC THRESHOLD: Calculates autoscroll threshold based on last 2 messages height
 * 17. LARGE MESSAGE SUPPORT: Handles large messages by adapting scroll detection dynamically
 */

import { cn } from "@/lib/utils";
import { useGlobalState } from "@/hooks/use-global-state";
import { useSubspace } from "@/hooks/use-subspace";
import { Constants } from "@/lib/constants";
import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { Link, useNavigate } from "react-router";
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
    FileIcon, FileQuestion, LinkIcon, Eye,
    ArrowBigDownDash,
    ExternalLink,
    Shield,
    Bot
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
import { useMobileContext } from "@/hooks/use-mobile";
import { Mention, MentionsInput } from "react-mentions";
import Markdown from "react-markdown";
import { mdComponents } from "@/lib/md-components";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

import alien from "@/assets/subspace/alien-black.svg"
import ProfilePopover from "./profile-popover"
import type { Server } from "@subspace-protocol/sdk";
import { useWallet } from "@/hooks/use-wallet";




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

// Compact long wallet addresses to keep author lines visually tidy
const shortenAddress = (address: string) => {
    if (!address) return '';
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Resolve a human-readable name for a user in the context of a server.
// Priority: server nickname → bot name → profile primaryName → shortened address.
const getDisplayName = (userId: string, profiles: Record<string, any>, activeServerId?: string, servers?: Record<string, any>, bots?: Record<string, any>) => {
    // Priority 1: server-specific nickname (for both users and bots)
    if (activeServerId && servers?.[activeServerId]) {
        const server = servers[activeServerId]
        const member = server.members?.[userId]
        if (member?.nickname) return member.nickname

        // Check for bot nickname in server
        if (server.bots && typeof server.bots === 'object' && server.bots[userId]) {
            const serverBotInfo = server.bots[userId]
            if (serverBotInfo.nickname) return serverBotInfo.nickname
        }
    }

    // Priority 2: bot name (if this is a bot)
    if (activeServerId && servers?.[activeServerId]) {
        const server = servers[activeServerId]
        let botInfo = null

        // Check if bots is an array or object
        if (Array.isArray(server.bots)) {
            botInfo = server.bots.find((b: any) => (b?.userId || b?.botId || b?.process) === userId)
        } else if (typeof server.bots === 'object' && server.bots !== null) {
            // For object format, check if the userId exists as a key (process ID)
            botInfo = server.bots[userId] || null
        }

        // If we found bot info in server, get the global bot profile
        if (botInfo) {
            const globalBotProfile = bots?.[userId]

            // Priority order for bots: server nickname → global bot name → server bot name → fallback
            if (globalBotProfile?.name) {
                return globalBotProfile.name
            }
            if (botInfo.name) {
                return botInfo.name
            }
            if (botInfo.displayName) {
                return botInfo.displayName
            }
            // Fallback for bots
            return `${userId.slice(0, 8)}`
        }
    }

    // Priority 3: global profile primaryName
    const profile = profiles[userId]
    if (profile?.primaryName) return profile.primaryName

    // Priority 4: fallback to shortened address
    return shortenAddress(userId)
};

// Helper function to check if a user is a bot in the current server
const isUserBot = (userId: string, activeServerId?: string, servers?: Record<string, any>) => {
    if (!activeServerId || !servers?.[activeServerId]) return false

    const server = servers[activeServerId]
    if (!server.bots) return false

    // Check if bots is an array or object
    if (Array.isArray(server.bots)) {
        return server.bots.some((b: any) => (b?.userId || b?.botId || b?.process) === userId)
    } else if (typeof server.bots === 'object' && server.bots !== null) {
        return server.bots[userId] !== undefined
    }

    return false
};

// Helper function to get bot info for a user
const getBotInfo = (userId: string, activeServerId?: string, servers?: Record<string, any>, bots?: Record<string, any>) => {
    if (!activeServerId || !servers?.[activeServerId]) return null

    const server = servers[activeServerId]
    if (!server.bots) return null

    let serverBotInfo = null

    // Check if bots is an array or object
    if (Array.isArray(server.bots)) {
        serverBotInfo = server.bots.find((b: any) => (b?.userId || b?.botId || b?.process) === userId)
    } else if (typeof server.bots === 'object' && server.bots !== null) {
        serverBotInfo = server.bots[userId] || null
    }

    if (!serverBotInfo) return null

    // Get global bot profile
    const globalBotProfile = bots?.[userId]

    return {
        serverBotInfo,
        globalBotProfile,
        isBot: true
    }
};

// Pick the highest-priority role color for a user in the active server, if any.
const getUserRoleColor = (userId: string, activeServerId?: string, servers?: Record<string, Server>) => {
    if (!activeServerId || !servers?.[activeServerId]) return undefined

    const server = servers[activeServerId]
    const member = server.members?.[userId]

    // Check if this is a bot and get its roles
    let userRoles = member?.roles
    if (!userRoles && server.bots && typeof server.bots === 'object' && server.bots[userId]) {
        userRoles = server.bots[userId].roles
    }

    if (!userRoles || !Array.isArray(userRoles) || userRoles.length === 0) {
        return undefined
    }

    const serverRoles = Object.values(server?.roles || {})
    const memberRoles = serverRoles
        .filter((role: any) => userRoles.includes(role.roleId))
        .sort((a: any, b: any) => (b.orderId || b.position || 0) - (a.orderId || a.position || 0)) // Higher orderId = higher priority

    // Select the first role in priority order that has a non-default color
    const defaultColor = Constants.DEFAULT_ROLE_COLOR
    const roleWithColor = memberRoles.find((role: any) => role.color && role.color !== defaultColor)

    return roleWithColor?.color || undefined
};

// Channel header: shows channel identity and toggles the member list on larger screens.
const ChannelHeader = ({ channelName, channelDescription, memberCount, onToggleMemberList, showMemberList }: {
    channelName?: string;
    channelDescription?: string;
    memberCount?: number;
    onToggleMemberList?: () => void;
    showMemberList?: boolean;
}) => {
    const [isNotificationMuted, setIsNotificationMuted] = useState(false)
    const { activeServerId } = useGlobalState()
    const { shouldUseOverlays } = useMobileContext()

    return (
        <div className="flex items-center justify-between px-4 py-3 pr-2 border-b border-border/50 bg-background/80 backdrop-blur-sm relative z-10">
            {/* Channel identity */}
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

            {/* Actions (member list toggle for servers) */}
            <div className="flex items-center justify-center gap-1 h-full">
                <div className="w-px h-6 bg-border/50 mx-1" />

                {activeServerId && (
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

// Memoized avatar to minimize re-renders when only message data changes.
const MessageAvatar = memo(({ authorId, size = "md" }: { authorId: string; size?: "sm" | "md" | "lg" }) => {
    const { profiles, servers, bots } = useSubspace()
    const { activeServerId } = useGlobalState()

    const profile = profiles[authorId]
    const botInfo = getBotInfo(authorId, activeServerId, servers, bots)
    const isBot = isUserBot(authorId, activeServerId, servers)

    const sizeClasses = {
        sm: "w-6 h-6",
        md: "w-10 h-10",
        lg: "w-12 h-12"
    }

    // Determine avatar source - prioritize bot avatar over user profile
    let avatarSrc = null
    let avatarAlt = authorId

    if (isBot && botInfo) {
        // Try bot profile pfp first, then server bot pfp
        if (botInfo.globalBotProfile?.pfp) {
            avatarSrc = `https://arweave.net/${botInfo.globalBotProfile.pfp}`
            avatarAlt = botInfo.globalBotProfile.name || `Bot ${authorId.slice(0, 8)}`
        } else if (botInfo.serverBotInfo?.pfp) {
            avatarSrc = `https://arweave.net/${botInfo.serverBotInfo.pfp}`
            avatarAlt = botInfo.serverBotInfo.name || `Bot ${authorId.slice(0, 8)}`
        }
    } else if (profile?.pfp) {
        avatarSrc = `https://arweave.net/${profile.pfp}`
        avatarAlt = profile.primaryName || authorId
    }

    return (
        <div className={cn(
            "relative rounded-md overflow-hidden bg-gradient-to-br from-primary/30 to-primary/15 flex-shrink-0",
            sizeClasses[size]
        )}>
            {avatarSrc ? (
                <img
                    src={avatarSrc}
                    alt={avatarAlt}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <img
                        src={alien}
                        alt="Default avatar"
                        className="w-6 h-6 object-contain opacity-70"
                    />
                </div>
            )}
        </div>
    )
})

MessageAvatar.displayName = "MessageAvatar"

// Small timestamp that shows full details on hover via title.
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

// Compact preview of the message being replied to with quick jump support.
const ReplyPreview = ({ replyToMessage, onJumpToMessage, replyToId, ...props }: React.HTMLAttributes<HTMLDivElement> & {
    replyToMessage: Message['replyToMessage'];
    onJumpToMessage?: (messageId: string) => void;
    replyToId?: string;
}) => {
    const { profiles, servers, bots } = useSubspace()
    const { activeServerId } = useGlobalState()

    if (!replyToMessage || !replyToMessage.messageId) {
        return (
            <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground/60">
                <CornerLeftDown className="w-3 h-3" />
                <span className="italic">
                    {replyToId ? "Message Unavailable" : "Original message not found"}
                </span>
            </div>
        )
    }

    const displayName = getDisplayName(replyToMessage.authorId, profiles, activeServerId, servers, bots)
    const authorProfile = profiles[replyToMessage.authorId]
    const roleColor = getUserRoleColor(replyToMessage.authorId, activeServerId, servers)
    const isBot = isUserBot(replyToMessage.authorId, activeServerId, servers)
    const botInfo = getBotInfo(replyToMessage.authorId, activeServerId, servers, bots)

    // Trim content to keep the reply line succinct
    const previewContent = replyToMessage ? replyToMessage.content?.length > 50
        ? replyToMessage.content.substring(0, 50) + "..."
        : replyToMessage.content : "..."


    return (
        <div
            {...props}
            className={cn("flex items-start gap-2 border-muted-foreground/30 hover:border-primary/50 transition-all duration-200 cursor-pointer rounded-r-md hover:bg-muted/30 py-1.5 pl-2 -mb-2 group/reply", props.className)}
            onClick={() => onJumpToMessage?.(String(replyToMessage.messageId))}
            title="Click to jump to original message"
        >
            <CornerLeftDown className="w-3 h-3 text-muted-foreground/50 group-hover/reply:text-primary/70 mt-0.5 flex-shrink-0 transition-colors" />
            <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* Tiny avatar for reply context */}
                <ProfilePopover userId={replyToMessage.authorId} side="bottom" align="start">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex-shrink-0 flex items-center justify-center overflow-hidden border border-border/20 relative">
                        {(() => {
                            // Determine avatar source - prioritize bot avatar
                            let avatarSrc = null

                            if (isBot && botInfo) {
                                if (botInfo.globalBotProfile?.pfp) {
                                    avatarSrc = `https://arweave.net/${botInfo.globalBotProfile.pfp}`
                                } else if (botInfo.serverBotInfo?.pfp) {
                                    avatarSrc = `https://arweave.net/${botInfo.serverBotInfo.pfp}`
                                }
                            } else if (authorProfile?.pfp) {
                                avatarSrc = `https://arweave.net/${authorProfile.pfp}`
                            }

                            if (avatarSrc) {
                                return (
                                    <img
                                        src={avatarSrc}
                                        alt={displayName}
                                        className="w-full h-full object-cover"
                                    />
                                )
                            } else {
                                return (
                                    <span className="text-[8px] font-semibold text-primary">
                                        {displayName.charAt(0).toUpperCase()}
                                    </span>
                                )
                            }
                        })()}


                    </div>
                </ProfilePopover>

                {/* Author and preview snippet */}
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

// Hover actions for server messages. Only the author sees edit/delete to reduce noise.
const MessageActions = ({ message, onReply, onEdit, onDelete }: {
    message: Message;
    onReply?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
}) => {
    const { profile } = useSubspace()
    const { shouldUseTouchSizes } = useMobileContext()

    // Author-only edit for clarity; server enforces actual permissions
    const canEdit = message.authorId === profile?.userId

    // Author-only delete (UX); actual enforcement is server-side
    const canDelete = message.authorId === profile?.userId

    // Larger hit targets on touch devices
    const buttonSize = shouldUseTouchSizes ? "h-10 w-10" : "h-8 w-8"

    function copyFingerprint() {
        navigator.clipboard.writeText(message.messageTxId)
        toast.success("Message fingerprint copied to clipboard")
    }

    function handleDelete() {
        // Confirmation toast to prevent accidental destructive actions
        toast("Are you sure you want to delete this message?", {
            description: "This action cannot be undone.",
            action: {
                label: "Delete",
                onClick: async () => {
                    try {
                        await onDelete?.()
                        toast.success("Message deleted successfully")
                    } catch (error) {
                        toast.error("Failed to delete message")
                    }
                }
            },
            cancel: {
                label: "Cancel",
                onClick: () => {
                    // Do nothing, just dismiss the toast
                }
            },
            duration: 10000, // 10 seconds to give user time to decide
        })
    }

    return (
        <div className="absolute -top-4 right-4 bg-background border border-border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center">
            <Button size="sm" variant="ghost" className={`${buttonSize} p-0 hover:bg-muted`} onClick={onReply}>
                <Reply className="w-4 h-4" />
            </Button>
            {canEdit && (
                <Button size="sm" variant="ghost" className={`${buttonSize} p-0 hover:bg-muted`} onClick={onEdit}>
                    <Edit className="w-4 h-4" />
                </Button>
            )}
            <Button size="sm" variant="ghost" className={`${buttonSize} p-0 hover:bg-muted`} onClick={copyFingerprint}>
                <Fingerprint className="w-4 h-4" />
            </Button>
            {canDelete && (
                <Button
                    size="sm"
                    variant="ghost"
                    className={`${buttonSize} p-0 hover:bg-muted text-destructive hover:text-destructive`}
                    onClick={handleDelete}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            )}
        </div>
    )
}

// Render Markdown content and inline attachments. Images open in dialog; Markdown images are disabled.
const MessageContent = memo(({ content, attachments, activeServerId, servers }: {
    content: string;
    attachments?: string | string[];
    activeServerId?: string;
    servers?: Record<string, any>;
}) => {
    const { actions } = useGlobalState();
    const navigate = useNavigate();

    // Tolerant parsing: attachments may be stringified or already an array
    const parsedAttachments = useMemo(() => {
        if (!attachments) return []
        try {
            return typeof attachments === 'string' ? JSON.parse(attachments) : attachments
        } catch {
            return []
        }
    }, [attachments])

    // Extract mentions and encode placeholders so global Markdown renderer can attach behaviors
    const { processedContent, mentions } = useMemo(() => {
        const localMentions: { type: 'user' | 'channel'; display: string; id: string; }[] = [];
        let processedContent = content;

        // User mentions in the new format: @[Display Name](userId)
        const userMentionRegex = /@\[([^\]]+)\]\(([A-Za-z0-9_-]+)\)/g;
        processedContent = processedContent.replace(userMentionRegex, (match, display, id) => {
            localMentions.push({ type: 'user', display, id });
            // Encode actual userId in the placeholder so the global markdown renderer can open ProfilePopover
            return `[${display}](#__user_mention_${id}__)`;
        });

        // Channel mentions in the new format: #[Display Name](channelId)
        const channelMentionRegex = /#\[([^\]]+)\]\(([0-9]+)\)/g;
        processedContent = processedContent.replace(channelMentionRegex, (match, display, id) => {
            localMentions.push({ type: 'channel', display, id });
            // Encode actual channelId in the placeholder so the global markdown renderer can navigate
            return `[${display}](#__channel_mention_${id}__)`;
        });

        // Backward compatibility for legacy formats: <@userId> and <#channelId>
        const expectedMentionRegex = /<@([A-Za-z0-9_-]+)>/g;
        const expectedChannelRegex = /<#([0-9]+)>/g;

        processedContent = processedContent.replace(expectedMentionRegex, (match, id) => {
            localMentions.push({ type: 'user', display: id, id });
            return `[${id}](#__user_mention_${id}__)`;
        });

        processedContent = processedContent.replace(expectedChannelRegex, (match, id) => {
            localMentions.push({ type: 'channel', display: id, id });
            return `[${id}](#__channel_mention_${id}__)`;
        });

        return { processedContent, mentions: localMentions };
    }, [content]);

    // Markdown components for enhanced rendering
    // const mdComponentsLocal = useMemo(() => ({
    //     ...mdComponents,
    //     // Links and mentions
    //     a: ({ node, ...props }: any) => {
    //         const href = props.href;
    //         const children = props.children;

    //         // Handle user mention placeholders
    //         if (href?.startsWith('#__user_mention_')) {
    //             const index = parseInt(href.replace('#__user_mention_', '').replace('__', ''));
    //             const mention = mentions[index];
    //             if (!mention) return <>{children}</>;

    //             // Get role color for the mentioned user
    //             const roleColor = getUserRoleColor(mention.id, activeServerId, servers);

    //             return (
    //                 <ProfilePopover userId={mention.id} side="bottom" align="center">
    //                     <span
    //                         className="inline-flex items-center px-1 py-0.5 mx-0.5 text-sm font-medium hover:opacity-80 transition-all duration-150 rounded-sm cursor-pointer"
    //                         style={{
    //                             color: roleColor || 'hsl(var(--primary))',
    //                             backgroundColor: roleColor ? `${roleColor}33` : 'hsl(var(--primary) / 0.2)'
    //                         }}
    //                     >
    //                         @{mention.display}
    //                     </span>
    //                 </ProfilePopover>
    //             );
    //         }

    //         // Handle channel mention placeholders
    //         if (href?.startsWith('#__channel_mention_')) {
    //             const index = parseInt(href.replace('#__channel_mention_', '').replace('__', ''));
    //             const mention = mentions[index];
    //             if (!mention) return <>{children}</>;

    //             const handleChannelClick = (e: React.MouseEvent) => {
    //                 e.preventDefault();
    //                 // Get current server from global state
    //                 const { activeServerId } = useGlobalState.getState();
    //                 if (activeServerId) {
    //                     // Navigate to the channel
    //                     navigate(`/app/${activeServerId}/${mention.id}`);
    //                 }
    //             };

    //             return (
    //                 <span
    //                     className="inline-flex items-center px-1 py-0.5 mx-0.5 text-sm font-medium text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors duration-150 rounded-sm cursor-pointer"
    //                     onClick={handleChannelClick}
    //                 >
    //                     #{mention.display}
    //                 </span>
    //             );
    //         }

    //         // Handle server invite links
    //         // example: https://subspace.ar.io/#/invite/[43-char-server-id]
    //         if (href?.includes('subspace.ar.io/#/invite')) {
    //             const serverId = href.split('/')[5]
    //             return <InvitePreview serverId={serverId} href={href} />

    //         }

    //         // Handle regular links
    //         const A = mdComponents.a as any;
    //         return A ? <A {...props}>{children}</A> : (
    //             <a {...props}>{children}</a>
    //         );
    //     },
    // }), [mentions, navigate]);

    // Emoji-only up to length 10: render larger for expressiveness
    const isEmojiOnly = /^\p{Emoji}{1,10}$/u.test(content)

    return (
        <div className="">
            {/* Message text (Markdown-rendered, images disallowed) */}
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
                        {processedContent}
                    </Markdown>
                </div>
            )}

            {/* Inline attachments; images open fullscreen in a dialog */}
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

// Day separator to establish temporal grouping in long threads.
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
            {/* Horizontal guide line */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

            {/* Date badge */}
            <div className="relative bg-background px-2.5 py-0.5 flex items-center justify-center rounded-full border border-border">
                <span className="text-xs font-medium text-muted-foreground">
                    {formatDate(timestamp)}
                </span>
            </div>
        </div>
    )
})

DateDivider.displayName = "DateDivider"

// Empty state for a new or empty channel.
const EmptyChannelState = memo(({ channelName }: { channelName?: string }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 relative">
            {/* Decorative ambient background; no functional impact */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Primary glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
                {/* Secondary glows */}
                <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/8 rounded-full blur-2xl animate-pulse delay-1000" />
                <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-primary/3 rounded-full blur-2xl animate-pulse delay-2000" />
            </div>

            {/* Content */}
            <div className="relative z-10 space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-700">
                {/* Icon with subtle glow */}
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

                {/* Welcome text */}
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

                {/* Decorative separators */}
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
    const { profiles, servers, bots } = useSubspace()
    const { activeServerId } = useGlobalState()

    // Highlight messages that reply to me for quick visual scanning
    const isMyReply = !!(profile?.userId && message.replyToMessage?.authorId && message.replyToMessage.authorId === profile.userId)
    const authorRoleColor = getUserRoleColor(message.authorId, activeServerId, servers)
    const isBot = isUserBot(message.authorId, activeServerId, servers)


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
            {/* Reply preview (jump on click) */}
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
                {/* Avatar when starting a block; otherwise show a timestamp spacer */}
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

                {/* Message content block */}
                <div className=" min-w-0">
                    {showAvatar && (
                        <div className="flex items-baseline gap-2 mb-1">
                            <ProfilePopover userId={message.authorId} side="bottom" align="start">
                                <span
                                    className="hover:underline font-ocr cursor-pointer font-bold text-foreground text-sm transition-colors hover:text-primary flex items-center gap-1.5"
                                    style={{ color: authorRoleColor || undefined }}
                                >
                                    {getDisplayName(message.authorId, profiles, activeServerId, servers, bots)}
                                    {isBot && (
                                        <Bot className="w-3.5 h-3.5 text-blue-500" />
                                    )}
                                </span>
                            </ProfilePopover>
                            <MessageTimestamp timestamp={message.timestamp} showDate={new Date(message.timestamp).toDateString() !== new Date().toDateString()} />
                            {message.edited && (
                                <span className="text-xs text-muted-foreground/60" title="This message has been edited">
                                    (edited)
                                </span>
                            )}
                        </div>
                    )}

                    <MessageContent
                        content={message.content}
                        attachments={message.attachments}
                        activeServerId={activeServerId}
                        servers={servers}
                    />
                </div>
            </div>

            {/* Hover actions to keep UI uncluttered */}
            {isHovered && (
                <MessageActions
                    message={message}
                    onReply={() => onReply(String(message.messageId))}
                    onEdit={() => onEdit(String(message.messageId), message.content)}
                    onDelete={() => onDelete(String(message.messageId))}
                />
            )}
        </div>
    );
})

MessageItem.displayName = "MessageItem"

// Message input for channels: supports @user and #channel mentions, edit mode, and reply mode.
interface MessageInputRef {
    focus: () => void;
    blur: () => void;
    focusAndInsertText: (text: string) => void;
}

interface MessageInputProps {
    onSendMessage: (content: string, attachments?: string[]) => void;
    onEditMessage?: (messageId: string, content: string) => void;
    replyingTo?: Message | null;
    editingMessage?: { id: string; content: string } | null;
    onCancelReply?: () => void;
    onCancelEdit?: () => void;
    disabled?: boolean;
    channelName?: string;
    messagesInChannel?: Message[];
    servers?: any;
    activeServerId?: string;
    activeChannelId?: string;
}

const MessageInput = React.forwardRef<MessageInputRef, MessageInputProps>(({
    onSendMessage,
    onEditMessage,
    replyingTo,
    editingMessage,
    onCancelReply,
    onCancelEdit,
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
    const { profiles, bots } = useSubspace()
    const { isMobile } = useMobileContext()

    // Synchronize input content with edit/reply state
    React.useEffect(() => {
        if (editingMessage) {
            setMessage(editingMessage.content)
        } else if (!replyingTo) {
            // Only clear when not replying (to preserve message when switching from reply to normal mode)
            setMessage("")
        }
    }, [editingMessage, replyingTo])

    // Imperative focus API so the parent view can redirect keystrokes here
    React.useImperativeHandle(ref, () => ({
        focus: () => {
            if (isMobile) return
            setTimeout(() => {
                focusTextarea()
            }, 100)
        },
        focusAndInsertText: (text: string) => {
            if (isMobile) return
            setTimeout(() => {
                // Add the text to the current message
                setMessage(prev => prev + text)
                focusTextarea()
            }, 50)
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
                // Move cursor to end for a natural continue-typing experience
                const length = textarea.value.length
                textarea.setSelectionRange(length, length)
            }
        }
    }

    // Build a suggestion list for @mentions using server members and recent participants.
    const getMembersData = (query: string, callback: (data: any[]) => void) => {
        try {
            if (!activeServerId) {
                callback([])
                return
            }

            const server = servers[activeServerId]

            // Safely extract server members with proper type checking
            let serverMembers: any[] = []

            if (server?.members) {
                // Handle different possible data structures
                if (Array.isArray(server.members)) {
                    serverMembers = server.members
                } else if (typeof server.members === 'object' && server.members !== null) {
                    // If members is an object with userId keys, convert to array
                    serverMembers = Object.values(server.members)
                }
            }

            // Safely extract server bots
            let serverBots: any[] = []
            if (server?.bots) {
                if (Array.isArray(server.bots)) {
                    serverBots = server.bots
                } else if (typeof server.bots === 'object' && server.bots !== null) {
                    // If bots is an object with process IDs as keys, convert to array
                    // This matches the structure used in member-list.tsx
                    serverBots = Object.entries(server.bots).map(([botId, botInfo]) => ({
                        userId: botId, // Use the key as userId for consistency
                        process: botId, // Keep the process ID
                        nickname: (botInfo as any).nickname || "",
                        roles: (botInfo as any).roles || ["1"],
                        joinedAt: (botInfo as any).joinedAt || Date.now(),
                        approved: (botInfo as any).approved || false,
                        isBot: true
                    }))
                }
            }

            // Use recent participants to surface likely targets
            const chatParticipants = new Set<string>()
            messagesInChannel.forEach(message => {
                chatParticipants.add(message.authorId)
            })

            // Merge members, bots, and participants into a single map
            const allUsers = new Map<string, {
                id: string;
                display: string;
                isServerMember: boolean;
                isBot: boolean;
                isChatParticipant: boolean;
                botProfile?: any;
                botData?: any;
            }>()

            // Add server members - safely iterate
            if (Array.isArray(serverMembers)) {
                serverMembers.forEach((member: any) => {
                    if (member && member.userId) {
                        const displayName = getDisplayName(member.userId, profiles, activeServerId, servers)
                        allUsers.set(member.userId, {
                            id: member.userId,
                            display: displayName,
                            isServerMember: true,
                            isBot: false,
                            isChatParticipant: chatParticipants.has(member.userId),
                        })
                    }
                })
            }

            // Add server bots
            if (Array.isArray(serverBots)) {
                serverBots.forEach((bot: any) => {
                    const botId = bot.userId
                    if (bot && botId) {
                        // Get bot profile data to access PFP and proper name
                        const botProfile = profiles[botId] || bots[botId]

                        // Use nickname if available, otherwise try profile name, then generate fallback
                        let botName = bot.nickname
                        if (!botName && botProfile) {
                            // Handle both Profile and Bot types
                            if ('primaryName' in botProfile && botProfile.primaryName) {
                                botName = botProfile.primaryName
                            } else if ('name' in botProfile && botProfile.name) {
                                botName = botProfile.name
                            }
                        }
                        // Also check if the bot data itself has a name property
                        if (!botName && bot.name) {
                            botName = bot.name
                        }
                        if (!botName) {
                            botName = `Bot ${botId.slice(0, 8)}`
                        }

                        allUsers.set(botId, {
                            id: botId,
                            display: botName,
                            isServerMember: false,
                            isBot: true,
                            isChatParticipant: chatParticipants.has(botId),
                            // Store additional bot info for rendering
                            botProfile: botProfile,
                            botData: bot
                        })
                    }
                })
            }

            // Add chat participants who may not be listed as members (edge cache cases)
            chatParticipants.forEach(userId => {
                if (!allUsers.has(userId)) {
                    const displayName = getDisplayName(userId, profiles, activeServerId, servers, bots)
                    allUsers.set(userId, {
                        id: userId,
                        display: displayName,
                        isServerMember: false,
                        isBot: false,
                        isChatParticipant: true
                    })
                }
            })

            const allUsersArray = Array.from(allUsers.values())

            if (!query.trim()) {
                const sortedUsers = allUsersArray
                    .sort((a, b) => {
                        // Prioritize chat participants, then members, then bots, then others
                        if (a.isChatParticipant && !b.isChatParticipant) return -1
                        if (!a.isChatParticipant && b.isChatParticipant) return 1
                        if (a.isServerMember && !b.isServerMember) return -1
                        if (!a.isServerMember && b.isServerMember) return 1
                        if (a.isBot && !b.isBot) return -1
                        if (!a.isBot && b.isBot) return 1
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
                    if (a.isBot && !b.isBot) return -1
                    if (!a.isBot && b.isBot) return 1

                    return aDisplay.localeCompare(bDisplay)
                })
                .slice(0, 10)
                .map(user => ({
                    id: user.id,
                    display: user.display
                }))

            callback(filteredUsers)
        } catch (error) {
            // Return empty array on error to prevent crashes
            callback([])
        }
    }

    // Render a rich item for user suggestions
    const renderMemberSuggestion = (
        suggestion: { id: string; display: string },
        search: string,
        highlightedDisplay: React.ReactNode,
        index: number,
        focused: boolean
    ) => {
        const profile = profiles[suggestion.id]

        // Safely check if user is a server member
        let serverMember: any = null
        const server = servers[activeServerId]

        if (server?.members) {
            if (Array.isArray(server.members)) {
                serverMember = server.members.find((m: any) => m?.userId === suggestion.id)
            } else if (typeof server.members === 'object' && server.members !== null) {
                // If members is an object, check if the userId exists as a key
                serverMember = server.members[suggestion.id] || null
            }
        }

        // Check if user is a bot
        let isBot = false
        let botInfo: any = null
        if (server?.bots) {
            if (Array.isArray(server.bots)) {
                botInfo = server.bots.find((b: any) => (b?.userId || b?.botId || b?.process) === suggestion.id)
            } else if (typeof server.bots === 'object' && server.bots !== null) {
                // For object format, check if the userId exists as a key (process ID)
                botInfo = server.bots[suggestion.id] || null
            }
            isBot = !!botInfo
        }



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
                    {/* Use consistent squarish PFP styling for all items */}
                    <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary/20 to-primary/10 flex-shrink-0 flex items-center justify-center overflow-hidden border border-primary/30">
                        {isBot && botInfo ? (
                            // Bot PFP - check multiple sources
                            (() => {
                                // First check if bot has a pfp in its data
                                if (botInfo.pfp) {
                                    return (
                                        <img
                                            src={`https://arweave.net/${botInfo.pfp}`}
                                            alt={botInfo.name || suggestion.display}
                                            className="w-full h-full object-cover"
                                        />
                                    )
                                }

                                // Then check if we have a bot profile with PFP
                                const botProfile = profiles[suggestion.id] || bots[suggestion.id]
                                if (botProfile && 'pfp' in botProfile && botProfile.pfp) {
                                    return (
                                        <img
                                            src={`https://arweave.net/${botProfile.pfp}`}
                                            alt={suggestion.display}
                                            className="w-full h-full object-cover"
                                        />
                                    )
                                }

                                // Then check for primaryLogo in bot profile (if it exists)
                                if (botProfile && 'primaryLogo' in botProfile && botProfile.primaryLogo) {
                                    return (
                                        <img
                                            src={`https://arweave.net/${botProfile.primaryLogo}`}
                                            alt={suggestion.display}
                                            className="w-full h-full object-cover"
                                        />
                                    )
                                }

                                // Fallback to alien icon
                                return (
                                    <img
                                        src={alien}
                                        alt="Bot avatar"
                                        className="w-5 h-5 object-contain opacity-70"
                                    />
                                )
                            })()
                        ) : (
                            // User PFP - use consistent styling with bot PFP
                            (() => {
                                if (profile?.pfp) {
                                    return (
                                        <img
                                            src={`https://arweave.net/${profile.pfp}`}
                                            alt={suggestion.display}
                                            className="w-full h-full object-cover"
                                        />
                                    )
                                }
                                // Fallback to alien icon for users too
                                return (
                                    <img
                                        src={alien}
                                        alt="User avatar"
                                        className="w-5 h-5 object-contain opacity-70"
                                    />
                                )
                            })()
                        )}
                    </div>

                    {/* Small bot icon indicator (no badge, just icon) */}
                    {isBot && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center border border-background">
                            <Bot className="w-1.5 h-1.5 text-white" />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span
                            className="font-semibold text-sm text-foreground group-hover:text-foreground truncate"
                            style={{ color: roleColor || undefined }}
                        >
                            {suggestion.display}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground/80 truncate font-mono">
                            {shortenAddress(suggestion.id)}
                        </span>
                        {profile?.primaryName && !isBot && (
                            <>
                                <span className="text-xs text-muted-foreground/60">•</span>
                                <span className="text-xs text-muted-foreground/80 truncate">
                                    {profile.primaryName}
                                </span>
                            </>
                        )}
                        {isBot && botInfo?.description && (
                            <>
                                <span className="text-xs text-muted-foreground/60">•</span>
                                <span className="text-xs text-muted-foreground/80 truncate">
                                    {botInfo.description}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // Build #channel suggestions from the active server
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

        const serverChannelsList = Array.isArray((server as any)?.channels)
            ? (server as any).channels
            : Object.values((server as any)?.channels || {})
        const filteredChannels = (serverChannelsList as any[])
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

    // Render a rich item for channel suggestions
    const renderChannelSuggestion = (
        suggestion: { id: string; display: string },
        search: string,
        highlightedDisplay: React.ReactNode,
        index: number,
        focused: boolean
    ) => {
        const channelList = Array.isArray((servers[activeServerId] as any)?.channels)
            ? (servers[activeServerId] as any).channels
            : Object.values((servers[activeServerId] as any)?.channels || {})
        const channel = (channelList as any[])?.find((c: any) => c.channelId.toString() === suggestion.id)
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
                <div className="flex-1 min-w-0 text-left">
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
            </div>
        )
    }

    const handleSend = async () => {
        if ((!message.trim() && attachments.length === 0) || isSending) return

        setIsSending(true)
        try {
            if (editingMessage) {
                // Handle message editing
                if (onEditMessage) {
                    await onEditMessage(editingMessage.id, message.trim())
                }
                if (onCancelEdit) {
                    onCancelEdit()
                }
            } else {
                // Handle new message sending
                await onSendMessage(message.trim(), attachments)
                if (replyingTo && onCancelReply) {
                    onCancelReply()
                }
            }
            setMessage("") // Clear input after sending/editing
            setAttachments([]) // Clear attachments
        } catch (error) {
            console.error("Error processing message:", error)
            toast.error(editingMessage ? "Failed to update message" : "Failed to send message")
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
        } else if (e.key === 'Escape') {
            e.preventDefault()
            if (editingMessage && onCancelEdit) {
                onCancelEdit()
            } else if (replyingTo && onCancelReply) {
                onCancelReply()
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

        // File upload to be implemented based on the storage pipeline
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
                                    {getDisplayName(replyingTo.authorId, profiles, activeServerId, servers, bots)}
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
                    {replyingTo.content && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-muted/20">
                            <span className="text-sm text-muted-foreground truncate">
                                {replyingTo.content.length > 100 ? replyingTo.content.substring(0, 100) + "..." : replyingTo.content}
                            </span>
                        </div>
                    )}
                </>
            )}

            {/* Edit indicator */}
            {editingMessage && (
                <div className="flex items-center gap-2 px-4 -mb-3">
                    <Edit className="w-4 h-4 text-amber-500" />
                    <span className="text-sm text-muted-foreground">
                        Editing message
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onCancelEdit}
                    >
                        Cancel
                    </Button>
                </div>
            )}

            {/* Message Input */}
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-4">
                {/* Pending attachments preview */}
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
                        disabled={isSending || disabled || !!editingMessage}
                        title={editingMessage ? "File uploads not available when editing" : "Upload file"}
                    >
                        <Paperclip className="w-4 h-4" />
                    </Button>

                    <div className="relative grow h-fit p-0" ref={mentionsInputRef}>
                        <MentionsInput
                            value={message}
                            onChange={(event, newValue) => setMessage(newValue)}
                            onKeyDown={handleKeyPress}
                            placeholder={editingMessage ? "Edit your message..." : `Message #${channelName || 'channel'}`}
                            disabled={isSending || disabled}
                            singleLine={false}
                            autoFocus
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
                                    // Use the updated getDisplayName function which handles bots properly
                                    const displayName = getDisplayName(id, profiles, activeServerId, servers, bots)
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
                                    const channelList = Array.isArray((servers[activeServerId] as any)?.channels)
                                        ? (servers[activeServerId] as any).channels
                                        : Object.values((servers[activeServerId] as any)?.channels || {})
                                    const channel = (channelList as any[])?.find((c: any) => c.channelId.toString() === id)
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
                        title={editingMessage ? "Save changes" : "Send message"}
                    >
                        {isSending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : editingMessage ? (
                            <Check className="w-4 h-4 text-green-600" />
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
                        {editingMessage ? "Press Enter to save changes, Shift+Enter for new line" : "Press Enter to send, Shift+Enter for new line"}
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

export interface MessagesRef {
    focusInput: () => void;
    focusAndInsertText: (text: string) => void;
}

// InvitePreview Component
interface InvitePreviewProps {
    serverId: string;
    href: string;
}

const InvitePreview: React.FC<InvitePreviewProps> = ({ serverId, href }) => {
    const [serverInfo, setServerInfo] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { actions } = useSubspace();
    const { address } = useWallet();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchServerInfo = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const server = await actions.servers.get(serverId);
                setServerInfo(server);
            } catch (err) {
                console.error('Error fetching server info:', err);
                setError('Failed to load server information');
            } finally {
                setIsLoading(false);
            }
        };

        fetchServerInfo();
    }, [serverId, actions]);

    const handleClick = () => {
        navigate(`/invite/${serverId}`);
    };

    // Check if user is already a member
    const isAlreadyMember = address && serverInfo?.members?.some((member: any) => member.userId === address);

    if (isLoading) {
        return (
            <div className="flex items-center space-x-3 p-4 bg-primary/[2%] border border-primary/10 rounded-lg my-2 max-w-md h-20">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-16" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center space-x-3 p-4 bg-primary/[2%] border border-primary/10 rounded-lg my-2 max-w-md h-20">
                <div className="flex items-center justify-center h-12 w-12 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Invalid Invite</p>
                    <p className="text-xs text-muted-foreground">This invite may have expired or is invalid</p>
                </div>
            </div>
        );
    }

    if (!serverInfo) {
        return (
            <a
                href={href}
                className="text-blue-500 hover:underline cursor-pointer transition-colors"
                target="_blank"
                rel="noopener noreferrer"
            >
                {href}
            </a>
        );
    }

    const serverIcon = serverInfo.logo
        ? `https://arweave.net/${serverInfo.logo}`
        : null;

    const memberText = serverInfo.memberCount
        ? `${serverInfo.memberCount} member${serverInfo.memberCount !== 1 ? 's' : ''}`
        : 'Unknown members';

    return (
        <>
            <Link to={href} target="_blank" className="text-blue-500 hover:underline cursor-pointer transition-colors">{href.replace("https://", "")}</Link>
            <div
                className="flex items-center space-x-3 p-4 bg-primary/[2%] border border-primary/10 rounded-lg my-2 max-w-md cursor-pointer hover:bg-primary/[4%] transition-colors h-20"
                onClick={handleClick}
            >
                <div className="flex items-center justify-center h-12 w-12 bg-primary/10 rounded-lg overflow-hidden">
                    {serverIcon ? (
                        <img
                            src={serverIcon}
                            alt={serverInfo.name || 'Server'}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <Shield className="h-6 w-6 text-primary" />
                    )}
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-sm font-medium text-foreground truncate">
                        {serverInfo.name || `Server ${serverId.substring(0, 8)}...`}
                    </p>
                    <p className="text-xs text-muted-foreground truncate line-clamp-1">
                        {serverInfo.description || ``}
                    </p>
                    <div className="flex items-center space-x-2 text-xs mt-1 text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{memberText}</span>
                    </div>
                </div>
                {isAlreadyMember ? (
                    <Button size="sm" variant="outline" disabled className="shrink-0">
                        <UserCheck className="h-3 w-3 mr-1" />
                        Joined
                    </Button>
                ) : (
                    <Button size="sm" variant="outline" className="shrink-0">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Join
                    </Button>
                )}
            </div>
        </>

    );
};

// const Messages = React.forwardRef<MessagesRef, {
//     className?: string;
//     onToggleMemberList?: () => void;
//     showMemberList?: boolean;
// }>(({ className, onToggleMemberList, showMemberList }, ref) => {
function Messages({ className, onToggleMemberList, showMemberList, ref }: { className?: string, onToggleMemberList?: () => void, showMemberList?: boolean, ref: React.RefObject<MessagesRef> }) {
    const { activeServerId, activeChannelId } = useGlobalState();
    const { servers, profile, profiles, actions, subspace, messages: messagesState } = useSubspace();
    const { shouldUseOverlays } = useMobileContext();

    const server = servers[activeServerId];
    const serverChannelsList = Array.isArray((server as any)?.channels)
        ? (server as any).channels
        : Object.values((server as any)?.channels || {})
    const channel = (serverChannelsList as any[]).find((c: any) => c.channelId == activeChannelId);
    const messages = (messagesState[activeServerId]?.[activeChannelId]) || {}; // messageId:Message

    // State
    const [loading, setLoading] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [editingMessage, setEditingMessage] = useState<{ id: string; content: string } | null>(null);
    const [initialMessagesLoaded, setInitialMessagesLoaded] = useState(false);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<MessageInputRef>(null);

    // Message fetching state with request limiting
    const [isMessageFetchingActive, setIsMessageFetchingActive] = useState(false);
    const messageFetchIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Request limiting system - track active requests and prevent more than 5 concurrent
    const activeRequestsRef = useRef<Set<string>>(new Set());
    const requestQueueRef = useRef<Array<() => void>>([]);
    const pendingRequestsRef = useRef<Set<string>>(new Set()); // Track pending requests to prevent duplicates
    const MAX_CONCURRENT_REQUESTS = 5;
    const REQUEST_TIMEOUT = 30000; // 30 seconds timeout for requests
    const MIN_REQUEST_INTERVAL = 250; // Minimum 250ms between requests for faster responsiveness
    const lastRequestTimeRef = useRef<number>(0);

    // Expose focusInput method to parent component
    React.useImperativeHandle(ref, () => ({
        focusInput: () => {
            inputRef.current?.focus();
        },
        focusAndInsertText: (text: string) => {
            inputRef.current?.focusAndInsertText(text);
        }
    }));

    // State for scroll position tracking
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [hasScrolledToBottomOnLoad, setHasScrolledToBottomOnLoad] = useState(false);
    const [previousMessageCount, setPreviousMessageCount] = useState(0);
    const [dynamicThreshold, setDynamicThreshold] = useState(200); // Dynamic threshold based on message heights

    // Clear reply state when channel changes
    useEffect(() => {
        setReplyingTo(null);
        setEditingMessage(null);
        setInitialMessagesLoaded(false); // Reset initial load state when channel changes
        setIsAtBottom(true); // Always assume we want to be at bottom when switching channels
        setHasScrolledToBottomOnLoad(false); // Reset scroll state for new channel
        setPreviousMessageCount(0); // Reset message count for new channel

        // Clear any pending requests when channel changes
        pendingRequestsRef.current.clear();
        lastRequestTimeRef.current = 0;

        // Immediately scroll to bottom when channel becomes active
        // This ensures instant positioning even before messages load
        const container = messagesContainerRef.current;
        if (container && activeChannelId) {
            container.scrollTop = container.scrollHeight;
        }
    }, [activeChannelId]);

    // Request management functions
    const executeRequest = async (requestId: string, requestFn: () => Promise<void>) => {
        // Check if we're already at max concurrent requests
        if (activeRequestsRef.current.size >= MAX_CONCURRENT_REQUESTS) {
            // Queue this request for later execution
            return new Promise<void>((resolve, reject) => {
                requestQueueRef.current.push(async () => {
                    try {
                        await executeRequest(requestId, requestFn);
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });
            });
        }

        // Add to active requests
        activeRequestsRef.current.add(requestId);

        // Set timeout to prevent hanging requests
        const timeoutId = setTimeout(() => {
            activeRequestsRef.current.delete(requestId);
            processQueue(); // Process next queued request
        }, REQUEST_TIMEOUT);

        try {
            await requestFn();
        } catch (error) {
            // Request failed, but continue processing
        } finally {
            // Clean up
            clearTimeout(timeoutId);
            activeRequestsRef.current.delete(requestId);
            processQueue(); // Process next queued request
        }
    };

    const processQueue = () => {
        // Process queued requests if we have capacity
        while (requestQueueRef.current.length > 0 && activeRequestsRef.current.size < MAX_CONCURRENT_REQUESTS) {
            const nextRequest = requestQueueRef.current.shift();
            if (nextRequest) {
                nextRequest();
            }
        }
    };

    const generateRequestId = () => `fetch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Check if we should throttle requests
    const shouldThrottleRequest = () => {
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTimeRef.current;
        return timeSinceLastRequest < MIN_REQUEST_INTERVAL;
    };

    // Calculate dynamic threshold based on the height of the last 2 messages
    const calculateDynamicThreshold = useCallback(() => {
        const container = messagesContainerRef.current;
        if (!container) return 200; // fallback to default

        const messageElements = container.querySelectorAll('[data-message-id]');
        if (messageElements.length < 2) return 200; // fallback if not enough messages

        // Get the last 2 message elements
        const lastMessage = messageElements[messageElements.length - 1] as HTMLElement;
        const secondLastMessage = messageElements[messageElements.length - 2] as HTMLElement;

        if (!lastMessage || !secondLastMessage) return 200;

        // Calculate combined height of last 2 messages with some padding
        const lastMessageHeight = lastMessage.offsetHeight;
        const secondLastMessageHeight = secondLastMessage.offsetHeight;
        const combinedHeight = lastMessageHeight + secondLastMessageHeight;

        // Add 50px padding and ensure minimum of 200px for safety
        const threshold = Math.max(combinedHeight + 50, 200);

        // Debug logging (can be removed in production)
        if (process.env.NODE_ENV === 'development') {
            console.log(`Dynamic threshold calculated: ${threshold}px (last: ${lastMessageHeight}px, second-last: ${secondLastMessageHeight}px)`);
        }

        return threshold;
    }, []);

    // Update dynamic threshold when messages change
    useEffect(() => {
        // Small delay to ensure DOM elements are properly rendered
        const timeoutId = setTimeout(() => {
            const newThreshold = calculateDynamicThreshold();
            setDynamicThreshold(newThreshold);
        }, 50);

        return () => clearTimeout(timeoutId);
    }, [messages, calculateDynamicThreshold]);



    // MESSAGE FETCHING: Activate message fetching loop when channel becomes active
    useEffect(() => {
        if (!activeServerId || !activeChannelId || !subspace || !server || !channel) {
            // Stop message fetching if conditions aren't met
            if (messageFetchIntervalRef.current) {
                clearInterval(messageFetchIntervalRef.current)
                messageFetchIntervalRef.current = null
            }
            setIsMessageFetchingActive(false)
            return
        }

        // Always start fresh message fetching for the new channel
        setIsMessageFetchingActive(true)
        setLoading(true) // Show loading state for initial fetch

        // Clear any existing interval
        if (messageFetchIntervalRef.current) {
            clearInterval(messageFetchIntervalRef.current)
            messageFetchIntervalRef.current = null
        }

        // Initial fetch
        fetchMessages()

        // Set up polling interval (every 1.1 seconds instead of 1 second to reduce load)
        messageFetchIntervalRef.current = setInterval(() => {
            // Only fetch if we still have the required conditions and not throttled
            if (activeServerId && activeChannelId && subspace && server && channel && !shouldThrottleRequest()) {
                fetchMessages()
            }
        }, 1100) // Optimized to 1.1s for better responsiveness with bots

        // Cleanup function
        return () => {
            if (messageFetchIntervalRef.current) {
                clearInterval(messageFetchIntervalRef.current)
                messageFetchIntervalRef.current = null
            }
            setIsMessageFetchingActive(false)
        }
    }, [activeServerId, activeChannelId, subspace, server, channel])

    // Heartbeat effect to ensure the interval keeps running
    useEffect(() => {
        if (!isMessageFetchingActive || !messageFetchIntervalRef.current) return

        // Set up a heartbeat to check if the interval is still running
        const heartbeatInterval = setInterval(() => {
            if (messageFetchIntervalRef.current && activeServerId && activeChannelId && subspace && server && channel && !shouldThrottleRequest()) {
                // Force a message fetch to ensure the loop is working
                fetchMessages()
            }
        }, 30000) // Increased from 10000ms to 30000ms

        return () => {
            clearInterval(heartbeatInterval)
        }
    }, [isMessageFetchingActive, activeServerId, activeChannelId, subspace, server, channel])

    // Cleanup effect to ensure interval is cleared on unmount
    useEffect(() => {
        return () => {
            if (messageFetchIntervalRef.current) {
                clearInterval(messageFetchIntervalRef.current)
                messageFetchIntervalRef.current = null
            }
            setIsMessageFetchingActive(false)

            // Clear any pending requests
            activeRequestsRef.current.clear()
            requestQueueRef.current.length = 0
            pendingRequestsRef.current.clear();
        }
    }, [])

    // Additional cleanup when component becomes inactive
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setIsMessageFetchingActive(false);
                if (messageFetchIntervalRef.current) {
                    clearInterval(messageFetchIntervalRef.current);
                    messageFetchIntervalRef.current = null;
                }
            } else {
                if (activeServerId && activeChannelId && subspace && server && channel) {
                    setIsMessageFetchingActive(true);
                    // Immediately fetch messages when page becomes visible to catch up
                    if (!shouldThrottleRequest()) {
                        fetchMessages();
                    }
                    // Restart the interval
                    if (!messageFetchIntervalRef.current) {
                        messageFetchIntervalRef.current = setInterval(() => {
                            if (activeServerId && activeChannelId && subspace && server && channel && !shouldThrottleRequest()) {
                                fetchMessages()
                            }
                        }, 1500);
                    }
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [activeServerId, activeChannelId, subspace, server, channel]);

    // Fetch messages for the current channel with request limiting
    const fetchMessages = async () => {
        if (!activeServerId || !activeChannelId || !subspace) {
            return
        }

        // Check if we should throttle this request
        if (shouldThrottleRequest()) {
            return;
        }

        // Check if there's already a pending request for this channel
        const channelKey = `${activeServerId}-${activeChannelId}`;
        if (pendingRequestsRef.current.has(channelKey)) {
            return;
        }

        const requestId = generateRequestId();

        // Mark this channel as having a pending request
        pendingRequestsRef.current.add(channelKey);

        try {
            await executeRequest(requestId, async () => {
                try {
                    // Update last request time
                    lastRequestTimeRef.current = Date.now();

                    await actions.servers.getMessages(activeServerId, activeChannelId, 100)

                    // Mark initial load as complete
                    if (!initialMessagesLoaded) {
                        setInitialMessagesLoaded(true)
                        setLoading(false)
                    }
                } catch (error) {
                    // Still mark as loaded to avoid infinite loading state
                    if (!initialMessagesLoaded) {
                        setInitialMessagesLoaded(true)
                        setLoading(false)
                    }
                    // Don't let errors stop the loop - it will continue trying
                }
            });
        } catch (error) {
            // Failed to execute message fetch request
        } finally {
            // Remove from pending requests
            pendingRequestsRef.current.delete(channelKey);
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

    // Scroll event listener to track if user is at bottom
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            // Use dynamic threshold based on last 2 messages height
            const atBottom = scrollHeight - scrollTop - clientHeight <= dynamicThreshold;

            // Only update state if it actually changed to prevent unnecessary re-renders
            setIsAtBottom(prev => {
                if (prev !== atBottom) {
                    return atBottom;
                }
                return prev;
            });
        };

        // Use passive listener for better performance
        container.addEventListener('scroll', handleScroll, { passive: true });

        // Immediate initial check when channel changes - no delay needed
        handleScroll();

        return () => {
            container.removeEventListener('scroll', handleScroll);
        };
    }, [activeChannelId, dynamicThreshold]); // Re-run when channel changes or threshold updates

    // Initial scroll to bottom when messages first load
    useEffect(() => {
        const messageCount = Object.keys(messages).length;

        // Scroll to bottom on initial load or when switching to a channel with messages
        if (messageCount > 0 && !hasScrolledToBottomOnLoad && initialMessagesLoaded) {
            // Immediate scroll without delay for instant response
            const container = messagesContainerRef.current;
            if (container) {
                // Force immediate scroll to bottom
                container.scrollTop = container.scrollHeight;
                setHasScrolledToBottomOnLoad(true);
                setIsAtBottom(true);

                // Double-check with requestAnimationFrame in case DOM isn't fully ready
                requestAnimationFrame(() => {
                    if (container.scrollHeight > container.clientHeight) {
                        container.scrollTop = container.scrollHeight;
                    }
                });
            }
        }
    }, [messages, hasScrolledToBottomOnLoad, initialMessagesLoaded]);

    // Auto-scroll to bottom when new messages arrive (only if already at bottom)
    useEffect(() => {
        const currentMessageCount = Object.keys(messages).length;

        // Only auto-scroll if:
        // 1. We have messages
        // 2. Initial scroll has been done
        // 3. User was near bottom
        // 4. Message count has increased (new messages arrived)
        if (currentMessageCount > 0 && hasScrolledToBottomOnLoad && isAtBottom && currentMessageCount > previousMessageCount) {
            // Use a small delay to ensure the DOM has updated with new messages
            const timeoutId = setTimeout(() => {
                const container = messagesContainerRef.current;
                if (container) {
                    // Check current scroll position with the dynamic threshold
                    const { scrollTop, scrollHeight, clientHeight } = container;
                    const stillNearBottom = scrollHeight - scrollTop - clientHeight <= dynamicThreshold;

                    // If user is still near bottom (including 2nd last message), auto-scroll
                    if (stillNearBottom) {
                        scrollToBottom(true); // Smooth scroll for new messages
                    }
                }
            }, 100); // Slightly longer delay to ensure DOM is fully updated

            return () => clearTimeout(timeoutId);
        }

        // Update previous message count
        setPreviousMessageCount(currentMessageCount);
    }, [messages, isAtBottom, hasScrolledToBottomOnLoad, previousMessageCount, dynamicThreshold]);

    // Focus input when replying or editing
    useEffect(() => {
        if (replyingTo || editingMessage) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [replyingTo, editingMessage]);

    const scrollToBottom = (smooth: boolean = true) => {
        const container = messagesContainerRef.current;
        if (!container) return;

        if (smooth) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        } else {
            // Instant scroll for initial loads
            container.scrollTop = container.scrollHeight;
        }

        // Set isAtBottom to true after scrolling
        setTimeout(() => {
            setIsAtBottom(true);
        }, smooth ? 300 : 50); // Wait for smooth scroll to complete
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
                channelId: String(activeChannelId),
                content: content.trim(),
                replyTo: replyingTo?.messageId ? String(replyingTo.messageId) : undefined,
                attachments: JSON.stringify(attachments)
            });

            if (success) {
                setReplyingTo(null);
                // Always scroll to bottom when user sends a message
                setIsAtBottom(true); // Immediately set to true since user is sending
                setTimeout(() => {
                    scrollToBottom(true); // Smooth scroll for user's own message
                }, 100);

                // Immediately fetch messages after sending to reduce perceived delay
                setTimeout(() => {
                    fetchMessages()
                }, 200) // Reduced from 1000ms to 200ms for faster feedback
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
            // Ensure both channelId and messageId are strings
            const success = await actions.servers.editMessage(activeServerId, String(activeChannelId), String(messageId), content.trim());

            if (success) {
                setEditingMessage(null);
                toast.success("Message updated!");

                // Immediately refresh messages after editing to show changes
                setTimeout(() => {
                    fetchMessages()
                }, 200) // Reduced from 500ms to 200ms for faster feedback
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
            // Ensure both channelId and messageId are strings
            const success = await actions.servers.deleteMessage(activeServerId, String(activeChannelId), String(messageId));
            if (!success) {
                throw new Error("Failed to delete message");
            }

            // Immediately refresh messages after deletion to show changes
            setTimeout(() => {
                fetchMessages()
            }, 200) // Reduced from 500ms to 200ms for faster feedback
        } catch (error) {
            console.error("Failed to delete message:", error);
            throw error; // Re-throw to be handled by the toast.promise
        }
    };

    const handleReply = (messageId: string) => {
        const message = messages[messageId];
        if (message) {
            setReplyingTo(message);
            setEditingMessage(null);
            inputRef.current?.focus();
        }
    };

    const handleEdit = (messageId: string, content: string) => {
        setEditingMessage({ id: String(messageId), content });
        setReplyingTo(null);
        inputRef.current?.focus();
    };

    const handleJumpToMessage = (messageId: string) => {
        // Find the message element and scroll to it
        const messageElement = document.querySelector(`[data-message-id="${String(messageId)}"]`);
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
                        Available channels: {(() => {
                            const list = Array.isArray((server as any)?.channels)
                                ? (server as any).channels
                                : Object.values((server as any)?.channels || {})
                            return (list as any[]).map((c: any) => c.name).join(', ') || 'None'
                        })()}
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
            {/* Channel header - hidden on mobile because a dedicated MobileHeader is used there */}
            {!shouldUseOverlays && (
                <ChannelHeader
                    channelName={channel.name}
                    memberCount={server.memberCount}
                    onToggleMemberList={onToggleMemberList}
                    showMemberList={showMemberList}
                />
            )}

            {/* Scrollable message timeline */}
            <div
                key={`${activeServerId}-${activeChannelId}`}
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/40 relative"
            >
                {loading && Object.keys(messages).length === 0 ? (
                    <div className="pt-6 mb-0.5">
                        {Array.from({ length: 15 }, (_, index) => (
                            <div key={`skeleton-${index}`} className="group relative hover:bg-accent/30 transition-colors duration-150 pt-3 pb-1 px-4">
                                <div className="flex gap-3">
                                    <div className="w-10 flex-shrink-0 flex justify-center">
                                        <Skeleton className="w-10 h-10 rounded-full" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-center gap-2 mb-1">
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
                ) : Object.keys(messages).length === 0 ? (
                    <EmptyChannelState channelName={channel.name} />
                ) : (
                    <div className="pt-6">
                        {(() => {
                            // Convert object map into a timestamp-sorted array
                            const messagesArray = Object.values(messages).sort((a, b) => a.timestamp - b.timestamp);

                            return messagesArray.map((message, index) => {
                                const prevMessage = index > 0 ? messagesArray[index - 1] : null;
                                const shouldShowDateDivider = index === 0 || (prevMessage && !isSameDay(prevMessage.timestamp, message.timestamp));
                                const shouldShowAvatar = index === 0 || shouldShowDateDivider || (prevMessage && prevMessage.authorId !== message.authorId);
                                const isGrouped = index > 0 && !shouldShowDateDivider && prevMessage && prevMessage.authorId === message.authorId;

                                return (
                                    <React.Fragment key={message.messageId}>
                                        {/* Insert date divider when day changes */}
                                        {shouldShowDateDivider && (
                                            <DateDivider timestamp={message.timestamp} />
                                        )}

                                        {/* Individual message */}
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
                                );
                            });
                        })()}
                        <div ref={messagesEndRef} />
                    </div>
                )}

                {/* Quick jump to the latest messages when user has scrolled up */}
                {!isAtBottom && Object.keys(messages).length > 0 && (
                    <div className="fixed bottom-20 mx-auto w-12 z-10">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={() => {
                                            setIsAtBottom(true); // Immediately set to true since user wants to go to bottom
                                            scrollToBottom(true); // Smooth scroll when user clicks button
                                        }}
                                        size="sm"
                                        className="h-9 w-9 rounded-full shadow-lg bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-background/90 transition-all duration-200"
                                        variant="outline"
                                    >
                                        <ArrowBigDownDash className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right" align="center">
                                    <p>Scroll to bottom</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                )}
            </div>

            {/* Composer with mentions */}
            <MessageInput
                ref={inputRef}
                onSendMessage={sendMessage}
                onEditMessage={editMessage}
                replyingTo={replyingTo}
                editingMessage={editingMessage}
                onCancelReply={() => setReplyingTo(null)}
                onCancelEdit={() => setEditingMessage(null)}
                disabled={!server || !channel || !subspace}
                channelName={channel?.name}
                messagesInChannel={Object.values(messages)}
                servers={servers}
                activeServerId={activeServerId}
                activeChannelId={activeChannelId}
            />
        </div>
    );
}

export default Messages