import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BotIcon, Plus, Settings, Trash2, Code, Users, Zap, ArrowLeft, User, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { useWallet } from "@/hooks/use-wallet"
import { useSubspace } from "@/hooks/use-subspace"
import { useGlobalState } from "@/hooks/use-global-state"
import { shortenAddress } from "@/lib/utils"
import alien from "@/assets/subspace/alien-black.svg"
import LoginDialog from "@/components/login-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import alienLogo from "@/assets/subspace/alien-green.svg"
import type { Bot } from "@subspace-protocol/sdk"

export default function BotsPage() {
    const navigate = useNavigate()
    const { address, connected, actions: walletActions } = useWallet()
    const { profile, subspace, actions: subspaceActions } = useSubspace()
    const [sortBy, setSortBy] = useState("date-created")
    const [newBotDialogOpen, setNewBotDialogOpen] = useState(false)
    const [newBotName, setNewBotName] = useState("")
    const [newBotDescription, setNewBotDescription] = useState("")
    const [isCreating, setIsCreating] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [myBots, setMyBots] = useState<Bot[]>([])
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!connected || !address || !subspace) return

        subspaceActions.profile.get()
    }, [connected, address, subspace])

    useEffect(() => {
        if (!connected || !address || !subspace) return

        loadUserBots()
    }, [connected, address, subspace])

    const loadUserBots = async () => {
        if (!subspace || !address) return

        setIsLoading(true)
        setError(null)
        try {
            const bots = await subspace.bot.getBotsByOwner(address)
            setMyBots(bots)
        } catch (error) {
            console.error("Failed to load bots:", error)
            setError("Failed to load bots. Please try again.")
            // For now, keep the mock data if loading fails
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateNewBot = async () => {
        if (!newBotName.trim() || !subspace || !address) return

        setIsCreating(true)
        setError(null)
        try {
            // Create the bot using the BotManager
            const botId = await subspace.bot.createBot({
                name: newBotName.trim(),
                description: newBotDescription.trim() || undefined,
                publicBot: true
            })

            if (botId) {
                // Reload the bots list to show the new bot
                await loadUserBots()

                // Close dialog and reset form
                setNewBotDialogOpen(false)
                setNewBotName("")
                setNewBotDescription("")

                console.log("Bot created successfully:", botId)
            } else {
                throw new Error("Failed to create bot")
            }
        } catch (error) {
            console.error("Failed to create bot:", error)
            setError("Failed to create bot. Please try again.")
            // You could add an error toast here
        } finally {
            setIsCreating(false)
        }
    }

    const handleDeleteBot = async (botId: string) => {
        if (!subspace) return

        try {
            const success = await subspace.bot.deleteBot(botId)
            if (success) {
                // Remove bot from local state
                setMyBots(prevBots => prevBots.filter(bot => bot.process !== botId))
                console.log("Bot deleted successfully")
            }
        } catch (error) {
            console.error("Failed to delete bot:", error)
        }
    }

    const renderBotCard = (bot: Bot) => (
        <Link to={`/developer/bots/${bot.process}`}>
            <Card
                key={bot.process}
                className="group border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/70 hover:-translate-y-2 transition-all duration-300 cursor-pointer p-6 relative"
            >
                <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center overflow-hidden">
                        {bot.pfp ? (
                            <img src={`https://arweave.net/${bot.pfp}`} alt={bot.name} className="w-full h-full object-cover" />
                        ) : (
                            <BotIcon className="w-8 h-8 text-primary" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate text-base">
                            {bot.name}
                        </h3>
                        {/* <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {bot.botPublic ? "Public Bot" : "Private Bot"}
                    </p> */}
                    </div>
                </div>
            </Card>
        </Link>
    )

    return (
        <div className="min-h-screen bg-background p-6">
            {/* Background grid pattern */}
            <div
                className="fixed inset-0 opacity-[0.02] pointer-events-none"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '32px 32px'
                }}
            />

            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Header Menu Bar */}
                <div className="flex items-center justify-between mb-8 p-4 bg-card/30 backdrop-blur-sm rounded-xl border border-border/50">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            onClick={() => navigate("/developer")}
                            className="flex items-center gap-2 p-2 h-auto hover:bg-primary/10 transition-colors font-ocr text-primary border border-transparent hover:border-primary/30"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Back</span>
                        </Button>
                        <div className="text-xl flex items-center justify-center gap-2">
                            <img src={alienLogo} alt="Subspace" className="w-8 h-8" />
                            <span className="font-ocr pt-1.5 text-primary">Dev</span>
                        </div>
                    </div>


                    {/* Profile Component */}
                    {!address ? (
                        <div className="flex items-center gap-2">
                            {/* Login Button */}
                            <LoginDialog>
                                <Button
                                    asChild
                                    variant="ghost"
                                    className="flex items-center gap-2 p-2 h-auto hover:bg-primary/10 transition-colors grow font-ocr text-primary border border-transparent hover:border-primary/30"
                                >
                                    <div className="flex items-center gap-2 w-full">
                                        {/* Alien Avatar Placeholder */}
                                        <div className="relative flex-shrink-0">
                                            <div className="w-8 h-8 rounded-sm overflow-hidden bg-primary/20 flex items-center justify-center border border-primary/30">
                                                <img src={alien} alt="alien" className="w-5 h-5 opacity-60" />
                                            </div>
                                            {/* Disconnected status indicator */}
                                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-sm border border-background animate-pulse"></div>
                                        </div>

                                        {/* Login Info */}
                                        <div className="flex-1 min-w-0 text-left">
                                            <div className="text-sm font-medium text-primary truncate">
                                                Sign In
                                            </div>
                                            <div className="text-xs text-primary/60 flex items-center gap-1">
                                                <span className="truncate">Join the conversation</span>
                                            </div>
                                        </div>
                                    </div>
                                </Button>
                            </LoginDialog>
                        </div>
                    ) : (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="flex items-center ml-auto w-fit gap-2 p-2 h-auto hover:bg-primary/10 transition-colors font-ocr text-primary border border-transparent hover:border-primary/30"
                                >
                                    {/* User Avatar */}
                                    <div className="relative flex-shrink-0">
                                        <div className="w-8 h-8 rounded-sm overflow-hidden bg-primary/20 flex items-center justify-center border border-primary/30">
                                            {profile?.pfp ? (
                                                <img
                                                    src={`https://arweave.net/${profile.pfp}`}
                                                    alt="Profile"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <img src={alien} alt="alien" className="w-5 h-5 opacity-80" />
                                            )}
                                        </div>
                                        {/* Online status indicator */}
                                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-sm border border-background animate-pulse"></div>
                                    </div>

                                    {/* User Info */}
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="text-sm font-medium text-primary truncate max-w-52">
                                            {profile?.primaryName || shortenAddress(profile?.userId || address || "")}
                                        </div>
                                        <div className="text-xs text-primary/60 flex items-center gap-1">
                                            <span className="truncate max-w-52">{shortenAddress(address || "")}</span>
                                        </div>
                                    </div>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                className="w-80 bg-background border border-primary/20 font-ocr"
                                sideOffset={0}
                                alignOffset={-10}
                                side="top"
                            >
                                <DropdownMenuItem
                                    className="cursor-pointer flex items-center gap-3 p-3 text-sm hover:bg-red-500/10 rounded-sm transition-colors text-red-400"
                                    onClick={() => {
                                        walletActions.disconnect()
                                    }}
                                >
                                    <LogOut className="h-4 w-4" />
                                    <div>
                                        <p className="font-medium">Disconnect</p>
                                        <p className="text-xs text-red-400/60">Sign out of wallet</p>
                                    </div>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                {/* Page Header */}
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground font-ocr mb-2">
                            Bots
                        </h1>
                        <p className="text-lg text-muted-foreground max-w-2xl">
                            Develop bots to customize and extend Subspace for millions of users
                        </p>
                    </div>
                    <Button
                        onClick={() => setNewBotDialogOpen(true)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                    >
                        {isCreating ? (
                            <svg className="animate-spin h-4 w-4 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <Plus className="w-5 h-5 mr-2" />
                        )}
                        {isCreating ? "Creating..." : "New Bot"}
                    </Button>
                </div>

                {/* My Bots Section */}
                <div className="mb-12">
                    <div className="flex items-center justify-between mb-6">
                        <span className="text-sm text-muted-foreground ml-auto">
                            {myBots.length} bots
                        </span>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">Loading bots...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-red-500/20 to-red-500/10 flex items-center justify-center">
                                <BotIcon className="w-8 h-8 text-red-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">Failed to load bots</h3>
                            <p className="text-red-500 mb-4">{error}</p>
                            <Button
                                onClick={loadUserBots}
                                variant="outline"
                                className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                            >
                                Try Again
                            </Button>
                        </div>
                    ) : myBots.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                                <BotIcon className="w-8 h-8 text-primary" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">No bots yet</h3>
                            <p className="text-muted-foreground mb-4">
                                Create your first bot to get started with Subspace development
                            </p>
                            <Button
                                onClick={() => setNewBotDialogOpen(true)}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Create Your First Bot
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {myBots.map(bot => (
                                <div key={bot.process} className="relative">
                                    {renderBotCard(bot)}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* New Bot Dialog */}
            <AlertDialog open={newBotDialogOpen} onOpenChange={setNewBotDialogOpen}>
                <AlertDialogContent className="bg-background border border-primary/20">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-ocr text-primary">
                            Create New Bot
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                            Enter a name for your new bot. You can customize it further after creation.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="py-4">
                        <div className="space-y-2">
                            <label htmlFor="bot-name" className="text-sm font-medium text-foreground">
                                Bot Name
                            </label>
                            <Input
                                id="bot-name"
                                placeholder="MyAwesomeBot"
                                value={newBotName}
                                onChange={(e) => setNewBotName(e.target.value)}
                                className="bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newBotName.trim()) {
                                        handleCreateNewBot()
                                    }
                                }}
                            />
                        </div>
                        <div className="mt-4 space-y-2">
                            <label htmlFor="bot-description" className="text-sm font-medium text-foreground">
                                Bot Description (Optional)
                            </label>
                            <Input
                                id="bot-description"
                                placeholder="A brief description of your bot"
                                value={newBotDescription}
                                onChange={(e) => setNewBotDescription(e.target.value)}
                                className="bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
                            />
                        </div>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => {
                                setNewBotName("")
                                setNewBotDescription("")
                                setNewBotDialogOpen(false)
                            }}
                            className="border-border/50 text-muted-foreground hover:text-foreground"
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCreateNewBot}
                            disabled={!newBotName.trim() || isCreating}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCreating ? "Creating..." : "Create Bot"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}