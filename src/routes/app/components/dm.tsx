import { ProfileAvatar, ProfilePopover } from "@/components/profile";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { useProfile, usePrimaryName, useSubspace, useSubspaceActions } from "@/hooks/use-subspace";
import { useMessageInputFocus } from "@/hooks/use-message-input-focus";
import { cn, getRelativeTimeString, shortenAddress, getDateKey, getDateLabel } from "@/lib/utils";
import { Paperclip, SendHorizonal, User } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Subspace } from "@subspace-protocol/sdk";
import type { IMessage } from "subspace-sdk/src/types/subspace";

interface DMProps {
    friendId: string;
}

// Function to parse mentions from message content (same as in messages.tsx)
function parseMentions(content: string): Array<{ type: 'text' | 'mention'; content: string; userId?: string }> {
    if (!content) {
        return [{ type: 'text', content: '' }];
    }

    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: Array<{ type: 'text' | 'mention'; content: string; userId?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
            parts.push({
                type: 'text',
                content: content.slice(lastIndex, match.index)
            });
        }

        parts.push({
            type: 'mention',
            content: match[1],
            userId: match[2]
        });

        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
        parts.push({
            type: 'text',
            content: content.slice(lastIndex)
        });
    }

    if (parts.length === 0) {
        parts.push({
            type: 'text',
            content: content
        });
    }

    return parts;
}

interface MessageContentProps {
    content: string;
    friendId: string;
}

function MessageContent({ content, friendId }: MessageContentProps) {
    const parts = useMemo(() => parseMentions(content), [content]);
    const subspaceActions = useSubspaceActions();

    // Ensure profiles are fetched for mentioned users
    useEffect(() => {
        parts.forEach((part) => {
            if (part.type === 'mention' && part.userId) {
                subspaceActions.profiles.get(part.userId);
            }
        });
    }, [parts, subspaceActions.profiles]);

    return (
        <div className="text-sm">
            {parts.map((part, index) => {
                if (part.type === 'mention' && part.userId) {
                    return (
                        <ProfilePopover key={`mention-${index}`} userId={part.userId} side="top" align="center" sideOffset={2}>
                            <span className="inline-flex items-center px-1 py-0.5 rounded text-sm font-medium hover:opacity-80 cursor-pointer transition-all bg-primary/20 text-primary">
                                @{part.content}
                            </span>
                        </ProfilePopover>
                    );
                } else {
                    return (
                        <span key={`text-${index}`}>
                            {part.content}
                        </span>
                    );
                }
            })}
        </div>
    );
}

function DateDivider({ timestamp }: { timestamp: number }) {
    const dateLabel = getDateLabel(timestamp);

    return (
        <div className="flex items-center gap-3 py-4 px-3">
            <div className="flex-1 h-px bg-border"></div>
            <div className="text-xs font-ocr text-muted-foreground/60 px-2 bg-background">
                {dateLabel}
            </div>
            <div className="flex-1 h-px bg-border"></div>
        </div>
    );
}

interface MessageProps {
    message: IMessage;
    friendId: string;
    isOwnMessage: boolean;
}

function Message({ message, friendId, isOwnMessage }: MessageProps) {
    const author = useProfile(message.author_id);
    const primaryName = usePrimaryName(message.author_id);
    const relativeTimeString = getRelativeTimeString(message.timestamp);

    return (
        <div className={cn(
            "flex items-start gap-3 p-2 px-3",
            isOwnMessage ? "flex-row-reverse" : "flex-row"
        )}>
            <ProfilePopover userId={message.author_id} side={isOwnMessage ? "left" : "right"} align="start" alignOffset={-30}>
                <ProfileAvatar tx={author?.pfp} className="mt-1 w-10 h-10" />
            </ProfilePopover>
            <div className={cn("grow", isOwnMessage && "flex flex-col items-end")}>
                <div className={cn("flex items-center gap-1", isOwnMessage && "flex-row-reverse")}>
                    <ProfilePopover userId={message.author_id} side="bottom" align="start" sideOffset={2}>
                        <div className="font-ocr text-primary">
                            {primaryName || <span className="text-xs opacity-60">{shortenAddress(message.author_id)}</span>}
                        </div>
                    </ProfilePopover>
                    <div className="text-xs text-muted-foreground/40">{relativeTimeString}</div>
                </div>
                <div className={cn("mt-1", isOwnMessage && "text-right")}>
                    <MessageContent content={message.content} friendId={friendId} />
                </div>
            </div>
        </div>
    );
}

interface DMInputProps {
    friendId: string;
    onSendMessage?: (message: IMessage) => void;
}

function DMInput({ friendId, onSendMessage }: DMInputProps) {
    const [message, setMessage] = useState("");
    const subspaceActions = useSubspaceActions();
    const { address } = useWallet();
    const { inputRef } = useMessageInputFocus();

    async function handleSend() {
        if (message.length === 0) return;
        if (!address) return;

        const messageToSend = message;
        setMessage("");

        // Create a local message object for immediate display
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newMessage: IMessage = {
            id: messageId,
            content: messageToSend,
            author_id: address,
            channel_id: friendId,
            timestamp: Date.now(),
            edited: false,
            attachments: {}
        };

        // Add to local state immediately for responsive UI
        onSendMessage?.(newMessage);

        // Try to send via subspace (this will work when DM state is fully implemented)
        try {
            if (Subspace.initialized) {
                await subspaceActions.profiles.sendDM({
                    userId: friendId,
                    content: messageToSend,
                });
            }
        } catch (error) {
            console.error("Failed to send DM:", error);
            // In a real implementation, you might want to remove the message from local state on error
        }
    }

    async function handleKeyPress(e: React.KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setMessage("");
        }
    }

    return (
        <div className="relative border p-2 m-2 rounded flex items-center gap-2">
            <Button variant="ghost" size="icon" disabled>
                <Paperclip className="w-4 h-4" />
            </Button>
            <textarea
                ref={inputRef}
                className="grow resize-none outline-none bg-transparent text-sm placeholder:text-muted-foreground"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                rows={1}
                style={{
                    minHeight: '22px',
                    maxHeight: '128px',
                    lineHeight: '1.5',
                }}
            />
            <Button
                variant="ghost"
                size="icon"
                disabled={message.length === 0}
                onClick={handleSend}
            >
                <SendHorizonal className="w-4 h-4" />
            </Button>
        </div>
    );
}

