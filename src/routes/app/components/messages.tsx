import { ProfileAvatar, ProfilePopover } from "@/components/profile";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useGlobalState } from "@/hooks/use-global-state";
import { useChannel, useMember, useMembers, useMessages, usePrimaryName, usePrimaryNames, useProfile, useServer, useSubspace, useSubspaceActions } from "@/hooks/use-subspace";
import { useMessageInputFocus } from "@/hooks/use-message-input-focus";
import { cn, getRelativeTimeString, shortenAddress } from "@/lib/utils";
import { Hash, Paperclip, SendHorizonal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Mention, MentionsInput, type MentionsInputStyle } from "react-mentions";
import type { IMember, IMessage, IProfile } from "subspace-sdk/src/types/subspace";
import { Subspace } from "@subspace-protocol/sdk";

interface MentionDisplayProps {
    userId: string;
    serverId: string;
}

function MentionDisplay({ userId, serverId }: MentionDisplayProps) {
    const member = useMember(serverId, userId);
    const primaryName = usePrimaryName(userId);
    const profile = useProfile(userId);

    // Check if user exists on Subspace (has profile or primary name)
    const userExistsOnSubspace = profile || primaryName;

    if (!userExistsOnSubspace) {
        return (
            <span className="inline-flex items-center px-1 py-0.5 rounded text-sm font-medium bg-muted text-muted-foreground cursor-default">
                @Invalid User
            </span>
        );
    }

    // Determine display name based on server membership
    const isServerMember = !!member;

    // Priority: nickname (if server member) -> primary name -> shortened ID
    const displayName = (isServerMember ? member.nickname : null) || primaryName || shortenAddress(userId);

    return (
        <ProfilePopover userId={userId} side="top" align="center" sideOffset={2}>
            <span className="inline-flex items-center px-1 py-0.5 rounded text-sm font-medium bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer transition-colors">
                @{displayName}
            </span>
        </ProfilePopover>
    );
}

