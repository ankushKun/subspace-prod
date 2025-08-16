import { cn } from "@/lib/utils";
import { useGlobalState } from "@/hooks/use-global-state";
import { useSubspace } from "@/hooks/use-subspace";
import { useMobileContext } from "@/hooks/use-mobile";
import { useWallet } from "@/hooks/use-wallet";
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
    MessageCircle,
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
    Shield
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
import { mdComponents } from "@/lib/md-components";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

import alien from "@/assets/subspace/alien-green.svg"
import ProfilePopover from "./profile-popover"
import type { DMMessage } from "@subspace-protocol/sdk";

// Compact long wallet addresses for readability in tight UI areas
const shortenAddress = (address: string) => {
    if (!address) return '';
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Resolve a human-friendly display name for a userId.
// Priority: profile primaryName → shortened address.
const getDisplayName = (userId: string, profiles: Record<string, any>) => {
    const profile = profiles[userId]
    if (profile?.primaryName) return profile.primaryName
    return shortenAddress(userId)
};

// DM header: shows the peer’s identity and a minimal navigation control.
// Kept intentionally minimal to maximize space for messages.
const DMHeader = ({ friendId, friendProfile }: {
    friendId: string;
    friendProfile?: any;
}) => {
    const [isNotificationMuted, setIsNotificationMuted] = useState(false)
    const navigate = useNavigate()

    const displayName = getDisplayName(friendId, { [friendId]: friendProfile })

    return (
        <div className="flex items-center justify-between px-4 py-3 pr-2 border-b border-border/50 bg-background/80 backdrop-blur-sm relative z-10">
            {/* Friend identity with profile popover */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <ProfilePopover userId={friendId} side="bottom" align="start">
                    <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                        <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex-shrink-0 flex items-center justify-center overflow-hidden border border-border/20">
                            {friendProfile?.pfp || friendProfile?.primaryLogo ? (
                                <img
                                    src={`https://arweave.net/${friendProfile.pfp || friendProfile.primaryLogo}`}
                                    alt={displayName}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <img
                                    src={alien}
                                    alt="Default avatar"
                                    className="w-5 h-5 object-contain opacity-30"
                                />
                            )}
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-base font-semibold text-foreground truncate">
                                {displayName}
                            </h1>
                            <p className="text-xs text-muted-foreground truncate">
                                Direct Message
                            </p>
                        </div>
                    </div>
                </ProfilePopover>
            </div>

            {/* Context actions for the DM view (kept lean) */}
            <div className="flex items-center justify-center gap-1 h-full">
                <div className="w-px h-6 bg-border/50 mx-1" />

                <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => navigate('/app')}
                    className="h-8 w-8 hover:bg-muted/50 transition-colors items-center justify-center text-muted-foreground hover:text-foreground"
                    title="Back to servers"
                >
                    <ArrowBigDownDash className="w-4 h-4" />
                </Button>
            </div>
        </div>
    )
}

// Memoized avatar to avoid re-rendering on unrelated state changes.
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
            {profile?.pfp ? (
                <img
                    src={`https://arweave.net/${profile.pfp}`}
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

// Compact timestamp with rich title tooltip for exact date-time.
const MessageTimestamp = memo(({ timestamp, showDate = false, className, ...props }: { timestamp: number, showDate?: boolean } & React.HTMLAttributes<HTMLSpanElement>) => {
    const date = new Date(timestamp)

    const displayString = showDate
        ? `${date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`
        : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })

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

// Hover actions for a single DM. Only the author can edit/delete (client-side UX guard).
// Server enforces permissions; this simply avoids showing impossible actions.
const MessageActions = ({ message, onReply, onEdit, onDelete }: {
    message: DMMessage;
    onReply?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
}) => {
    const { profile } = useSubspace()

    // Show edit/delete only to the author (avoid confusing non-actionable controls)
    const canEdit = message.senderId === profile?.userId
    const canDelete = message.senderId === profile?.userId

    function copyFingerprint() {
        navigator.clipboard.writeText(message.id)
        toast.success("Message ID copied to clipboard")
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

// Renders message content and attachments. Avoids <img> in Markdown for safety.
const MessageContent = memo(({ content, attachments }: {
    content: string;
    attachments?: string | string[];
}) => {
    // Parse attachments lazily; tolerate invalid JSON by falling back to an empty list.
    const parsedAttachments = useMemo(() => {
        if (!attachments) return []
        try {
            return typeof attachments === 'string' ? JSON.parse(attachments) : attachments
        } catch {
            return []
        }
    }, [attachments])

    // If the message is emoji-only (<=10), render larger for expressive emphasis.
    const isEmojiOnly = /^\p{Emoji}{1,10}$/u.test(content)

    return (
        <div className="">
            {/* Text content (Markdown-rendered, images disallowed) */}
            {content && (
                <div className={cn(
                    "text-sm whitespace-pre-wrap break-words max-w-[80vw] text-left md:max-w-full text-foreground leading-relaxed",
                    isEmojiOnly ? "text-3xl" : ""
                )}>
                    <Markdown
                        skipHtml
                        remarkPlugins={[remarkGfm, remarkBreaks]}
                        rehypePlugins={[rehypeKatex]}
                        disallowedElements={["img"]}
                        components={mdComponents}
                    >
                        {content}
                    </Markdown>
                </div>
            )}

            {/* Inline attachments; images open in a lightweight dialog viewer */}
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

// Day separator to reduce visual noise and help temporal orientation.
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
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            <div className="relative bg-background px-2.5 py-0.5 flex items-center justify-center rounded-full border border-border/50 shadow-sm">
                <span className="text-xs font-medium text-muted-foreground">
                    {formatDate(timestamp)}
                </span>
            </div>
        </div>
    )
})

DateDivider.displayName = "DateDivider"

// Empty state shown when no conversation is selected or loaded.
const EmptyDMState = memo(({ friendName }: { friendName?: string }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
                <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/8 rounded-full blur-2xl animate-pulse delay-1000" />
                <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-primary/3 rounded-full blur-2xl animate-pulse delay-2000" />
            </div>

            <div className="relative z-10 space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-700">
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500 scale-110" />

                    <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-background via-background/90 to-background/80 border border-border/50 shadow-2xl shadow-primary/10 flex items-center justify-center group-hover:scale-105 transition-all duration-300">
                        <div className="absolute inset-2 rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-primary/5 opacity-80" />
                        <MessageCircle className="w-10 h-10 text-primary relative z-10 drop-shadow-lg group-hover:scale-110 transition-transform duration-300" />
                        <div className="absolute inset-0 rounded-3xl shadow-inner shadow-black/5" />
                    </div>
                </div>

                <div className="space-y-3">
                    <h3 className="text-2xl font-bold bg-gradient-to-br from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent leading-tight">
                        Start chatting with {friendName || 'your friend'}!
                    </h3>

                    <div className="space-y-2">
                        <p className="text-muted-foreground/80 text-base leading-relaxed max-w-md mx-auto">
                            This is the beginning of your direct message conversation.
                        </p>
                        <p className="text-muted-foreground/60 text-sm leading-relaxed max-w-sm mx-auto">
                            Send your first message below to get started.
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-center space-x-3 opacity-30">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary/60 to-primary/40 animate-pulse" />
                    <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-primary/40 to-primary/20 animate-pulse delay-150" />
                    <div className="w-1 h-1 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 animate-pulse delay-300" />
                </div>
            </div>
        </div>
    )
})

EmptyDMState.displayName = "EmptyDMState"

interface DMMessageItemProps {
    message: DMMessage;
    profile: any;
    onReply: (messageId: string) => void;
    onEdit: (messageId: string, content: string) => void;
    onDelete: (messageId: string) => void;
    isOwnMessage: boolean;
    showAvatar?: boolean;
    isGrouped?: boolean;
}

const DMMessageItem = memo(({ message, profile, onReply, onEdit, onDelete, isOwnMessage, showAvatar = true, isGrouped = false }: DMMessageItemProps) => {
    const [isHovered, setIsHovered] = useState(false);
    const { profiles } = useSubspace()

    return (
        <div
            className={cn(
                "group relative hover:bg-accent/30 transition-colors duration-150 px-1",
                isGrouped ? "py-0.5" : "pt-2 pb-1 px-1"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="flex gap-2">
                {/* Avatar when starting a block; otherwise a hoverable timestamp spacer */}
                <div className="w-12 flex-shrink-0 flex justify-center cursor-pointer h-fit">
                    {showAvatar ? (
                        <ProfilePopover userId={message.senderId} side="right" align="start">
                            <div className="cursor-pointer">
                                <MessageAvatar authorId={message.senderId} />
                            </div>
                        </ProfilePopover>
                    ) : (
                        <div data-hovered={isHovered} className="data-[hovered=true]:opacity-100 data-[hovered=false]:opacity-0 transition-opacity duration-150 text-xs mt-0.5 h-fit text-center">
                            <MessageTimestamp timestamp={message.timestamp} />
                        </div>
                    )}
                </div>

                {/* Message content */}
                <div className="min-w-0">
                    {showAvatar && (
                        <div className="flex items-baseline gap-2 mb-1">
                            <ProfilePopover userId={message.senderId} side="bottom" align="start">
                                <span className="hover:underline cursor-pointer font-medium text-foreground text-sm transition-colors hover:text-primary">
                                    {getDisplayName(message.senderId, profiles)}
                                </span>
                            </ProfilePopover>
                            <MessageTimestamp timestamp={message.timestamp} showDate={new Date(message.timestamp).toDateString() !== new Date().toDateString()} />
                            {/* DM types currently lack an edited flag; consider adding when server supports edits */}
                        </div>
                    )}

                    <MessageContent
                        content={message.content}
                        attachments={message.attachments}
                    />
                </div>
            </div>

            {/* Hover-revealed controls to keep the layout clean */}
            {isHovered && (
                <MessageActions
                    message={message}
                    onReply={() => onReply(message.id)}
                    onEdit={() => onEdit(message.id, message.content)}
                    onDelete={() => onDelete(message.id)}
                />
            )}
        </div>
    );
})

DMMessageItem.displayName = "DMMessageItem"

// DM input: exposes focus helpers to parent and optimizes for desktop typing flow.
interface DMMessageInputRef {
    focus: () => void;
    blur: () => void;
    focusAndInsertText: (text: string) => void;
}

interface DMMessageInputProps {
    onSendMessage: (content: string, attachments?: string[]) => void;
    disabled?: boolean;
    friendName?: string;
}

const DMMessageInput = React.forwardRef<DMMessageInputRef, DMMessageInputProps>(({
    onSendMessage,
    disabled = false,
    friendName
}, ref) => {
    const [message, setMessage] = useState("")
    const [isSending, setIsSending] = useState(false)
    const [attachments, setAttachments] = useState<string[]>([])
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const isMobile = useIsMobile()

    // Imperative focus API so parent views can capture keystrokes and focus this input.
    React.useImperativeHandle(ref, () => ({
        focus: () => {
            if (isMobile) return
            // Delay allows the DOM to settle before focusing to avoid scroll jank
            setTimeout(() => {
                textareaRef.current?.focus()
            }, 100)
        },
        focusAndInsertText: (text: string) => {
            if (isMobile) return
            setTimeout(() => {
                // Append text at the end to support quick reply shortcuts
                setMessage(prev => prev + text)
                textareaRef.current?.focus()
            }, 50)
        },
        blur: () => {
            textareaRef.current?.blur()
        }
    }))

    const handleSend = async () => {
        if ((!message.trim() && attachments.length === 0) || isSending) return // no-ops for empty or in-flight

        setIsSending(true)
        try {
            await onSendMessage(message.trim(), attachments)
            setMessage("") // Reset input after sending
            setAttachments([]) // Reset attachments
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
        toast.info("File upload not implemented yet")
    }

    return (
        <div className="backdrop-blur-sm">
            {/* Pending attachments preview (pre-upload) */}
            {
                attachments.length > 0 && (
                    <div className="mx-4 mb-3 p-2 border border-border rounded-lg bg-muted/30">
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
                )
            }

            {/* Core input row: upload, textarea, send */}
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-4">
                <div className="flex items-end border gap-0.5 rounded p-0.5">
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

                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder={`Message ${friendName || 'your friend'}`}
                        disabled={isSending || disabled}
                        className="flex-1 resize-none bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground min-h-[44px] max-h-32 py-3 px-3"
                        rows={1}
                        style={{
                            minHeight: '44px',
                            height: message.split('\n').length > 1 ? `${Math.min(message.split('\n').length * 20 + 24, 128)}px` : '44px'
                        }}
                    />

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

                {/* Hidden file input triggers OS file picker */}
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

DMMessageInput.displayName = "DMMessageInput"

export interface DMMessagesRef {
    focusInput: () => void;
    focusAndInsertText: (text: string) => void;
}

const DMMessages = React.forwardRef<DMMessagesRef, {
    className?: string;
}>(({ className }, ref) => {
    const { activeFriendId } = useGlobalState();
    const { friends, dmConversations, profile, profiles, actions, subspace, loadingDMs } = useSubspace();
    const { shouldUseOverlays } = useMobileContext();

    // Messages are read directly from the store (see workspace rule: UI reads state directly)
    const [replyingTo, setReplyingTo] = useState<DMMessage | null>(null);
    const [editingMessage, setEditingMessage] = useState<{ id: string; content: string } | null>(null);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<DMMessageInputRef>(null);

    // Allow parent page to focus or prefill this input on global keystrokes
    React.useImperativeHandle(ref, () => ({
        focusInput: () => {
            inputRef.current?.focus();
        },
        focusAndInsertText: (text: string) => {
            inputRef.current?.focusAndInsertText(text);
        }
    }));

    // Track whether the viewport is near the bottom to control auto-scroll behavior
    const [isAtBottom, setIsAtBottom] = useState(true);

    // Get current friend and conversation
    const friend = activeFriendId ? friends[activeFriendId] : null;
    const conversation = activeFriendId ? dmConversations[activeFriendId] : null;
    const messagesList = useMemo(() => {
        const map = conversation?.messages || {};
        return Object.values(map).sort((a: DMMessage, b: DMMessage) => a.timestamp - b.timestamp);
    }, [conversation?.messages]);
    const isLoading = !!(activeFriendId && loadingDMs.has(activeFriendId));

    // Grouping helper to determine when to show date dividers
    const isSameDay = (timestamp1: number, timestamp2: number) => {
        const date1 = new Date(timestamp1)
        const date2 = new Date(timestamp2)
        return date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate()
    }

    // When the active DM changes, reset scroll and focus input.
    // Actual fetching is centralized inside DataLoader.
    useEffect(() => {
        if (!activeFriendId) {
            setIsAtBottom(true);
            return;
        }

        // Reset scroll state when switching conversations
        setIsAtBottom(true);

        // Nudge focus to the input for faster typing
        setTimeout(() => {
            inputRef.current?.focus();
        }, 150);

        // Fetching is centralized in DataLoader
    }, [activeFriendId]);



    // Fetching/polling is centralized in DataLoader

    // Observe scroll position to avoid fighting the user when they’re reading history
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const threshold = 100; // consider "at bottom" within 100px to reduce jitter
            const atBottom = scrollHeight - scrollTop - clientHeight <= threshold;
            setIsAtBottom(atBottom);
        };

        container.addEventListener('scroll', handleScroll);
        handleScroll(); // Initial check

        return () => {
            container.removeEventListener('scroll', handleScroll);
        };
    }, []);

    // Auto-scroll only when the user is already near the bottom to prevent context loss
    useEffect(() => {
        if (isAtBottom && messagesList.length > 0) {
            const timeoutId = setTimeout(() => {
                const container = messagesContainerRef.current;
                if (container && isAtBottom) {
                    const { scrollTop, scrollHeight, clientHeight } = container;
                    const threshold = 100;
                    const stillAtBottom = scrollHeight - scrollTop - clientHeight <= threshold;

                    if (stillAtBottom) {
                        scrollToBottom();
                    }
                }
            }, 50);

            return () => clearTimeout(timeoutId);
        }
    }, [messagesList]);

    // Loading and refreshing are centralized in DataLoader

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const sendMessage = async (content: string, attachments: string[] = []) => {
        if ((!content.trim() && attachments.length === 0) || !activeFriendId || !subspace) return;

        try {
            const success = await actions.dms.sendMessage(activeFriendId, {
                content: content.trim(),
                attachments: JSON.stringify(attachments)
            });

            if (success) {
                setReplyingTo(null);
                // Scroll to bottom after sending so the user sees their message immediately
                setTimeout(() => {
                    scrollToBottom();
                    setTimeout(() => setIsAtBottom(true), 100);
                }, 100);
                // toast.success("Message sent!");
            } else {
                toast.error("Failed to send message");
            }
        } catch (error) {
            console.error("Failed to send DM:", error);
            toast.error("Failed to send message");
        }
    };

    const editMessage = async (messageId: string, content: string) => {
        if (!content.trim() || !activeFriendId || !subspace) return;

        try {
            const success = await actions.dms.editMessage(activeFriendId, messageId, content.trim());

            if (success) {
                setEditingMessage(null);
                toast.success("Message updated!");
            } else {
                toast.error("Failed to update message");
            }
        } catch (error) {
            console.error("Failed to update DM:", error);
            toast.error("Failed to update message");
        }
    };

    const deleteMessage = async (messageId: string) => {
        if (!activeFriendId || !subspace) return;

        try {
            const success = await actions.dms.deleteMessage(activeFriendId, messageId);
            if (success) {
                toast.success("Message deleted");
            } else {
                toast.error("Failed to delete message");
            }
        } catch (error) {
            console.error("Failed to delete DM:", error);
            toast.error("Failed to delete message");
        }
    };

    const handleReply = (messageId: string) => {
        const message = messagesList.find(m => m.id === messageId);
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

    // Empty shell when no friend is selected
    if (!activeFriendId) {
        return (
            <div className={cn(
                "flex flex-col h-full items-center justify-center",
                "bg-gradient-to-b from-background via-background/98 to-background/95",
                className
            )}>
                <EmptyDMState />
            </div>
        );
    }

    // Show connection initialization status instead of rendering an empty timeline
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

    return (
        <div className={cn(
            "flex flex-col h-full relative overflow-clip",
            "bg-gradient-to-b from-background via-background/98 to-background/95",
            className
        )}>
            {/* DM Header - Hidden on mobile (a dedicated MobileHeader exists) */}
            {!shouldUseOverlays && (
                <DMHeader
                    friendId={activeFriendId}
                    friendProfile={friend?.profile}
                />
            )}

            {/* Scrollable message timeline */}
            <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/40 relative"
            >
                {isLoading && messagesList.length === 0 ? (
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
                ) : messagesList.length === 0 ? (
                    <EmptyDMState friendName={getDisplayName(activeFriendId, profiles)} />
                ) : (
                    <div className="pt-6">
                        {messagesList.map((message, index) => {
                            const prevMessage = messagesList[index - 1]
                            const shouldShowDateDivider = index === 0 || (prevMessage && !isSameDay(prevMessage.timestamp, message.timestamp))
                            const shouldShowAvatar = index === 0 || shouldShowDateDivider || messagesList[index - 1]?.senderId !== message.senderId
                            const isGrouped = index > 0 && !shouldShowDateDivider && messagesList[index - 1]?.senderId === message.senderId

                            return (
                                <React.Fragment key={message.id}>
                                    {/* Insert a date divider when the calendar day changes */}
                                    {shouldShowDateDivider && (
                                        <DateDivider timestamp={message.timestamp} />
                                    )}

                                    {/* Individual message */}
                                    <div data-message-id={message.id}>
                                        <DMMessageItem
                                            message={message}
                                            profile={profiles[message.senderId]}
                                            onReply={handleReply}
                                            onEdit={handleEdit}
                                            onDelete={deleteMessage}
                                            isOwnMessage={message.senderId === profile?.userId}
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

                {/* Quick jump to the latest messages when the user has scrolled up */}
                {!isAtBottom && messagesList.length > 0 && (
                    <div className="fixed bottom-20 mx-auto w-12 z-10">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={() => {
                                            scrollToBottom();
                                            setTimeout(() => setIsAtBottom(true), 100);
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

            {/* Composer */}
            <DMMessageInput
                ref={inputRef}
                onSendMessage={sendMessage}
                disabled={!subspace}
                friendName={getDisplayName(activeFriendId, profiles)}
            />
        </div>
    );
})

DMMessages.displayName = "DMMessages"

export default DMMessages; 