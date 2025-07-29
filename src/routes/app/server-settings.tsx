import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Settings, Users, Shield, Hash, Trash2, Settings2 } from "lucide-react"
import { useNavigate, useParams } from "react-router"
import alien from "@/assets/subspace/alien-black.svg"

// Tab Components
import ServerProfile from "./components/server-settings/server-profile"
import ServerChannels from "./components/server-settings/server-channels"
import ServerRoles from "./components/server-settings/server-roles"
import ServerMembers from "./components/server-settings/server-members"

import { useSubspace } from "@/hooks/use-subspace"
import { useGlobalState } from "@/hooks/use-global-state"

const settingsNavigation = [
    {
        id: "profile",
        label: "Server Profile",
        icon: Settings,
        component: ServerProfile,
        section: "SERVER SETTINGS"
    },
    {
        id: "channels",
        label: "Channels",
        icon: Hash,
        component: ServerChannels,
        section: "SERVER SETTINGS"
    },
    {
        id: "roles",
        label: "Roles",
        icon: Shield,
        component: ServerRoles,
        section: "PEOPLE"
    },
    {
        id: "members",
        label: "Members",
        icon: Users,
        component: ServerMembers,
        section: "PEOPLE"
    },
    {
        id: "delete",
        label: "Delete Server",
        icon: Trash2,
        component: () => (
            <div className="p-6 space-y-6">
                {/* Background decoration */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary)/0.02)_0%,transparent_50%)] pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(var(--primary)/0.02)_0%,transparent_50%)] pointer-events-none" />

                <div className="relative z-10 max-w-2xl mx-auto">
                    <div className="text-center space-y-6">
                        <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/30">
                            <Trash2 className="w-8 h-8 text-red-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold font-freecam text-red-500 tracking-wide">DELETE SERVER</h1>
                            <p className="text-red-500/80 font-ocr mt-2">
                                This functionality will be available soon...
                            </p>
                        </div>
                        <div className="p-4 bg-red-500/5 rounded-lg border border-red-500/20">
                            <p className="text-xs text-red-500/80 font-ocr leading-relaxed">
                                <strong className="text-red-500">Note:</strong> Server deletion functionality is not yet available. This feature will be implemented in a future update.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        ),
        section: "MODERATION",
        destructive: true
    }
]

export default function ServerSettings() {
    const [activeTab, setActiveTab] = useState("profile")
    const navigate = useNavigate()
    const { serverId } = useParams()

    const { actions: stateActions } = useGlobalState()
    const { actions: subspaceActions, subspace } = useSubspace()

    // Synchronize URL params with global state and ensure server data is loaded
    useEffect(() => {
        if (!subspace) return

        // Set activeServerId from URL params
        stateActions.setActiveServerId(serverId || "")

        // Load server data when serverId changes
        if (serverId) {
            subspaceActions.servers.get(serverId, true).catch(console.error)
        }
    }, [serverId, subspace, stateActions, subspaceActions.servers])

    const handleBack = () => {
        navigate(`/app/${serverId}`)
    }

    const ActiveComponent = settingsNavigation.find(nav => nav.id === activeTab)?.component || ServerProfile

    // Group navigation items by section
    const groupedNavigation = settingsNavigation.reduce((acc, item) => {
        if (!acc[item.section]) acc[item.section] = []
        acc[item.section].push(item)
        return acc
    }, {} as Record<string, typeof settingsNavigation>)

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-background">
            {/* Sidebar Navigation */}
            <div className="w-80 min-w-80 bg-card border-r border-primary/30 shadow-lg backdrop-blur-sm flex flex-col relative">
                {/* Ambient glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-8 bg-primary/5 rounded-full blur-xl" />

                {/* Header */}
                <div className="flex-shrink-0 relative border-b border-primary/20 bg-gradient-to-r from-background via-background/95 to-background">
                    <div className="relative z-10 p-4 px-6">
                        <Button
                            variant="ghost"
                            onClick={handleBack}
                            className="w-full justify-start gap-3 font-ocr text-sm text-primary/60 hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/30 transition-all mb-4"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Server
                        </Button>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-primary/20 rounded-sm border border-primary/30">
                                <img src={alien} alt="alien" className="w-5 h-5 opacity-80" />
                            </div>
                            <div>
                                <h1 className="text-lg font-freecam text-primary tracking-wide">
                                    SERVER SETTINGS
                                </h1>
                                <p className="text-xs font-ocr text-primary/60">
                                    Configure your server
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation Menu */}
                <div className="flex-1 overflow-y-auto py-4 space-y-6 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/40">
                    {/* Background decoration for sidebar */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(var(--primary)/0.02)_0%,transparent_60%)] pointer-events-none" />

                    <div className="relative z-10">
                        {Object.entries(groupedNavigation).map(([section, items]) => (
                            <div key={section} className="space-y-2 mb-6">
                                <h3 className="text-xs font-freecam font-medium text-primary/60 uppercase tracking-widest px-2">
                                    {section}
                                </h3>
                                <div className="space-y-1">
                                    {items.map((item) => {
                                        const Icon = item.icon
                                        const isActive = activeTab === item.id

                                        return (
                                            <Button
                                                key={item.id}
                                                variant="ghost"
                                                onClick={() => setActiveTab(item.id)}
                                                className={cn(
                                                    "w-full justify-start !rounded-none gap-3 h-10 font-ocr text-sm transition-all duration-200 relative group",
                                                    isActive
                                                        ? "bg-primary/20 text-primary border-l-2 border-l-primary rounded-l-none hover:bg-primary/25"
                                                        : "hover:bg-primary/10 text-foreground border border-transparent hover:border-primary/30",
                                                    item.destructive && "text-red-500 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30"
                                                )}
                                            >
                                                <Icon className="w-4 h-4 relative z-10" />
                                                <span className="relative z-10">{item.label}</span>
                                            </Button>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer with version */}
                <div className="p-4 border-t border-primary/20">
                    <div className="text-xs text-primary/40 text-center font-ocr">
                        {/* @ts-ignore */}
                        v{__VERSION__}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden bg-gradient-to-br from-background via-background/98 to-background/95">
                <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/40">
                    <ActiveComponent />
                </div>
            </div>
        </div>
    )
}