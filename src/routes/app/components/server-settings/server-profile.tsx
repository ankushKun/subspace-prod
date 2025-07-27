import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Upload, X } from "lucide-react"

const bannerColors = [
    "#5865F2", // Blurple
    "#ED4245", // Red  
    "#FEE75C", // Yellow
    "#57F287", // Green
    "#EB459E", // Pink
    "#9C84EF", // Purple
    "#00D9FF", // Cyan
    "#FF6B35", // Orange
    "#7289DA", // Light Blue
    "#99AAB5", // Grey
]

export default function ServerProfile() {
    const [serverName, setServerName] = useState("Arweave India")
    const [serverDescription, setServerDescription] = useState("")
    const [selectedBannerColor, setSelectedBannerColor] = useState(bannerColors[0])
    const [serverIcon, setServerIcon] = useState<string | null>(null)

    const handleIconUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = (e) => {
                setServerIcon(e.target?.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const removeIcon = () => {
        setServerIcon(null)
    }

    return (
        <div className="p-6 space-y-6">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary)/0.02)_0%,transparent_50%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(var(--primary)/0.02)_0%,transparent_50%)] pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                {/* Server Name */}
                <Card className="border-primary/30 shadow-lg backdrop-blur-sm relative">
                    {/* Card glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-xl pointer-events-none" />

                    <CardHeader className="relative z-10 pb-3">
                        <CardTitle className="font-freecam text-primary tracking-wide">SERVER NAME</CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <Input
                            value={serverName}
                            onChange={(e) => setServerName(e.target.value)}
                            placeholder="Enter server name"
                            className="font-ocr bg-background/80 border-primary/30 focus:border-primary focus:ring-primary/20"
                        />
                    </CardContent>
                </Card>

                {/* Server Icon */}
                <Card className="border-primary/30 shadow-lg backdrop-blur-sm relative">
                    {/* Card glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-xl pointer-events-none" />

                    <CardHeader className="relative z-10 pb-3">
                        <CardTitle className="font-freecam text-primary tracking-wide">SERVER ICON</CardTitle>
                        <CardDescription className="font-ocr text-primary/60">
                            We recommend an image of at least 512x512.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="relative z-10 space-y-4">
                        <div className="flex items-center gap-4">
                            {serverIcon ? (
                                <div className="relative">
                                    <img
                                        src={serverIcon}
                                        alt="Server icon"
                                        className="w-20 h-20 rounded-full object-cover border-2 border-primary/30"
                                    />
                                    <Button
                                        size="icon"
                                        variant="destructive"
                                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full"
                                        onClick={removeIcon}
                                    >
                                        <X className="w-3 h-3" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-dashed border-primary/30 flex items-center justify-center">
                                    <Upload className="w-6 h-6 text-primary/60" />
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="icon-upload" className="font-ocr">
                                    <Button variant="outline" asChild className="cursor-pointer font-ocr border-primary/30 hover:border-primary text-primary hover:bg-primary/10">
                                        <span>Change Server Icon</span>
                                    </Button>
                                </Label>
                                <input
                                    id="icon-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleIconUpload}
                                />
                                {serverIcon && (
                                    <Button variant="destructive" size="sm" onClick={removeIcon} className="font-ocr">
                                        Remove Icon
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Server Banner */}
                {/* <Card className="border-primary/30 shadow-lg backdrop-blur-sm relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-xl pointer-events-none" />

                    <CardHeader className="relative z-10 pb-3">
                        <CardTitle className="font-freecam text-primary tracking-wide">SERVER BANNER</CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10 space-y-4">
                        <div
                            className="w-full h-32 rounded-lg border-2 border-primary/30 relative overflow-hidden"
                            style={{ backgroundColor: selectedBannerColor }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                            {bannerColors.map((color) => (
                                <button
                                    key={color}
                                    className={cn(
                                        "w-12 h-12 rounded-lg border-2 transition-all duration-200 hover:scale-110",
                                        selectedBannerColor === color
                                            ? "border-primary ring-2 ring-primary/50 scale-105"
                                            : "border-primary/30 hover:border-primary/60"
                                    )}
                                    style={{ backgroundColor: color }}
                                    onClick={() => setSelectedBannerColor(color)}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card> */}

                {/* Server Description */}
                <Card className="border-primary/30 shadow-lg backdrop-blur-sm relative">
                    {/* Card glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-xl pointer-events-none" />

                    <CardHeader className="relative z-10 pb-3">
                        <CardTitle className="font-freecam text-primary tracking-wide">SERVER DESCRIPTION</CardTitle>
                        <CardDescription className="font-ocr text-primary/60">
                            Help others discover your server by providing a description.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <textarea
                            value={serverDescription}
                            onChange={(e) => setServerDescription(e.target.value)}
                            placeholder="Write a short description about your server..."
                            className="w-full min-h-[100px] p-3 rounded-md border border-primary/30 bg-background/80 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary font-ocr text-foreground placeholder:text-muted-foreground"
                            maxLength={120}
                        />
                        <p className="text-xs text-primary/60 mt-2 font-ocr">
                            {serverDescription.length}/120 characters
                        </p>
                    </CardContent>
                </Card>

                {/* Save Changes */}
                <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" className="font-ocr border-primary/30 hover:border-primary text-primary hover:bg-primary/10">
                        Reset
                    </Button>
                    <Button className="font-freecam tracking-wide bg-primary hover:bg-primary/90 text-primary-foreground">
                        SAVE CHANGES
                    </Button>
                </div>
            </div>
        </div>
    )
}
