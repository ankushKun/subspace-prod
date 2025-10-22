import SubspaceLoader from "@/components/subspace-loader"
import { useServer, useSubspaceActions, useProfile, usePrimaryName } from "@/hooks/use-subspace"
import { useWallet } from "@/hooks/use-wallet"
import { Subspace, SubspaceValidation } from "@subspace-protocol/sdk"
import { useParams, useNavigate } from "react-router"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, Hash, Crown, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { ProfilePopover, ProfileAvatar } from "@/components/profile"
import { shortenAddress } from "@/lib/utils"

export default function Invite() {
    const [showLoader, setShowLoader] = useState(true)
    const [loaderAnimating, setLoaderAnimating] = useState(false)
    const [isJoining, setIsJoining] = useState(false)
    const [joinError, setJoinError] = useState<string | null>(null)
    const [joinSuccess, setJoinSuccess] = useState(false)
    const { connected, address } = useWallet()
    const { inviteCode } = useParams()
    const navigate = useNavigate()
    const subspaceActions = useSubspaceActions()
    const server = useServer(inviteCode)
    const ownerProfile = useProfile(server?.profile?.owner || '')
    const ownerPrimaryName = usePrimaryName(server?.profile?.owner || '')
    const userProfile = useProfile(address || '')
    const invalidCode = SubspaceValidation.isValidTxId(inviteCode)

    // Handle loader transition when Subspace becomes initialized
    useEffect(() => {
        if (Subspace.initialized && showLoader && !loaderAnimating) {
            setLoaderAnimating(true)
            // Wait for blur-out animation to complete before hiding loader
            setTimeout(() => {
                setShowLoader(false)
                setLoaderAnimating(false)
            }, 400) // Match the blur-out animation duration
        }
    }, [Subspace.initialized, showLoader, loaderAnimating])

    // Reset loader state when Subspace becomes uninitialized
    useEffect(() => {
        if (!Subspace.initialized && !showLoader) {
            setShowLoader(true)
            setLoaderAnimating(false)
        }
    }, [Subspace.initialized, showLoader])

    useEffect(() => {
        if (!Subspace.initialized) return
        if (!inviteCode) return console.error("No invite code", inviteCode)
        if (!invalidCode) return console.error("Invalid invite code", inviteCode)
        subspaceActions.servers.get(inviteCode)
    }, [inviteCode, invalidCode, Subspace.initialized])

    // Fetch owner profile when server is loaded
    useEffect(() => {
        if (server?.profile?.owner) {
            subspaceActions.profiles.get(server.profile.owner)
        }
    }, [server?.profile?.owner])

    const handleJoinServer = async () => {
        if (!inviteCode || !server) return

        setIsJoining(true)
        setJoinError(null)

        try {
            const success = await subspaceActions.servers.join(inviteCode)
            if (success) {
                setJoinSuccess(true)
                // Navigate to the server after a short delay
                setTimeout(() => {
                    navigate(`/app/${inviteCode}`)
                }, 1500)
            } else {
                setJoinError("Failed to join server. Please try again.")
            }
        } catch (error) {
            setJoinError("An error occurred while joining the server.")
            console.error("Join server error:", error)
        } finally {
            setIsJoining(false)
        }
    }

    // if subspace is not initialized or loader is still showing, show the loader
    if (!Subspace.initialized && connected) {
        return <SubspaceLoader isAnimatingOut={loaderAnimating} />
    }

    // Show error for invalid invite code
    if (inviteCode && !invalidCode) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="p-3 rounded-full bg-destructive/10">
                                <AlertCircle className="h-8 w-8 text-destructive" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold">Invalid Invite</h2>
                                <p className="text-muted-foreground mt-2">
                                    This invite link is not valid or has expired.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => navigate('/app')}
                                className="w-full"
                            >
                                Go Home
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Show skeleton loading state while server data is being fetched
    if (!server) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-md bg-background/95 backdrop-blur-md border-2 border-primary/20 shadow-2xl">
                    <CardContent className="p-8">
                        {/* Server Avatar Skeleton */}
                        <div className="flex justify-center mb-6">
                            <Skeleton className="h-20 w-20 rounded-full" />
                        </div>

                        {/* Invitation Text Skeleton */}
                        <div className="text-center mb-6 space-y-3">
                            <Skeleton className="h-4 w-48 mx-auto" />
                            <Skeleton className="h-8 w-64 mx-auto" />
                            <Skeleton className="h-4 w-40 mx-auto" />
                        </div>

                        {/* Server Stats Skeleton */}
                        <div className="space-y-3 mb-6">
                            <div className="flex items-center justify-center gap-2">
                                <Skeleton className="h-2 w-2 rounded-full" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                            <div className="flex items-center justify-center gap-2">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-6 w-20 rounded-md" />
                            </div>
                        </div>

                        {/* Join Button Skeleton */}
                        <div className="space-y-4">
                            <Skeleton className="h-12 w-full rounded-md" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Calculate server statistics
    const channelCount = Object.keys(server.channels || {}).length
    const categoryCount = Object.keys(server.categories || {}).length
    const roleCount = Object.keys(server.roles || {}).length

    // Check if user has already joined the server
    const hasJoinedServer = userProfile?.servers && inviteCode && userProfile.servers[inviteCode]?.approved

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">

            <Card className="w-full max-w-md bg-background/95 backdrop-blur-md border-2 border-primary/20 shadow-2xl">
                <CardContent className="p-0">
                    {/* Server Avatar - Centered */}
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                                <AvatarImage src={server.profile.pfp} alt={server.profile.name} />
                                <AvatarFallback className="text-2xl font-semibold bg-primary/10">
                                    {server.profile.name?.charAt(0)?.toUpperCase() || 'S'}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </div>

                    {/* Invitation Text */}
                    <div className="text-center mb-6">
                        <p className="text-sm text-muted-foreground mb-2">You've been invited to join</p>
                        <h1 className="text-2xl font-bold text-foreground mb-2">{server.profile.name}</h1>
                        {server.profile.description && (
                            <p className="text-sm text-muted-foreground">{server.profile.description}</p>
                        )}
                    </div>

                    {/* Server Stats */}
                    <div className="space-y-3 mb-6">
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>{server.member_count || 0} Members</span>
                        </div>

                        {/* Server Owner */}
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <span>Owned by</span>
                            <ProfilePopover userId={server.profile.owner}>
                                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer">
                                    <ProfileAvatar tx={ownerProfile?.pfp} className="h-4 w-4 !p-0" />
                                    <span className="text-sm font-medium text-foreground">
                                        {ownerPrimaryName || shortenAddress(server.profile.owner)}
                                    </span>
                                </div>
                            </ProfilePopover>
                        </div>
                    </div>

                    {/* Join Button */}
                    <div className="space-y-2">
                        {hasJoinedServer ? (
                            <div className="space-y-3 flex flex-col items-center">
                                <Button
                                    onClick={() => navigate(`/app/${inviteCode}`)}
                                    className="w-2/3 h-10 mx-auto bg-green-500/20 backdrop-blur-md border border-green-400/30 hover:bg-green-500/30 hover:border-green-400/50 text-white shadow-lg transition-all duration-300"
                                >
                                    Open Server
                                </Button>
                                <div className="flex items-center justify-center gap-2 p-1 px-2 rounded-lg bg-green-500/10 border border-green-500/20">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    <span className="text-green-500 text-sm p-0">
                                        You're already a member of {server.profile.name}
                                    </span>
                                </div>
                            </div>
                        ) : joinSuccess ? (
                            <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                <span className="text-green-500 font-medium">
                                    Successfully joined {server.profile.name}!
                                </span>
                            </div>
                        ) : (
                            <div className="space-y-2 flex items-center">
                                {isJoining ? (
                                    <Skeleton className="h-10 w-2/3 mx-auto bg-green-500/20 backdrop-blur-md border border-green-400/30 text-white shadow-lg">
                                        <span className="text-sm font-medium">Joining server...</span>
                                    </Skeleton>
                                ) : (
                                    <Button
                                        onClick={handleJoinServer}
                                        disabled={!connected}
                                        className="w-2/3 mx-auto h-10 bg-green-500/20 backdrop-blur-md border border-green-400/30 hover:bg-green-500/30 hover:border-green-400/50 text-white shadow-lg transition-all duration-300 disabled:bg-gray-500/20 disabled:border-gray-400/30 disabled:hover:bg-gray-500/20 disabled:hover:border-gray-400/30"
                                    >
                                        Accept Invite
                                    </Button>
                                )}

                                {!connected && (
                                    <p className="text-center text-sm text-muted-foreground">
                                        Please connect your wallet to join this server
                                    </p>
                                )}

                                {joinError && (
                                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                                        <AlertCircle className="h-4 w-4 text-destructive" />
                                        <span className="text-destructive text-sm">{joinError}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}