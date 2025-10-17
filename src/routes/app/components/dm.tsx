import { ProfileAvatar, ProfilePopover } from "@/components/profile";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { useProfile, usePrimaryName, useSubspace, useSubspaceActions, useDmConversation } from "@/hooks/use-subspace";
import { useMessageInputFocus } from "@/hooks/use-message-input-focus";
import { cn, getRelativeTimeString, shortenAddress, getDateKey, getDateLabel } from "@/lib/utils";
import { Paperclip, SendHorizonal, User, UserCircleIcon, UserPlus } from "lucide-react";
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
        <div className="flex items-start gap-3 p-2 px-3 cursor-pointer hover:bg-secondary/30">
            <ProfilePopover userId={message.author_id} side="right" align="start" alignOffset={-30}>
                <ProfileAvatar tx={author?.pfp} className="mt-1 w-10 h-10" />
            </ProfilePopover>
            <div className="grow">
                <div className="flex items-center gap-1">
                    <ProfilePopover userId={message.author_id} side="bottom" align="start" sideOffset={2}>
                        <div className="font-ocr text-primary">
                            {primaryName || <span className="text-xs opacity-60">{shortenAddress(message.author_id)}</span>}
                        </div>
                    </ProfilePopover>
                    <div className="text-xs text-muted-foreground/40">{relativeTimeString}</div>
                </div>
                <div className="mt-1">
                    <MessageContent content={message.content} friendId={friendId} />
                </div>
            </div>
        </div>
    );
}

interface DMInputProps {
    friendId: string;
}

