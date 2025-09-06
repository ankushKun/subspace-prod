import { ProfileAvatar, ProfilePopover } from "@/components/profile";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useGlobalState } from "@/hooks/use-global-state";
import { useChannel, useMember, useMembers, useMessages, usePrimaryName, useProfile, useServer, useSubspaceActions } from "@/hooks/use-subspace";
import { cn, getRelativeTimeString, shortenAddress } from "@/lib/utils";
import { Hash, Paperclip, SendHorizonal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Mention, MentionsInput, type MentionsInputStyle } from "react-mentions";
import type { IMember, IMessage } from "subspace-sdk/src/types/subspace";

function MessageInput() {
    const [message, setMessage] = useState("");
    const subspaceActions = useSubspaceActions()
    const { activeServerId, activeChannelId } = useGlobalState()
    const server = useServer(activeServerId)
    const channel = useChannel(activeServerId, activeChannelId)


    async function handleSend() {
        if (message.length === 0) return
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
            autoFocus
            forceSuggestionsAboveCursor
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            style={getMentionsInputStyles(message)} >
            <Mention
                data={[{ id: "aaaaaa", display: "aaaaaaaaaaaa" }]}
                trigger="@"
                markup="@[__display__](__id__)"
                displayTransform={(id) => {
                    // Use the updated getDisplayName function which handles bots properly
                    // const displayName = getDisplayName(id, profiles, activeServerId, servers, bots)
                    // return `@${displayName}`
                    return `@${id}`
                }}
                appendSpaceOnAdd
                renderSuggestion={() => {
                    return <div>Suggestion</div>
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
                <ProfilePopover userId={message.author_id} side="bottom" align="start" sideOffset={2}><div className="text-primary/80 font-ocr ">{member?.nickname || primaryName}</div></ProfilePopover>
                <div className="text-xs text-muted-foreground/40">{relativeTimeString}</div>
            </div>
            <div className="text-sm">{message.content}</div>
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

function Member({ member }: { member: IMember }) {
    const profile = useProfile(member.id)
    const primaryName = usePrimaryName(member.id)

    // return <div className="p-0">{member.nickname || primaryName || shortenAddress(member.id)}</div>
    return <ProfilePopover side="left" align="start" userId={member.id}><div className="flex items-center gap-2 p-2 cursor-pointer hover:bg-secondary/30">
        <ProfileAvatar tx={profile?.pfp} className="w-10 h-10" />
        <div className="font-ocr text-primary/80 truncate">{member.nickname || primaryName || shortenAddress(member.id)}</div>
    </div></ProfilePopover>

}


function Members({ collapsible }: { collapsible: boolean }) {
    const { activeServerId } = useGlobalState()
    const members = useMembers(activeServerId)
    const subspaceActions = useSubspaceActions()

    useEffect(() => {
        // fetch each member profile in batches of 10
        async function fetchProfiles() {
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
        subspaceActions.servers.getAllMembers(activeServerId)
    }, [])

    return <div className={cn("border-l w-[250px] min-w-[250px] max-w-[250px]", collapsible ? "max-h-[calc(100vh-0.5rem)]" : "h-screen")}>
        <div className="p-4 border-b font-ocr text-sm">Members</div>
        {members ? Object.values(members).map((member) => (
            <Member key={member.id} member={member} />
        )) : <div className="text-center text-sm text-muted-foreground/50 py-4">No members yet</div>}
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