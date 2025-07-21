import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Hash,
    Volume2,
    Plus,
    Settings,
    Trash2,
    GripVertical,
    Eye,
    EyeOff,
    Lock
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Channel {
    id: string
    name: string
    type: "text" | "voice"
    category?: string
    private: boolean
    position: number
}

interface Category {
    id: string
    name: string
    position: number
}

const mockCategories: Category[] = [
    { id: "general", name: "General", position: 0 },
    { id: "development", name: "Development", position: 1 },
    { id: "voice", name: "Voice Channels", position: 2 }
]

const mockChannels: Channel[] = [
    { id: "1", name: "general", type: "text", category: "general", private: false, position: 0 },
    { id: "2", name: "announcements", type: "text", category: "general", private: false, position: 1 },
    { id: "3", name: "coding", type: "text", category: "development", private: false, position: 0 },
    { id: "4", name: "help", type: "text", category: "development", private: false, position: 1 },
    { id: "5", name: "private-dev", type: "text", category: "development", private: true, position: 2 },
    { id: "6", name: "General", type: "voice", category: "voice", private: false, position: 0 },
    { id: "7", name: "Development", type: "voice", category: "voice", private: false, position: 1 }
]

export default function ServerChannels() {
    const [categories, setCategories] = useState(mockCategories)
    const [channels, setChannels] = useState(mockChannels)
    const [newChannelName, setNewChannelName] = useState("")
    const [newCategoryName, setNewCategoryName] = useState("")

    const getChannelsInCategory = (categoryId: string) => {
        return channels
            .filter(channel => channel.category === categoryId)
            .sort((a, b) => a.position - b.position)
    }

    const getChannelsWithoutCategory = () => {
        return channels
            .filter(channel => !channel.category)
            .sort((a, b) => a.position - b.position)
    }

    const addChannel = (type: "text" | "voice", categoryId?: string) => {
        if (!newChannelName.trim()) return

        const newChannel: Channel = {
            id: Date.now().toString(),
            name: newChannelName.toLowerCase().replace(/\s+/g, "-"),
            type,
            category: categoryId,
            private: false,
            position: getChannelsInCategory(categoryId || "").length
        }

        setChannels([...channels, newChannel])
        setNewChannelName("")
    }

    const addCategory = () => {
        if (!newCategoryName.trim()) return

        const newCategory: Category = {
            id: Date.now().toString(),
            name: newCategoryName,
            position: categories.length
        }

        setCategories([...categories, newCategory])
        setNewCategoryName("")
    }

    const deleteChannel = (channelId: string) => {
        setChannels(channels.filter(c => c.id !== channelId))
    }

    const deleteCategory = (categoryId: string) => {
        // Move channels in this category to uncategorized
        setChannels(channels.map(c =>
            c.category === categoryId ? { ...c, category: undefined } : c
        ))
        setCategories(categories.filter(c => c.id !== categoryId))
    }

    const toggleChannelPrivacy = (channelId: string) => {
        setChannels(channels.map(c =>
            c.id === channelId ? { ...c, private: !c.private } : c
        ))
    }

    return (
        <div className="p-6 space-y-6">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary)/0.02)_0%,transparent_50%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(var(--primary)/0.02)_0%,transparent_50%)] pointer-events-none" />

            <div className="relative z-10 max-w-4xl mx-auto space-y-6">
                {/* Create Category */}
                <Card className="border-primary/30 shadow-lg backdrop-blur-sm relative">
                    {/* Card glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-xl pointer-events-none" />

                    <CardHeader className="relative z-10 pb-3">
                        <CardTitle className="font-freecam text-primary tracking-wide">CREATE CATEGORY</CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="flex gap-2">
                            <Input
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="Category name"
                                onKeyDown={(e) => e.key === "Enter" && addCategory()}
                                className="font-ocr bg-background/80 border-primary/30 focus:border-primary focus:ring-primary/20"
                            />
                            <Button onClick={addCategory} disabled={!newCategoryName.trim()} className="font-ocr">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Category
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Channel List */}
                <Card className="border-primary/30 shadow-lg backdrop-blur-sm relative">
                    {/* Card glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-xl pointer-events-none" />

                    <CardHeader className="relative z-10 pb-3">
                        <CardTitle className="font-freecam text-primary tracking-wide">CHANNEL OVERVIEW</CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10 space-y-6">
                        {/* Uncategorized Channels */}
                        {getChannelsWithoutCategory().length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-freecam text-primary/60 uppercase text-xs tracking-widest">
                                        UNCATEGORIZED
                                    </h3>
                                    <div className="flex gap-2">
                                        <Input
                                            value={newChannelName}
                                            onChange={(e) => setNewChannelName(e.target.value)}
                                            placeholder="Channel name"
                                            className="w-40 font-ocr bg-background/80 border-primary/30 focus:border-primary focus:ring-primary/20"
                                            onKeyDown={(e) => e.key === "Enter" && addChannel("text")}
                                        />
                                        <Button size="sm" onClick={() => addChannel("text")} className="border-primary/30 hover:border-primary" variant="outline">
                                            <Hash className="w-4 h-4" />
                                        </Button>
                                        <Button size="sm" onClick={() => addChannel("voice")} className="border-primary/30 hover:border-primary" variant="outline">
                                            <Volume2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    {getChannelsWithoutCategory().map((channel) => (
                                        <ChannelItem
                                            key={channel.id}
                                            channel={channel}
                                            onDelete={deleteChannel}
                                            onTogglePrivacy={toggleChannelPrivacy}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Categories with Channels */}
                        {categories.map((category) => (
                            <div key={category.id} className="space-y-2">
                                <div className="flex items-center justify-between group">
                                    <div className="flex items-center gap-2">
                                        <GripVertical className="w-4 h-4 text-primary/40 cursor-grab hover:text-primary/60" />
                                        <h3 className="font-freecam text-primary/60 uppercase text-xs tracking-widest">
                                            {category.name}
                                        </h3>
                                    </div>
                                    <div className="flex gap-2">
                                        <Input
                                            value={newChannelName}
                                            onChange={(e) => setNewChannelName(e.target.value)}
                                            placeholder="Channel name"
                                            className="w-40 font-ocr bg-background/80 border-primary/30 focus:border-primary focus:ring-primary/20"
                                            onKeyDown={(e) => e.key === "Enter" && addChannel("text", category.id)}
                                        />
                                        <Button size="sm" onClick={() => addChannel("text", category.id)} className="border-primary/30 hover:border-primary" variant="outline">
                                            <Hash className="w-4 h-4" />
                                        </Button>
                                        <Button size="sm" onClick={() => addChannel("voice", category.id)} className="border-primary/30 hover:border-primary" variant="outline">
                                            <Volume2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => deleteCategory(category.id)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-1 ml-6">
                                    {getChannelsInCategory(category.id).map((channel) => (
                                        <ChannelItem
                                            key={channel.id}
                                            channel={channel}
                                            onDelete={deleteChannel}
                                            onTogglePrivacy={toggleChannelPrivacy}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function ChannelItem({
    channel,
    onDelete,
    onTogglePrivacy
}: {
    channel: Channel
    onDelete: (id: string) => void
    onTogglePrivacy: (id: string) => void
}) {
    return (
        <div className="flex items-center justify-between group hover:bg-primary/5 p-3 rounded-md transition-colors border border-transparent hover:border-primary/20">
            <div className="flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-primary/40 cursor-grab opacity-0 group-hover:opacity-100 hover:text-primary/60" />
                {channel.type === "text" ? (
                    <Hash className="w-4 h-4 text-primary/60" />
                ) : (
                    <Volume2 className="w-4 h-4 text-primary/60" />
                )}
                <span className="font-ocr font-medium text-foreground">{channel.name}</span>
                {channel.private && (
                    <div className="flex items-center gap-1">
                        <Lock className="w-3 h-3 text-primary/60" />
                        <Badge variant="secondary" className="text-xs font-ocr bg-primary/10 text-primary border-primary/30">Private</Badge>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onTogglePrivacy(channel.id)}
                    title={channel.private ? "Make Public" : "Make Private"}
                    className="hover:bg-primary/10 text-primary/60 hover:text-primary"
                >
                    {channel.private ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </Button>
                <Button size="sm" variant="ghost" className="hover:bg-primary/10 text-primary/60 hover:text-primary">
                    <Settings className="w-4 h-4" />
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(channel.id)}
                    className="text-red-500 hover:text-red-500 hover:bg-red-500/10"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </div>
    )
}