function DMInput({ friendId }: DMInputProps) {
    const [message, setMessage] = useState("");
    const subspaceActions = useSubspaceActions();
    const { address } = useWallet();
    const { inputRef } = useMessageInputFocus();
    const myProfile = useProfile(address);

    async function handleSend() {
        if (message.length === 0) return;
        if (!address) return;

        // Check if users are friends before sending using profile data - temporary DMs are not supported
        const myFriends = myProfile?.friends?.accepted || {};
        const areFriends = Object.keys(myFriends).includes(friendId);

        if (!areFriends) {
            console.warn("Cannot send DM to non-friend");
            return;
        }

        const messageToSend = message;
        setMessage("");

        // Send via subspace - only to friends
        try {
            if (Subspace.initialized) {
                await subspaceActions.profiles.sendDM({
                    userId: friendId,
                    content: messageToSend,
                });
            }
        } catch (error) {
            console.error("Failed to send DM:", error);
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
    const [isAddingFriend, setIsAddingFriend] = useState(false);

    // Get DM process ID from my profile
    const dmProcessId = myProfile?.dm_process;

    // Check if users are friends using profile data (like in welcome.tsx)
    const myFriends = myProfile?.friends?.accepted || {};
    const areFriends = Object.keys(myFriends).includes(friendId);

    // Only get conversation data for friends - temporary DMs are not supported
    const dmConversation = useDmConversation(dmProcessId || '', friendId);

    // Only use DM messages if users are friends
    const dmMessages = areFriends ? dmConversation : null;

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [showJumpButton, setShowJumpButton] = useState(false);

    useEffect(() => {
        // Fetch profiles
        if (address) subspaceActions.profiles.get(address);
        if (friendId) subspaceActions.profiles.get(friendId);

        // Load conversation data only for friends - temporary DMs are not supported
        if (dmProcessId && areFriends) {
            subspaceActions.profiles.getDmConversation(dmProcessId, friendId);
        }
    }, [address, friendId, dmProcessId, areFriends]);

    // Poll for new DM messages (similar to how messages.tsx polls for channel messages)
    useEffect(() => {
        if (!dmProcessId || !areFriends) return;

        let fetchDmMessageTimeout: NodeJS.Timeout;

        async function fetchDmMessages() {
            try {
                // Only fetch DM messages if Subspace is initialized
                if (Subspace.initialized) {
                    await subspaceActions.profiles.getDmConversation(dmProcessId, friendId);
                }
            } catch (e) {
                console.error('Error fetching DM messages:', e);
            } finally {
                // Poll every 1 second, same as channel messages
                fetchDmMessageTimeout = setTimeout(() => {
                    fetchDmMessages();
                }, 1000);
            }
        }

        fetchDmMessages();

        // Cleanup function to stop the polling loop when DM changes or component unmounts
        return () => {
            if (fetchDmMessageTimeout) {
                clearTimeout(fetchDmMessageTimeout);
            }
        };
    }, [dmProcessId, friendId, areFriends]);

    // Friends list is now loaded from profile data, no need to fetch from DM process

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

        // Sort messages by timestamp (oldest first for chronological order)
        const sortedMessages = Object.values(dmMessages).sort((a, b) => {
            // Convert timestamp to milliseconds if it's in seconds (same logic as getRelativeTimeString)
            const timestampA = a.timestamp > 1e12 ? a.timestamp : a.timestamp * 1000;
            const timestampB = b.timestamp > 1e12 ? b.timestamp : b.timestamp * 1000;
            return timestampA - timestampB;
        });

        // Group messages by date in chronological order
        const groups: Array<{ dateKey: string; timestamp: number; messages: IMessage[] }> = [];
        let currentGroup: { dateKey: string; timestamp: number; messages: IMessage[] } | null = null;

        for (const message of sortedMessages) {
            const dateKey = getDateKey(message.timestamp);

            if (!currentGroup || currentGroup.dateKey !== dateKey) {
                // Start a new group
                currentGroup = {
                    dateKey,
                    timestamp: message.timestamp,
                    messages: [message]
                };
                groups.push(currentGroup);
            } else {
                // Add to existing group (already in chronological order)
                currentGroup.messages.push(message);
            }
        }

        return groups;
    }, [dmMessages]);

    // Display name for friend - IProfile doesn't have a name field, so we use primary name or shortened address
    const friendDisplayName = friendPrimaryName || shortenAddress(friendId);

    const handleAddFriend = async () => {
        if (!Subspace.initialized) return;

        setIsAddingFriend(true);
        try {
            await subspaceActions.profiles.addFriend(friendId);
            await subspaceActions.profiles.get(address);
            window.toast?.success("Friend request sent!");
        } catch (error) {
            console.error("Failed to send friend request:", error);
            window.toast?.error("Failed to send friend request. Please try again.");
        } finally {
            setIsAddingFriend(false);
        }
    };

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

    // Show message if users are not friends - temporary DMs are not supported
    if (!areFriends) {
        return (
            <div className="grow flex items-center justify-center">
                <div className="text-center">
                    <User className="w-16 h-16 mb-4 opacity-50 mx-auto" />
                    <h3 className="text-lg font-ocr mb-2">Not Friends</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        You can only send direct messages to friends.<br />
                        Add {friendDisplayName} as a friend to start messaging.
                    </p>
                    <Button
                        onClick={handleAddFriend}
                        disabled={isAddingFriend}
                        className="bg-primary hover:bg-primary/90"
                    >
                        {isAddingFriend ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border border-current border-t-transparent mr-2" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <UserPlus className="w-4 h-4 mr-2" />
                                Add Friend
                            </>
                        )}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="grow flex flex-col h-screen max-h-[calc(100vh-0.5rem)] relative">
            {/* Header */}
            <div className="border-b p-2.5 pl-4 flex items-center gap-3 font-ocr">
                <ProfilePopover userId={friendId} side="bottom" align="start" sideOffset={2}>
                    <ProfileAvatar tx={friendProfile?.pfp} className="w-8 h-8" />
                </ProfilePopover>
                <ProfilePopover userId={friendId} side="bottom" align="start" sideOffset={2}>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="font-medium">{friendDisplayName}</span>
                        </div>
                    </div>
                </ProfilePopover>
                <div className="ml-auto mr-2">
                    <Button variant="ghost" size="icon" className="!p-0 rounded-full">
                        <UserCircleIcon className="!w-5 !h-5" />
                    </Button>
                </div>
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
                        <p className="text-sm">
                            Start a conversation with {friendDisplayName}
                        </p>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <DMInput
                friendId={friendId}
            />
        </div>
    );
}