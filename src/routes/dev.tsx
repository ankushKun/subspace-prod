import LoginDialog from "@/components/login-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useProfiles, useSubspace2 } from "@/hooks/use-subspace2"
import { useWallet } from "@/hooks/use-wallet"
import { Subspace } from "@subspace-protocol/sdk"
import { useEffect, useState } from "react"
import { User, Server, Plus, Search, UserPlus, Code2, Wallet } from "lucide-react"

export default function Dev() {
    const { profiles, servers, actions: subspaceActions } = useSubspace2()
    const { connected, address, actions: walletActions } = useWallet()
    const profile = useProfiles(address)
    const [serverId, setServerId] = useState("server-id")
    const [userId, setUserId] = useState("")

    useEffect(() => {
        if (!connected || !address) return console.log("No connected wallet")
        if (Subspace.initialized) return console.log("Subspace already initialized")

        async function init() {
            const signer = await walletActions.getSigner()
            Subspace.init({ signer, address, HB_URL: "https://hb.arweave.tech" })
            subspaceActions.profiles.get(address)
        }
        init()
    }, [connected, address])

    // Set default userId to user's wallet address
    useEffect(() => {
        if (address) {
            setUserId(address)
        }
    }, [address])

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
            <div className="mx-auto max-w-6xl space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-2">
                        <Code2 className="h-8 w-8 text-primary" />
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            Developer Console
                        </h1>
                    </div>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Test and interact with Subspace SDK features in a beautiful development environment
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
                        </div>
                    </CardContent>
                </Card>

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
                                <Label htmlFor="user-id">User ID</Label>
                                <Input
                                    id="user-id"
                                    placeholder="Enter user ID (wallet address)..."
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                    className="font-mono"
                                />
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
                                        <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                                            {JSON.stringify(profile, null, 2)}
                                        </pre>
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
                                <Label htmlFor="server-id">Server ID</Label>
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
                            <Button
                                onClick={() => subspaceActions.servers.create({
                                    serverName: "Dev Test Server",
                                    serverDescription: "A test server created from the developer console",
                                    serverPfp: "https://arweave.net/123",
                                    serverBanner: "https://arweave.net/123"
                                })}
                                variant="outline"
                                className="w-full justify-start gap-2"
                                disabled={!connected}
                            >
                                <Plus className="h-4 w-4" />
                                Create Test Server
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
                        </CardContent>
                    </Card>
                </div>

                {/* Debug Information */}
                <Card className="border-dashed">
                    <CardHeader>
                        <CardTitle className="text-sm font-mono">Debug Information</CardTitle>
                        <CardDescription>
                            Current state and loaded data for debugging
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="font-medium mb-2">Profiles:</p>
                                <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                                    {JSON.stringify(profiles, null, 2)}
                                </pre>
                            </div>
                            <div>
                                <p className="font-medium mb-2">Servers:</p>
                                <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                                    {JSON.stringify(servers, null, 2)}
                                </pre>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}