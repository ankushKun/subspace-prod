import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Settings2, Globe, Palette, Moon, Sun } from "lucide-react"
import { useNavigate } from "react-router"
import alien from "@/assets/subspace/alien-black.svg"
import { Constants } from "@/lib/constants"
import { setCuUrl } from "@/hooks/use-subspace"
import { useTheme } from "@/components/theme-provider"

export default function Settings() {
    const navigate = useNavigate()
    const [currentCuUrl, setCurrentCuUrl] = useState<string>("")
    const { theme, setTheme } = useTheme()

    // Load current CU URL from localStorage on mount
    useEffect(() => {
        const storedUrl = localStorage.getItem('subspace-cu-url') || Constants.CuEndpoints.Randao
        setCurrentCuUrl(storedUrl)
    }, [])

    // Handle CU URL change
    const handleCuUrlChange = (newUrl: string) => {
        setCurrentCuUrl(newUrl)
        setCuUrl(newUrl)

        // Refresh the app to apply the new CU URL
        setTimeout(() => {
            window.location.reload()
        }, 100)
    }

    // Get display name for CU endpoint
    const getCuDisplayName = (url: string) => {
        const entry = Object.entries(Constants.CuEndpoints).find(([_, value]) => value === url)
        return entry ? entry[0] : url
    }

    // Toggle theme between dark and light
    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark")
    }

    return (
        <div className="flex flex-col h-screen w-screen bg-background overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 relative border-b border-primary/20 bg-gradient-to-r from-background via-background/95 to-background">
                {/* Ambient glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-8 bg-primary/5 rounded-full blur-xl" />

                <div className="relative z-10 flex items-center justify-between p-4 px-6">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate("/app")}
                            className="w-9 h-9 rounded-sm text-primary/60 hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/30 transition-all"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-primary/20 rounded-sm border border-primary/30">
                                <img src={alien} alt="alien" className="w-5 h-5 opacity-80" />
                            </div>
                            <div>
                                <h1 className="text-xl font-freecam text-primary tracking-wide">
                                    SETTINGS
                                </h1>
                                <p className="text-xs font-ocr text-primary/60">
                                    Configure your experience
                                </p>
                            </div>
                        </div>
                    </div>

                    <Settings2 className="w-5 h-5 text-primary/60" />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/40">
                {/* Background decoration */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary)/0.02)_0%,transparent_50%)] pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(var(--primary)/0.02)_0%,transparent_50%)] pointer-events-none" />

                <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                    {/* Theme Section */}
                    <Card className="p-6 bg-card border-primary/30 shadow-lg backdrop-blur-sm relative">
                        {/* Card glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-xl pointer-events-none" />

                        <div className="relative z-10 space-y-4">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex items-center justify-center w-8 h-8 bg-primary/20 rounded-sm border border-primary/30">
                                    <Palette className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-freecam text-primary">
                                        THEME PREFERENCES
                                    </h2>
                                    <p className="text-sm font-ocr text-primary/60">
                                        Toggle between dark and light themes
                                    </p>
                                </div>
                            </div>

                            {/* Theme Toggle */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-4 bg-primary/10 rounded-sm border border-primary/30">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-primary font-ocr">
                                            {theme === "dark" ? "Dark Theme" : "Light Theme"}
                                        </span>
                                        <span className="text-xs text-primary/60">
                                            {theme === "dark" ? "Dark interface for low-light environments" : "Bright interface for well-lit environments"}
                                        </span>
                                    </div>
                                    <Button
                                        onClick={toggleTheme}
                                        variant="outline"
                                        size="icon"
                                        className="w-12 h-12 rounded-sm border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50 transition-all relative"
                                    >
                                        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                                        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* CU URL Section */}
                    <Card className="p-6 bg-card border-primary/30 shadow-lg backdrop-blur-sm relative">
                        {/* Card glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-xl pointer-events-none" />

                        <div className="relative z-10 space-y-4">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex items-center justify-center w-8 h-8 bg-primary/20 rounded-sm border border-primary/30">
                                    <Globe className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-freecam text-primary">
                                        COMPUTE UNIT ENDPOINT
                                    </h2>
                                    <p className="text-sm font-ocr text-primary/60">
                                        Select the AO Compute Unit endpoint
                                    </p>
                                </div>
                            </div>

                            {/* CU URL Selector */}
                            <div className="space-y-3">
                                <Select
                                    value={currentCuUrl}
                                    onValueChange={handleCuUrlChange}
                                >
                                    <SelectTrigger className="w-full bg-primary/10 border-primary/30 text-primary font-ocr h-12 text-left">
                                        <SelectValue placeholder="Select CU Endpoint">
                                            <div className="flex flex-col items-start">
                                                <span className="font-medium text-primary">
                                                    {getCuDisplayName(currentCuUrl)}
                                                </span>
                                                {/* <span className="text-xs text-primary/60 font-mono">
                                                    {currentCuUrl}
                                                </span> */}
                                            </div>
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent className="bg-background border border-primary/30 min-w-[400px]">
                                        {Object.entries(Constants.CuEndpoints).map(([name, url]) => (
                                            <SelectItem
                                                key={url}
                                                value={url}
                                                className="font-ocr text-primary hover:bg-primary/10 focus:bg-primary/10 cursor-pointer py-3"
                                            >
                                                <div className="flex flex-col gap-1 w-full">
                                                    <span className="font-medium text-primary text-sm">
                                                        {name}
                                                    </span>
                                                    <span className="text-xs text-primary/60 font-mono break-all">
                                                        {url}
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <div className="p-3 bg-primary/5 rounded-sm border border-primary/20">
                                    <p className="text-xs text-primary/80 font-ocr leading-relaxed">
                                        <strong className="text-primary">Note:</strong> Changing the CU endpoint will refresh the app to apply the changes.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}