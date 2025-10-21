import LoginDialog from "@/components/login-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useProfile, useProfiles, useSubspace, useSubspaceActions, useDmConversation, useDmConversations, useFriends, useRecentDms, usePrimaryNames, useWanderTiers } from "@/hooks/use-subspace"
import { useGlobalState } from "@/hooks/use-global-state"
import { useWallet } from "@/hooks/use-wallet"
import { Subspace } from "@subspace-protocol/sdk"
import { useEffect, useState } from "react"
import { User, Server, Plus, Search, UserPlus, Code2, Wallet, Hash, Users, Shield, MessageSquare, Mail, Trash2, ChevronDown, ChevronUp, Heart, UserCheck, UserX, Send, Clock, Bug } from "lucide-react"
import JsonView from "@uiw/react-json-view"
import { darkTheme } from '@uiw/react-json-view/dark';


function Json({ value }: { value: any }) {
    return (
        <JsonView
            value={value}
            style={{ ...darkTheme, borderRadius: '6px', padding: '4px' }}
            enableClipboard={false}
            displayDataTypes={false}
            collapsed={true}
            shortenTextAfterLength={100}
            highlightUpdates
            objectSortKeys
            displayObjectSize

        />
    )
}

export default function Dev() {
    const { profiles, servers, members, actions: subspaceActions, dmConversations, friends, blockedUsers, recentDms, primaryNames, wanderTiers, messages } = useSubspace()
    const { connected, address, actions: walletActions } = useWallet()
    const { activeServerId, activeChannelId, activeFriendId, lastChannelByServer, subspaceFailed, actions: globalActions } = useGlobalState()
    const profile = useProfile(address)
    const [serverId, setServerId] = useState("server-id")
    const [userId, setUserId] = useState("")
    const [friendId, setFriendId] = useState("")
    const [categoryId, setCategoryId] = useState("")
    const [channelId, setChannelId] = useState("")
    const [roleId, setRoleId] = useState("")
    const [messageId, setMessageId] = useState("")
    const [messageContent, setMessageContent] = useState("Hello from dev console!")
    const [dmUserId, setDmUserId] = useState("")
    const [dmMessageId, setDmMessageId] = useState("")
    const [dmProcessId, setDmProcessId] = useState("")
    const [dmContent, setDmContent] = useState("Hello from dev console!")

    // Optional fields state
    const [serverName, setServerName] = useState("Dev Test Server")
    const [showOptionalFields, setShowOptionalFields] = useState(false)

    useEffect(() => {
        if (!connected || !address) return console.log("No connected wallet")
        if (Subspace.initialized) return console.log("Subspace already initialized")

        async function init() {
            const signer = await walletActions.getSigner()
            try {
                // Wait for Subspace initialization to complete
                await Subspace.init({ signer, address })

                // Only proceed with operations after initialization is confirmed
                if (Subspace.initialized) {
                    await subspaceActions.profiles.get(address)
                } else {
                    console.error("Subspace initialization completed but not marked as initialized")
                }
            } catch (error) {
                console.error("Subspace initialization failed:", error)
            }
        }
        init()
    }, [connected, address])

    // Set default IDs to user's wallet address for convenience
    useEffect(() => {
        if (address) {
            setUserId(address)
            setFriendId(address)
            setDmUserId(address)
        }
    }, [address])

    // Set DM process ID from profile
    useEffect(() => {
        if (profile?.dm_process) {
            setDmProcessId(profile.dm_process)
        }
    }, [profile])

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
            <div className="mx-auto max-w-6xl space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-2">
                        <Code2 className="h-8 w-8 text-primary" />
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            Developer Utilities
                        </h1>
                    </div>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Test and interact with Subspace SDK features
                    </p>
                </div>

                {/* Connection Status */}
                <Card className="border-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Wallet className="h-5 w-5" />
                            Connection Status
                        </CardTitle>
                        <CardDescription>
                            Your wallet connection and initialization status
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="space-y-2">
                                {connected ? (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                                                Connected
                                            </Badge>
                                            <span className="font-mono text-sm text-muted-foreground">
                                                {address?.slice(0, 6)}...{address?.slice(-4)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Subspace SDK: {Subspace.initialized ? "Initialized" : "Not initialized"}
                                        </p>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Badge variant="destructive">Disconnected</Badge>
                                        <LoginDialog>
                                            <Button variant="outline" size="sm">
                                                Connect Wallet
                                            </Button>
                                        </LoginDialog>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                                <Button
                                    onClick={() => {
                                        if (confirm("Are you sure you want to clear all states and storage? This action cannot be undone.")) {
                                            subspaceActions.clearAllStates()
                                        }
                                    }}
                                    variant="destructive"
                                    size="sm"
                                    className="gap-2"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Clear All States
                                </Button>
                                <p className="text-xs text-muted-foreground text-center">
                                    Clears profiles, servers & storage
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Debug Sheet */}
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" className="gap-2 fixed top-12 right-10 z-30 !bg-secondary">
                            <Bug className="h-4 w-4" />
                            View State
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="max-h-[87vh] overflow-y-auto p-4">

                        {/* Subspace State */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-primary">Subspace State</h3>

                            <div className="space-y-3">
                                <div>
                                    <h4 className="text-sm font-medium mb-2">Profiles</h4>
                                    <Json value={profiles} />
                                </div>

                                <div>
                                    <h4 className="text-sm font-medium mb-2">Servers</h4>
                                    <Json value={servers} />
                                </div>

                                <div>
                                    <h4 className="text-sm font-medium mb-2">Members</h4>
                                    <Json value={members} />
                                </div>

                                <div>
                                    <h4 className="text-sm font-medium mb-2">Messages</h4>
                                    <Json value={messages} />
                                </div>

                                <div>
                                    <h4 className="text-sm font-medium mb-2">DM Conversations</h4>
                                    <Json value={dmConversations} />
                                </div>

                                <div>
                                    <h4 className="text-sm font-medium mb-2">Friends</h4>
                                    <Json value={friends} />
                                </div>

                                <div>
                                    <h4 className="text-sm font-medium mb-2">Blocked Users</h4>
                                    <Json value={blockedUsers} />
                                </div>

                                <div>
                                    <h4 className="text-sm font-medium mb-2">Recent DMs</h4>
                                    <Json value={recentDms} />
                                </div>

                                <div>
                                    <h4 className="text-sm font-medium mb-2">Primary Names</h4>
                                    <Json value={primaryNames} />
                                </div>

                                <div>
                                    <h4 className="text-sm font-medium mb-2">Wander Tiers</h4>
                                    <Json value={wanderTiers} />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Global State */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-primary">Global State</h3>

                            <div className="space-y-3">
                                <div>
                                    <h4 className="text-sm font-medium mb-2">Active Server ID</h4>
                                    <code className="text-xs font-mono p-2 bg-muted rounded-lg block">
                                        {activeServerId || "Not set"}
                                    </code>
                                </div>

                                <div>
                                    <h4 className="text-sm font-medium mb-2">Active Channel ID</h4>
                                    <code className="text-xs font-mono p-2 bg-muted rounded-lg block">
                                        {activeChannelId || "Not set"}
                                    </code>
                                </div>

                                <div>
                                    <h4 className="text-sm font-medium mb-2">Active Friend ID</h4>
                                    <code className="text-xs font-mono p-2 bg-muted rounded-lg block">
                                        {activeFriendId || "Not set"}
                                    </code>
                                </div>

                                <div>
                                    <h4 className="text-sm font-medium mb-2">Last Channel by Server</h4>
                                    <Json value={lastChannelByServer} />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Current Profile */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-primary">Current Profile</h3>
                            <Json value={profile} />
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Action Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Profile Actions */}
                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Profile Management
                            </CardTitle>
                            <CardDescription>
                                Create, retrieve, and manage user profiles
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-2">
                                <Label htmlFor="user-id">User ID (Required for Profile Lookup)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="user-id"
                                        placeholder="Enter user ID (wallet address)..."
                                        value={userId}
                                        onChange={(e) => setUserId(e.target.value)}
                                        className="font-mono flex-1"
                                    />
                                    <Button
                                        onClick={() => setUserId(address || "")}
                                        variant="outline"
                                        size="sm"
                                        disabled={!address}
                                        className="px-3"
                                    >
                                        Self
                                    </Button>
                                </div>
                            </div>
                            <Button
                                onClick={() => subspaceActions.profiles.get(userId)}
                                variant="outline"
                                className="w-full justify-start gap-2"
                                disabled={!connected || !userId.trim()}
                            >
                                <Search className="h-4 w-4" />
                                Get Profile
                            </Button>
                            <Button
                                onClick={() => subspaceActions.profiles.create({
                                    // pfp: "https://arweave.net/123",
                                    // banner: "https://arweave.net/123",
                                    bio: "Test profile created from dev console"
                                })}
                                variant="outline"
                                className="w-full justify-start gap-2"
                                disabled={!connected}
                            >
                                <Plus className="h-4 w-4" />
                                Create Test Profile
                            </Button>

                            {profile && (
                                <>
                                    <Separator />
                                    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                                        <p className="text-sm font-medium">Current Profile:</p>
                                        <Json value={profile} />
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Server Actions */}
                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Server className="h-5 w-5" />
                                Server Management
                            </CardTitle>
                            <CardDescription>
                                Create, join, and manage servers
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-2">
                                <Label htmlFor="server-id">Server ID (Required for Server Operations)</Label>
                                <Input
                                    id="server-id"
                                    placeholder="Enter server ID..."
                                    value={serverId}
                                    onChange={(e) => setServerId(e.target.value)}
                                    className="font-mono"
                                />
                            </div>
                            <Separator />
                            <Button
                                onClick={() => subspaceActions.servers.get(serverId)}
                                variant="outline"
                                className="w-full justify-start gap-2"
                                disabled={!connected || !serverId.trim()}
                            >
                                <Search className="h-4 w-4" />
                                Get Server
                            </Button>
                            <div className="space-y-2">
                                <Label htmlFor="server-name">Server Name (Required)</Label>
                                <Input
                                    id="server-name"
                                    placeholder="Enter server name..."
                                    value={serverName}
                                    onChange={(e) => setServerName(e.target.value)}
                                />
                            </div>
                            <Button
                                onClick={() => subspaceActions.servers.create({
                                    serverName: serverName
                                })}
                                variant="outline"
                                className="w-full justify-start gap-2"
                                disabled={!connected || !serverName.trim()}
                            >
                                <Plus className="h-4 w-4" />
                                Create Server
                            </Button>
                            <Button
                                onClick={() => subspaceActions.servers.join(serverId)}
                                variant="outline"
                                className="w-full justify-start gap-2"
                                disabled={!connected || !serverId.trim()}
                            >
                                <UserPlus className="h-4 w-4" />
                                Join Server
                            </Button>
                            <Button
                                onClick={() => subspaceActions.servers.getAllMembers(serverId)}
                                variant="outline"
                                className="w-full justify-start gap-2"
                                disabled={!connected || !serverId.trim()}
                            >
                                <Users className="h-4 w-4" />
                                Get Server Members
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Category Management */}
                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Hash className="h-5 w-5" />
                                Category Management
                            </CardTitle>
                            <CardDescription>
                                Create, update, and delete server categories
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-2">
                                <Label htmlFor="category-name">Category Name (Required)</Label>
                                <Input
                                    id="category-name"
                                    placeholder="Enter category name..."
                                    value="General"
                                />
                            </div>
                            <Button
                                onClick={() => subspaceActions.servers.createCategory({
                                    serverId,
                                    categoryName: "General"
                                })}
                                variant="outline"
                                className="w-full justify-start gap-2"
                                disabled={!connected || !serverId.trim()}
                            >
                                <Plus className="h-4 w-4" />
                                Create Category
                            </Button>
                            <Separator />
                            <div className="space-y-2">
                                <Label htmlFor="category-id">Category ID (For Updates/Delete)</Label>
                                <Input
                                    id="category-id"
                                    placeholder="Enter category ID..."
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="font-mono"
                                />
                            </div>
                            <Button
                                onClick={() => subspaceActions.servers.updateCategory({
                                    serverId,
                                    categoryId,
                                    categoryName: "Updated Category",
                                    categoryOrder: 2
                                })}
                                variant="outline"
                                className="w-full justify-start gap-2"
                                disabled={!connected || !serverId.trim() || !categoryId.trim()}
                            >
                                <Search className="h-4 w-4" />
                                Update Category
                            </Button>
                            <Button
                                onClick={() => subspaceActions.servers.deleteCategory({
                                    serverId,
                                    categoryId
                                })}
                                variant="destructive"
                                className="w-full justify-start gap-2"
                                disabled={!connected || !serverId.trim() || !categoryId.trim()}
                            >
                                <Plus className="h-4 w-4 rotate-45" />
                                Delete Category
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Channel Management */}
                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquare className="h-5 w-5" />
                                Channel Management
                            </CardTitle>
                            <CardDescription>
                                Create, update, and delete server channels
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-2">
                                <Label htmlFor="channel-name">Channel Name (Required)</Label>
                                <Input
                                    id="channel-name"
                                    placeholder="Enter channel name..."
                                    value="general"
                                />
                            </div>
                            <Button
                                onClick={() => subspaceActions.servers.createChannel({
                                    serverId,
                                    channelName: "general"
                                })}
                                variant="outline"
                                className="w-full justify-start gap-2"
                                disabled={!connected || !serverId.trim()}
                            >
                                <Plus className="h-4 w-4" />
                                Create Channel
                            </Button>
                            <Separator />
                            <div className="space-y-2">
                                <Label htmlFor="channel-id">Channel ID (For Updates/Delete)</Label>
                                <Input
                                    id="channel-id"
                                    placeholder="Enter channel ID..."
                                    value={channelId}
                                    onChange={(e) => setChannelId(e.target.value)}
                                    className="font-mono"
                                />
                            </div>
                            <Button
                                onClick={() => subspaceActions.servers.updateChannel({
                                    serverId,
                                    channelId,
                                    channelName: "updated-channel",
                                    channelOrder: 2
                                })}
                                variant="outline"
                                className="w-full justify-start gap-2"
                                disabled={!connected || !serverId.trim() || !channelId.trim()}
                            >
                                <Search className="h-4 w-4" />
                                Update Channel
                            </Button>
                            <Button
                                onClick={() => subspaceActions.servers.deleteChannel({
                                    serverId,
                                    channelId
                                })}
                                variant="destructive"
                                className="w-full justify-start gap-2"
                                disabled={!connected || !serverId.trim() || !channelId.trim()}
                            >
                                <Plus className="h-4 w-4 rotate-45" />
                                Delete Channel
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Second Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Role Management */}
                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Role Management
                            </CardTitle>
                            <CardDescription>
                                Create, update, assign, and manage roles
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-2">
                                <Label htmlFor="role-name">Role Name (Required)</Label>
                                <Input
                                    id="role-name"
                                    placeholder="Enter role name..."
                                    value="Member"
                                />
                            </div>
                            <Button
                                onClick={() => subspaceActions.servers.createRole({
                                    serverId,
                                    roleName: "Member"
                                })}
                                variant="outline"
                                className="w-full justify-start gap-2"
                                disabled={!connected || !serverId.trim()}
                            >
                                <Plus className="h-4 w-4" />
                                Create Role
                            </Button>
                            <Separator />
                            <div className="space-y-2">
                                <Label htmlFor="role-id">Role ID (For Updates/Assign)</Label>
                                <Input
                                    id="role-id"
                                    placeholder="Enter role ID..."
                                    value={roleId}
                                    onChange={(e) => setRoleId(e.target.value)}
                                    className="font-mono"
                                />
                            </div>
                            <Button
                                onClick={() => subspaceActions.servers.assignRole({
                                    serverId,
                                    userId,
                                    roleId
                                })}
                                variant="outline"
                                className="w-full justify-start gap-2"
                                disabled={!connected || !serverId.trim() || !userId.trim() || !roleId.trim()}
                            >
                                <UserPlus className="h-4 w-4" />
                                Assign Role to User
                            </Button>
                            <Button
                                onClick={() => subspaceActions.servers.unassignRole({
                                    serverId,
                                    userId,
                                    roleId
                                })}
                                variant="destructive"
                                className="w-full justify-start gap-2"
                                disabled={!connected || !serverId.trim() || !userId.trim() || !roleId.trim()}
                            >
                                <Users className="h-4 w-4" />
                                Unassign Role
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Message Management */}
                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquare className="h-5 w-5" />
                                Message Management
                            </CardTitle>
                            <CardDescription>
                                Send, update, and delete messages
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-2">
                                <Label htmlFor="message-content">Message Content (Required)</Label>
                                <Input
                                    id="message-content"
                                    placeholder="Enter message content..."
                                    value={messageContent}
                                    onChange={(e) => setMessageContent(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="message-id">Message ID (For Updates/Delete)</Label>
                                <Input
                                    id="message-id"
                                    placeholder="Enter message ID..."
                                    value={messageId}
                                    onChange={(e) => setMessageId(e.target.value)}
                                    className="font-mono"
                                />
                            </div>
                            <Button
                                onClick={() => subspaceActions.servers.sendMessage({
                                    serverId,
                                    channelId,
                                    content: messageContent,
                                    attachments: []
                                })}
                                variant="outline"
                                className="w-full justify-start gap-2"
                                disabled={!connected || !serverId.trim() || !channelId.trim() || !messageContent.trim()}
                            >
                                <Plus className="h-4 w-4" />
                                Send Message
                            </Button>
                            <Button
                                onClick={() => subspaceActions.servers.updateMessage({
                                    serverId,
                                    channelId,
                                    messageId,
                                    content: messageContent + " (edited)"
                                })}
                                variant="outline"
                                className="w-full justify-start gap-2"
                                disabled={!connected || !serverId.trim() || !channelId.trim() || !messageId.trim()}
                            >
                                <Search className="h-4 w-4" />
                                Update Message
                            </Button>
                            <Button
                                onClick={() => subspaceActions.servers.deleteMessage({
                                    serverId,
                                    channelId,
                                    messageId
                                })}
                                variant="destructive"
                                className="w-full justify-start gap-2"
                                disabled={!connected || !serverId.trim() || !channelId.trim() || !messageId.trim()}
                            >
                                <Plus className="h-4 w-4 rotate-45" />
                                Delete Message
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Third Row - Enhanced DM and Friends Management */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Enhanced DM Management */}
                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Mail className="h-5 w-5" />
                                Direct Message Management
                            </CardTitle>
                            <CardDescription>
                                Send, edit, and delete direct messages to friends
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-2">
                                <Label htmlFor="dm-user-id">Friend ID (Required)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="dm-user-id"
                                        placeholder="Enter friend user ID..."
                                        value={dmUserId}
                                        onChange={(e) => setDmUserId(e.target.value)}
                                        className="font-mono flex-1"
                                    />
                                    <Button
                                        onClick={() => setDmUserId(address || "")}
                                        variant="outline"
                                        size="sm"
                                        disabled={!address}
                                        className="px-3"
                                    >
                                        Self
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dm-content">DM Content (Required)</Label>
                                <Input
                                    id="dm-content"
                                    placeholder="Enter DM content..."
                                    value={dmContent}
                                    onChange={(e) => setDmContent(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dm-message-id">DM Message ID (For Edit/Delete)</Label>
                                <Input
                                    id="dm-message-id"
                                    placeholder="Enter DM message ID..."
                                    value={dmMessageId}
                                    onChange={(e) => setDmMessageId(e.target.value)}
                                    className="font-mono"
                                />
                            </div>
                            <Button
                                onClick={() => subspaceActions.profiles.sendDM({
                                    userId: dmUserId,
                                    content: dmContent
                                })}
                                variant="outline"
                                className="w-full justify-start gap-2"
                                disabled={!connected || !dmUserId.trim() || !dmContent.trim()}
                            >
                                <Send className="h-4 w-4" />
                                Send DM
                            </Button>
                            <Button
                                onClick={() => subspaceActions.profiles.editDM({
                                    userId: dmUserId,
                                    messageId: dmMessageId,
                                    content: dmContent + " (edited)"
                                })}
                                variant="outline"
                                className="w-full justify-start gap-2"
                                disabled={!connected || !dmUserId.trim() || !dmMessageId.trim()}
                            >
                                <Search className="h-4 w-4" />
                                Edit DM
                            </Button>
                            <Button
                                onClick={() => subspaceActions.profiles.deleteDM({
                                    userId: dmUserId,
                                    messageId: dmMessageId
                                })}
                                variant="destructive"
                                className="w-full justify-start gap-2"
                                disabled={!connected || !dmUserId.trim() || !dmMessageId.trim()}
                            >
                                <Plus className="h-4 w-4 rotate-45" />
                                Delete DM
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Enhanced Friend Management */}
                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Heart className="h-5 w-5" />
                                Friend Management
                            </CardTitle>
                            <CardDescription>
                                Add, accept, reject, and remove friends
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-2">
                                <Label htmlFor="friend-id">Friend ID (Required)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="friend-id"
                                        placeholder="Enter friend user ID..."
                                        value={friendId}
                                        onChange={(e) => setFriendId(e.target.value)}
                                        className="font-mono flex-1"
                                    />
                                    <Button
                                        onClick={() => setFriendId(address || "")}
                                        variant="outline"
                                        size="sm"
                                        disabled={!address}
                                        className="px-3"
                                    >
                                        Self
                                    </Button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    onClick={() => subspaceActions.profiles.addFriend(friendId)}
                                    variant="outline"
                                    className="w-full justify-start gap-2"
                                    disabled={!connected || !friendId.trim()}
                                >
                                    <UserPlus className="h-4 w-4" />
                                    Add Friend
                                </Button>
                                <Button
                                    onClick={() => subspaceActions.profiles.acceptFriend(friendId)}
                                    variant="outline"
                                    className="w-full justify-start gap-2"
                                    disabled={!connected || !friendId.trim()}
                                >
                                    <UserCheck className="h-4 w-4" />
                                    Accept
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    onClick={() => subspaceActions.profiles.rejectFriend(friendId)}
                                    variant="outline"
                                    className="w-full justify-start gap-2"
                                    disabled={!connected || !friendId.trim()}
                                >
                                    <UserX className="h-4 w-4" />
                                    Reject
                                </Button>
                                <Button
                                    onClick={() => subspaceActions.profiles.removeFriend(friendId)}
                                    variant="destructive"
                                    className="w-full justify-start gap-2"
                                    disabled={!connected || !friendId.trim()}
                                >
                                    <UserX className="h-4 w-4" />
                                    Remove
                                </Button>
                            </div>
                            <Separator />
                            <Button
                                onClick={() => subspaceActions.profiles.update({
                                    bio: "Updated bio from dev console",
                                    // pfp: "https://arweave.net/updated-pfp",
                                    // banner: "https://arweave.net/updated-banner"
                                })}
                                variant="outline"
                                className="w-full justify-start gap-2"
                                disabled={!connected}
                            >
                                <User className="h-4 w-4" />
                                Update Profile
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Fourth Row - DM Conversations and Recent DMs */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* DM Conversation Management */}
                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquare className="h-5 w-5" />
                                DM Conversation Management
                            </CardTitle>
                            <CardDescription>
                                Get and manage DM conversations
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-2">
                                <Label htmlFor="dm-process-id">DM Process ID (Auto-filled from profile)</Label>
                                <Input
                                    id="dm-process-id"
                                    placeholder="Enter DM process ID..."
                                    value={dmProcessId}
                                    onChange={(e) => setDmProcessId(e.target.value)}
                                    className="font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dm-conversation-friend-id">Friend ID for Conversation</Label>
                                <Input
                                    id="dm-conversation-friend-id"
                                    placeholder="Enter friend ID..."
                                    value={dmUserId}
                                    onChange={(e) => setDmUserId(e.target.value)}
                                    className="font-mono"
                                />
                            </div>
                            <Button
                                onClick={() => subspaceActions.profiles.getDmConversation(dmProcessId, dmUserId)}
                                variant="outline"
                                className="w-full justify-start gap-2"
                                disabled={!connected || !dmProcessId.trim() || !dmUserId.trim()}
                            >
                                <Search className="h-4 w-4" />
                                Get DM Conversation
                            </Button>
                            <Button
                                onClick={() => subspaceActions.profiles.getConversationIds(dmProcessId)}
                                variant="outline"
                                className="w-full justify-start gap-2"
                                disabled={!connected || !dmProcessId.trim()}
                            >
                                <Users className="h-4 w-4" />
                                Get Conversation IDs
                            </Button>
                            <Button
                                onClick={() => subspaceActions.profiles.getBlockedUsers(dmProcessId)}
                                variant="outline"
                                className="w-full justify-start gap-2"
                                disabled={!connected || !dmProcessId.trim()}
                            >
                                <UserX className="h-4 w-4" />
                                Get Blocked Users
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Recent DMs and Friends Display */}
                    {/* <Card className="h-fit">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Recent Activity
                            </CardTitle>
                            <CardDescription>
                                View recent DMs and friends
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-2">
                                <Label>Recent DMs</Label>
                                <Json value={useRecentDms()} />
                            </div>
                            <div className="space-y-2">
                                <Label>Current Friends</Label>
                                <Json value={profile?.friends || {}} />
                            </div>
                            <div className="space-y-2">
                                <Label>DM Process ID</Label>
                                <code className="text-xs font-mono p-2 bg-muted rounded-lg">
                                    {profile?.dm_process || "Not available"}
                                </code>
                            </div>
                        </CardContent>
                    </Card> */}
                </div>

                {/* Debug Information */}
                {/* <Card className="border-dashed">
                    <CardHeader>
                        <CardTitle className="text-sm font-mono">Debug Information</CardTitle>
                        <CardDescription>
                            Current state and loaded data for debugging
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            <div>
                                <p className="font-medium mb-2">Profiles:</p>
                                <Json value={profiles} />
                            </div>
                            <div>
                                <p className="font-medium mb-2">Servers:</p>
                                <Json value={servers} />
                            </div>
                            <div>
                                <p className="font-medium mb-2">Members:</p>
                                <Json value={members} />
                            </div>
                            <div>
                                <p className="font-medium mb-2">DM Conversations:</p>
                                <Json value={useSubspace((state) => state.dmConversations)} />
                            </div>
                            <div>
                                <p className="font-medium mb-2">Recent DMs:</p>
                                <Json value={useRecentDms()} />
                            </div>
                            <div>
                                <p className="font-medium mb-2">Friends & Blocked:</p>
                                <Json value={{
                                    friends: useSubspace((state) => state.friends),
                                    blockedUsers: useSubspace((state) => state.blockedUsers)
                                }} />
                            </div>
                        </div>
                    </CardContent>
                </Card> */}
            </div>
        </div>
    )
}