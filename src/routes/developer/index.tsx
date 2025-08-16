import { useState } from "react"
import { Link } from "react-router"
import { useSubspace } from "@/hooks/use-subspace"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Bot, Code, Settings, Zap, Users, MessageSquare, Globe, Shield, Code2, Rocket, Terminal, Cpu, Database, GitBranch, Sparkles, ArrowRight, Play, BookOpen, Github, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

export default function Developer() {
    const { actions, subspace } = useSubspace()
    const [isCreatingBot, setIsCreatingBot] = useState(false)
    const [botForm, setBotForm] = useState({
        name: "",
        description: "",
        source: "",
        publicBot: true
    })

    const handleCreateBot = async () => {
        if (!subspace || !botForm.name.trim()) return

        setIsCreatingBot(true)
        try {
            const botId = await subspace.bot.createBot({
                name: botForm.name,
                description: botForm.description || undefined,
                source: botForm.source || undefined
            })

            if (botId) {
                // Reset form and show success
                setBotForm({ name: "", description: "", source: "", publicBot: true })
                // You could add a toast notification here
            }
        } catch (error) {
            console.error("Failed to create bot:", error)
            // You could add error handling here
        } finally {
            setIsCreatingBot(false)
        }
    }

    return (
        <div className="min-h-screen bg-background">
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

            {/* Floating particles effect */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-2 h-2 bg-primary/30 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
                <div className="absolute top-40 right-20 w-1 h-1 bg-primary/20 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute bottom-40 left-20 w-1.5 h-1.5 bg-primary/25 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="absolute bottom-20 right-10 w-1 h-1 bg-primary/15 rounded-full animate-pulse" style={{ animationDelay: '3s' }}></div>
            </div>

            <div className="relative z-10">
                {/* Hero Section */}
                <div className="relative overflow-hidden">
                    <div className="max-w-7xl mx-auto px-6 py-20">
                        <div className="text-center space-y-8">
                            {/* Main Icon */}
                            <div className="flex justify-center">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-2xl shadow-primary/25">
                                        <Code2 className="w-12 h-12 text-primary-foreground" />
                                    </div>
                                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-primary/80 to-primary/60 rounded-full flex items-center justify-center">
                                        <Sparkles className="w-4 h-4 text-primary-foreground" />
                                    </div>
                                </div>
                            </div>

                            {/* Main Headlines */}
                            <div className="space-y-4">
                                <h1 className="text-5xl md:text-7xl font-bold text-muted-foreground font-ocr leading-tight">
                                    Be a <span className="text-primary">Subspace</span>
                                </h1>
                                <h2 className="text-5xl md:text-7xl font-bold text-primary font-ocr leading-tight">
                                    Developer
                                </h2>
                                <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                                    Build and deploy intelligent bots, create powerful applications, and shape the future of decentralized communication
                                </p>
                            </div>

                            {/* CTA Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                <Link to="/developer/bots">
                                    <Button
                                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-2xl font-medium shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 text-lg"
                                    >
                                        <Rocket className="w-5 h-5 mr-2" />
                                        Start Building
                                    </Button>
                                </Link>
                                <a href="https://docs_subspace.ar.io" target="_blank" rel="noopener noreferrer">
                                    <Button
                                        variant="outline"
                                        className="border-2 border-primary/30 hover:border-primary/50 text-primary hover:text-primary px-8 py-4 rounded-2xl font-medium transition-all duration-300 transform hover:scale-105 text-lg"
                                    >
                                        <BookOpen className="w-5 h-5 mr-2" />
                                        View Documentation
                                    </Button>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="max-w-7xl mx-auto px-6 py-20">
                    <div className="text-center mb-16">
                        <h3 className="text-3xl md:text-4xl font-bold text-foreground font-ocr mb-4">
                            Everything You Need to Build
                        </h3>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            Powerful tools and infrastructure to bring your ideas to life in the Subspace ecosystem
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Build a Bot */}
                        <Link to="/developer/bots" className="block">
                            <Card className="group border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/70 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 cursor-pointer">
                                <CardHeader className="text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                        <Bot className="w-8 h-8 text-primary" />
                                    </div>
                                    <CardTitle className="text-xl font-ocr">Build a Bot</CardTitle>
                                    <CardDescription>
                                        Create intelligent bots with custom Lua logic for moderation, automation, and enhanced user experiences
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        </Link>

                        {/* Subspace SDK */}
                        <a href="https://www.npmjs.com/package/@subspace-protocol/sdk" target="_blank" rel="noopener noreferrer" className="block">
                            <Card className="group border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/70 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 cursor-pointer">
                                <CardHeader className="text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                        <Code className="w-8 h-8 text-primary" />
                                    </div>
                                    <CardTitle className="text-xl font-ocr">Subspace SDK</CardTitle>
                                    <CardDescription>
                                        Comprehensive SDK for JavaScript and TypeScript to integrate with Subspace seamlessly
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        </a>

                        {/* Bot SDK */}
                        <a href="https://www.npmjs.com/package/@subspace-protocol/bot-sdk" target="_blank" rel="noopener noreferrer" className="block">
                            <Card className="group border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/70 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 cursor-pointer">
                                <CardHeader className="text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                        <Terminal className="w-8 h-8 text-primary" />
                                    </div>
                                    <CardTitle className="text-xl font-ocr">Bot SDK</CardTitle>
                                    <CardDescription>
                                        Specialized SDK for building and managing bots on the Subspace platform
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        </a>

                        {/* Documentation */}
                        <a href="https://docs_subspace.ar.io" target="_blank" rel="noopener noreferrer" className="block">
                            <Card className="group border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/70 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 cursor-pointer">
                                <CardHeader className="text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                        <BookOpen className="w-8 h-8 text-primary" />
                                    </div>
                                    <CardTitle className="text-xl font-ocr">Documentation</CardTitle>
                                    <CardDescription>
                                        Comprehensive guides, API references, and tutorials for Subspace development
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        </a>
                    </div>
                </div>

            </div>
        </div>
    )
}