// Function to parse mentions from message content
function parseMentions(content: string): Array<{ type: 'text' | 'mention'; content: string; userId?: string }> {
    if (!content) {
        return [{ type: 'text', content: '' }];
    }

    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: Array<{ type: 'text' | 'mention'; content: string; userId?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
        // Add text before the mention
        if (match.index > lastIndex) {
            parts.push({
                type: 'text',
                content: content.slice(lastIndex, match.index)
            });
        }

        // Add the mention
        parts.push({
            type: 'mention',
            content: match[1], // The display name
            userId: match[2]   // The user ID
        });

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text after the last mention
    if (lastIndex < content.length) {
        parts.push({
            type: 'text',
            content: content.slice(lastIndex)
        });
    }

    // If no mentions were found, return the original content as text
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
    serverId: string;
}

function MessageContent({ content, serverId }: MessageContentProps) {
    const parts = useMemo(() => parseMentions(content), [content]);
    const subspaceActions = useSubspaceActions();

    // Ensure profiles are fetched for all mentioned users
    useEffect(() => {
        parts.forEach((part) => {
            if (part.type === 'mention' && part.userId) {
                // Fetch profile for mentioned user (even if not a server member)
                subspaceActions.profiles.get(part.userId);
            }
        });
    }, [parts, subspaceActions.profiles]);

    return (
        <div className="text-sm">
            {parts.map((part, index) => {
                if (part.type === 'mention' && part.userId) {
                    return (
                        <MentionDisplay
                            key={`mention-${index}`}
                            userId={part.userId}
                            serverId={serverId}
                        />
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

interface MentionSuggestionProps {
    member: IMember;
}

function MentionSuggestion({ member }: MentionSuggestionProps) {
    const profile = useProfile(member.id);
    const primaryName = usePrimaryName(member.id);

    // Priority: nickname -> primary name -> shortened ID
    const displayName = member.nickname || primaryName || shortenAddress(member.id);

    return (
        <div className="flex items-center gap-2 p-2 hover:bg-accent/50 rounded">
            <ProfileAvatar tx={profile?.pfp} className="w-6 h-6" />
            <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-foreground truncate">
                    {displayName}
                </span>
                {member.nickname && primaryName && member.nickname !== primaryName && (
                    <span className="text-xs text-muted-foreground truncate">
                        {primaryName}
                    </span>
                )}
            </div>
        </div>
    );
}

function MessageInput() {
    const [message, setMessage] = useState("");
    const subspaceActions = useSubspaceActions()
    const { activeServerId, activeChannelId } = useGlobalState()
    const server = useServer(activeServerId)
    const channel = useChannel(activeServerId, activeChannelId)
    const members = useMembers(activeServerId)
    const primaryNames = usePrimaryNames()
    const { inputRef } = useMessageInputFocus()

    // Format members data for mentions
    const mentionData = useMemo(() => {
        if (!members) return [];

        return Object.values(members).map((member) => {
            // Priority: nickname -> primary name -> shortened ID
            const primaryName = primaryNames[member.id];
            const displayName = member.nickname || primaryName || shortenAddress(member.id);

            return {
                id: member.id,
                display: displayName,
                member: member // Include the full member object for rendering
            };
        });
    }, [members, primaryNames]);

    // Ensure members are fetched for mentions
    useEffect(() => {
        if (activeServerId && !members) {
            subspaceActions.servers.getAllMembers(activeServerId);
        }
    }, [activeServerId, members, subspaceActions.servers]);

    // Ensure primary names are fetched for all members
    useEffect(() => {
        if (members) {
            Object.values(members).forEach((member) => {
                if (!primaryNames[member.id]) {
                    subspaceActions.profiles.get(member.id);
                }
            });
        }
    }, [members, primaryNames, subspaceActions.profiles]);

    async function handleSend() {
        if (message.length === 0) return
        // Only send message if Subspace is initialized
        if (!Subspace.initialized) return

        setMessage("")
        const msg = await subspaceActions.servers.sendMessage({
            serverId: server?.profile.id,
            channelId: channel?.id,
            content: message,
            attachments: [],
        })
    }

    async function handleKeyPress(e: React.KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        } else if (e.key === 'Escape') {
            e.preventDefault()
            // if (editingMessage && onCancelEdit) {
            //     onCancelEdit()
            // } else if (replyingTo && onCancelReply) {
            //     onCancelReply()
            // }
        }
    }

    return <div className="relative border p-2 m-2 rounded flex items-center gap-0.5">
        <Button variant="ghost" size="icon" disabled><Paperclip /></Button>
        <MentionsInput className="mentions-input grow"
            singleLine={false}
            forceSuggestionsAboveCursor
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            style={getMentionsInputStyles(message)}
            inputRef={inputRef} >
            <Mention
                data={mentionData}
                trigger="@"
                markup="@[__display__](__id__)"
                displayTransform={(id, display) => {
                    return `@${display}`;
                }}
                appendSpaceOnAdd
                renderSuggestion={(suggestion, search, highlightedDisplay, index, focused) => {
                    const memberData = suggestion as any;
                    return (
                        <MentionSuggestion
                            key={memberData.id}
                            member={memberData.member}
                        />
                    );
                }}
                style={{
                    color: 'var(--primary)',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                    position: "relative",
                    zIndex: 500,
                    pointerEvents: "none",
                }}
            />
        </MentionsInput>
        <Button variant="ghost" size="icon" disabled={message.length === 0} onClick={handleSend}><SendHorizonal /></Button>
    </div>
}

function Message({ message, serverId }: { message: IMessage, serverId: string }) {
    const author = useProfile(message.author_id)
    const member = useMember(serverId, message.author_id)
    const primaryName = usePrimaryName(message.author_id)
    const relativeTimeString = getRelativeTimeString(message.timestamp)

    return <div className="flex items-start gap-3 cursor-pointer hover:bg-secondary/30 p-2 px-3">
        <ProfilePopover userId={message.author_id} side="right" align="start" alignOffset={-30}><ProfileAvatar tx={author?.pfp} className="mt-1" /></ProfilePopover>
        <div className="grow">
            <div className="flex items-center gap-1">
                <ProfilePopover userId={message.author_id} side="bottom" align="start" sideOffset={2}><div className={cn("text-primary/80 font-ocr ", !member && "text-muted-foreground/60")}>{member?.nickname || primaryName || <span className="text-xs opacity-60">{shortenAddress(message.author_id)}</span>}</div></ProfilePopover>
                <div className="text-xs text-muted-foreground/40">{relativeTimeString}</div>
            </div>
            <MessageContent content={message.content} serverId={serverId} />
        </div>
    </div>
}

export default function Messages() {
    const { activeServerId, activeChannelId } = useGlobalState()
    const messages = useMessages(activeServerId, activeChannelId)
    const channel = useChannel(activeServerId, activeChannelId)
    // console.log(messages)

    const messagesOrderedByTime = useMemo(() => {
        return messages ? Object.values(messages).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) : []
    }, [messages])

    return <div className="grow flex">
        {/* messages */}
        <div className="grow flex flex-col gap-1 h-screen max-h-[calc(100vh-0.5rem)]">
            {/* header */}
            <div className="border-b p-3.5 flex items-center gap-1 font-ocr"><Hash className="w-4 h-4 shrink-0 text-muted-foreground" />{channel?.name}</div>
            {/* message list */}
            <div className="grow overflow-y-scroll flex flex-col-reverse">
                {messagesOrderedByTime.map((message) => (
                    <Message key={message.id} message={message} serverId={activeServerId} />
                ))}
                {
                    messagesOrderedByTime.length === 0 && <div className="text-center text-sm text-gray-500">No messages yet</div>
                }
            </div>
            {/* input */}
            <div className="">
                <MessageInput />
            </div>
        </div>
        {/* members */}
        <Members collapsible={true} />
    </div>
}

// appears in the sidebar member list
function Member({ member }: { member: IMember }) {
    const profile = useProfile(member.id)
    const primaryName = usePrimaryName(member.id)

    // return <div className="p-0">{member.nickname || primaryName || shortenAddress(member.id)}</div>
    return <ProfilePopover side="left" align="start" userId={member.id}><div className="flex items-center gap-2 p-2 cursor-pointer hover:bg-secondary/30">
        <ProfileAvatar tx={profile?.pfp} className="w-8 h-8" />
        <div className="font-ocr text-primary/80 truncate">{member.nickname || primaryName || shortenAddress(member.id)}</div>
    </div></ProfilePopover>
}

// Helper function to categorize member profile completeness
function getMemberProfileCompleteness(member: IMember, profile: IProfile | undefined, primaryName: string | undefined): number {
    const hasPfp = profile?.pfp && profile.pfp.length > 0;
    const hasDisplayName = member.nickname || primaryName;

    if (hasPfp && hasDisplayName) return 0; // Both pfp and display name
    if (hasPfp || hasDisplayName) return 1; // Either pfp or display name
    return 2; // Neither
}

function SortedMemberList({ members }: { members: IMember[] }) {
    const profiles = useSubspace((state) => state.profiles);
    const primaryNames = useSubspace((state) => state.primaryNames);

    const sortedMembers = useMemo(() => {
        return [...members].sort((a, b) => {
            const profileA = profiles[a.id];
            const primaryNameA = primaryNames[a.id];
            const completenessA = getMemberProfileCompleteness(a, profileA, primaryNameA);

            const profileB = profiles[b.id];
            const primaryNameB = primaryNames[b.id];
            const completenessB = getMemberProfileCompleteness(b, profileB, primaryNameB);

            // Sort by completeness first (0 = both, 1 = either, 2 = neither)
            if (completenessA !== completenessB) {
                return completenessA - completenessB;
            }

            // Within same completeness level, sort alphabetically by display name
            const displayNameA = (a.nickname || primaryNameA || shortenAddress(a.id)).toLowerCase();
            const displayNameB = (b.nickname || primaryNameB || shortenAddress(b.id)).toLowerCase();
            return displayNameA.localeCompare(displayNameB);
        });
    }, [members, profiles, primaryNames]);

    return (
        <>
            {sortedMembers.map((member) => (
                <Member key={member.id} member={member} />
            ))}
        </>
    );
}

function Members({ collapsible }: { collapsible: boolean }) {
    const { activeServerId } = useGlobalState()
    const members = useMembers(activeServerId)
    const subspaceActions = useSubspaceActions()

    useEffect(() => {
        // fetch each member profile in batches of 10
        async function fetchProfiles() {
            if (!members) return
            for (let i = 0; i < Object.keys(members).length; i += 10) {
                const batch = Object.keys(members).slice(i, i + 10);
                const promises = batch.map(member => subspaceActions.profiles.get(member));
                await Promise.all(promises);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        fetchProfiles();
    }, [members])

    useEffect(() => {
        if (activeServerId) {
            subspaceActions.servers.getAllMembers(activeServerId)
        }
    }, [activeServerId])

    return <div className={cn("border-l w-[250px] min-w-[250px] max-w-[250px]", collapsible ? "max-h-[calc(100vh-0.5rem)]" : "h-screen")}>
        <div className="p-4 border-b font-ocr text-sm">Members</div>
        {members ? <SortedMemberList members={Object.values(members)} /> : <div className="text-center text-sm text-muted-foreground/50 py-4">No members yet</div>}
    </div>
}



const getMentionsInputStyles = (message: string): MentionsInputStyle => ({
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
})