export default function DM({ friendId }: DMProps) {
    const { address } = useWallet();
    const subspaceActions = useSubspaceActions();
    const myProfile = useProfile(address);
    const friendProfile = useProfile(friendId);
    const friendPrimaryName = usePrimaryName(friendId);

    // For now, we'll use a simple local state for DM messages since the full DM state isn't implemented yet
    const [dmMessages, setDmMessages] = useState<Record<string, IMessage>>({});

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [showJumpButton, setShowJumpButton] = useState(false);

    useEffect(() => {
        // Fetch profiles
        if (address) subspaceActions.profiles.get(address);
        if (friendId) subspaceActions.profiles.get(friendId);
    }, [address, friendId, subspaceActions.profiles]);

    // Demo function to simulate receiving a DM message
    const simulateReceivedMessage = (content: string, fromId: string) => {
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newMessage: IMessage = {
            id: messageId,
            content: content,
            author_id: fromId,
            channel_id: friendId,
            timestamp: Date.now(),
            edited: false,
            attachments: {}
        };

        setDmMessages(prev => ({
            ...prev,
            [messageId]: newMessage
        }));
    };

    // Demo: Add some sample messages for demonstration
    useEffect(() => {
        if (friendId && Object.keys(dmMessages).length === 0) {
            // Add a welcome message after a short delay
            setTimeout(() => {
                simulateReceivedMessage("Hey! How are you doing?", friendId);
            }, 1000);
        }
    }, [friendId, dmMessages]);

    // Check scroll position
    const checkScrollState = () => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const threshold = 10;
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
        setIsAtBottom(isNearBottom);

        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        setShowJumpButton(distanceFromBottom > 1000);
    };

    const handleScroll = () => {
        checkScrollState();
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (isAtBottom) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
        checkScrollState();
    }, [dmMessages, isAtBottom]);

    // Add scroll event listener
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        container.addEventListener('scroll', handleScroll);
        checkScrollState();

        return () => {
            container.removeEventListener('scroll', handleScroll);
        };
    }, []);

    // Group messages by date
    const messagesGroupedByDate = useMemo(() => {
        if (!dmMessages || Object.keys(dmMessages).length === 0) return [];

        const sortedMessages = Object.values(dmMessages).sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        const groups: Array<{ dateKey: string; timestamp: number; messages: IMessage[] }> = [];
        let currentGroup: { dateKey: string; timestamp: number; messages: IMessage[] } | null = null;

        for (const message of sortedMessages) {
            const dateKey = getDateKey(message.timestamp);

            if (!currentGroup || currentGroup.dateKey !== dateKey) {
                currentGroup = {
                    dateKey,
                    timestamp: message.timestamp,
                    messages: [message]
                };
                groups.push(currentGroup);
            } else {
                currentGroup.messages.push(message);
            }
        }

        return groups;
    }, [dmMessages]);

    // Display name for friend - IProfile doesn't have a name field, so we use primary name or shortened address
    const friendDisplayName = friendPrimaryName || shortenAddress(friendId);

    if (!myProfile || !friendProfile) {
        return (
            <div className="grow flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <div className="text-sm text-muted-foreground">Loading conversation...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="grow flex flex-col h-screen max-h-[calc(100vh-0.5rem)] relative">
            {/* Header */}
            <div className="border-b p-1.5 flex items-center gap-3 font-ocr">
                <ProfilePopover userId={friendId} side="bottom" align="start" sideOffset={2}>
                    <ProfileAvatar tx={friendProfile?.pfp} className="w-8 h-8" />
                </ProfilePopover>
                <ProfilePopover userId={friendId} side="bottom" align="start" sideOffset={2}>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">{friendDisplayName}</span>
                    </div>
                </ProfilePopover>
            </div>

            {/* Scroll to bottom button */}
            {showJumpButton && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
                    <Button
                        onClick={scrollToBottom}
                        className="bg-primary/30 hover:bg-primary/70 backdrop-blur text-white text-sm font-medium px-4 py-2 rounded-lg shadow-lg transition-colors duration-200"
                    >
                        Jump to latest message
                    </Button>
                </div>
            )}

            {/* Message list */}
            <div ref={messagesContainerRef} className="grow overflow-y-scroll flex flex-col">
                {messagesGroupedByDate.map((group, groupIndex) => (
                    <div key={group.dateKey}>
                        <DateDivider timestamp={group.timestamp} />
                        {group.messages.map((message) => (
                            <Message
                                key={message.id}
                                message={message}
                                friendId={friendId}
                                isOwnMessage={message.author_id === address}
                            />
                        ))}
                    </div>
                ))}
                {messagesGroupedByDate.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                        <User className="w-16 h-16 mb-4 opacity-50" />
                        <h3 className="text-lg font-ocr mb-2">No messages yet</h3>
                        <p className="text-sm">Start a conversation with {friendDisplayName}</p>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <DMInput
                friendId={friendId}
                onSendMessage={(message) => setDmMessages(prev => ({ ...prev, [message.id]: message }))}
            />
        </div>
    );
}