import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    Hash,
    Plus,
    Edit,
    Trash2,
    GripVertical,
    Lock,
    Loader2,
    X
} from "lucide-react"
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay
} from '@dnd-kit/core'
import type {
    DragEndEvent,
    DragStartEvent,
    DragOverEvent
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

import { useSubspace } from "@/hooks/use-subspace"
import { useGlobalState } from "@/hooks/use-global-state"
import { useWallet } from "@/hooks/use-wallet"
import { toast } from "sonner"
import { PermissionHelpers, Permissions } from "@/lib/permissions"
import type { Channel, Category } from "@subspace-protocol/sdk"

// Extended interfaces for UI purposes
interface ExtendedChannel extends Channel {
    private?: boolean
}

interface ExtendedCategory extends Category {
    channelCount?: number
}

export default function ServerChannels() {
    const { activeServerId } = useGlobalState()
    const { servers, actions: subspaceActions } = useSubspace()
    const { address: walletAddress } = useWallet()

    // Get the current server
    const server = servers[activeServerId]

    // Component state
    const [newChannelName, setNewChannelName] = useState("")
    const [newCategoryName, setNewCategoryName] = useState("")
    const [isCreatingChannel, setIsCreatingChannel] = useState(false)
    const [isCreatingCategory, setIsCreatingCategory] = useState(false)
    const [isUpdatingChannel, setIsUpdatingChannel] = useState(false)
    const [isDeletingChannel, setIsDeletingChannel] = useState<string | null>(null)
    const [isDeletingCategory, setIsDeletingCategory] = useState<string | null>(null)
    const [channelToDelete, setChannelToDelete] = useState<ExtendedChannel | null>(null)
    const [categoryToDelete, setCategoryToDelete] = useState<ExtendedCategory | null>(null)
    const [isChannelDialogOpen, setIsChannelDialogOpen] = useState(false)
    const [channelCreationCategory, setChannelCreationCategory] = useState<string | undefined>(undefined)
    const [isChannelEditDialogOpen, setIsChannelEditDialogOpen] = useState(false)
    const [channelToEdit, setChannelToEdit] = useState<ExtendedChannel | null>(null)
    const [editChannelName, setEditChannelName] = useState("")
    const [editAllowMessaging, setEditAllowMessaging] = useState(true)
    const [editAllowAttachments, setEditAllowAttachments] = useState(true)
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
    const [activeId, setActiveId] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isMovingChannel, setIsMovingChannel] = useState<string | null>(null)
    const [dragOverId, setDragOverId] = useState<string | null>(null)
    const [insertionPreview, setInsertionPreview] = useState<{
        targetId: string;
        position: 'before' | 'after';
        categoryId?: string;
    } | null>(null)

    // Drag and drop sensors with vertical restriction
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 8px minimum distance before drag starts
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    // Modifier to restrict movement to vertical axis only
    const restrictToVerticalAxis = ({ transform }: { transform: { x: number; y: number; scaleX: number; scaleY: number } }) => {
        return {
            ...transform,
            x: 0, // Always keep horizontal position at 0 to prevent horizontal movement
        }
    }

    // Process server data into extended formats
    const { categories, channels, uncategorizedChannels } = useMemo(() => {
        if (!server) {
            return { categories: [] as ExtendedCategory[], channels: [] as ExtendedChannel[], uncategorizedChannels: [] as ExtendedChannel[] }
        }

        // Convert and sort categories by order
        const serverCategories = Array.isArray((server as any).categories)
            ? (server as any).categories as Category[]
            : Object.values((server as any).categories || {}) as Category[]

        const serverChannels = Array.isArray((server as any).channels)
            ? (server as any).channels as Channel[]
            : Object.values((server as any).channels || {}) as Channel[]

        const sortedCategories: ExtendedCategory[] = [...serverCategories]
            .sort((a, b) => (a.orderId || 0) - (b.orderId || 0))
            .map(cat => ({
                ...cat,
                channelCount: serverChannels.filter(ch => ch.categoryId?.toString() === cat.categoryId.toString()).length
            }))

        // Convert channels
        const processedChannels: ExtendedChannel[] = serverChannels.map(channel => ({
            ...channel,
            private: false // TODO: Add private channel support when available in SDK
        }))

        // Get uncategorized channels
        const uncategorized = processedChannels
            .filter(channel => !channel.categoryId || !serverCategories.find(cat => cat.categoryId.toString() === channel.categoryId?.toString()))
            .sort((a, b) => (a.orderId || 0) - (b.orderId || 0))

        return {
            categories: sortedCategories,
            channels: processedChannels,
            uncategorizedChannels: uncategorized
        }
    }, [server])

    // Check if user has permission to manage channels
    const canManageChannels = useMemo(() => {
        if (!server || !walletAddress) return false

        // Server owner can always manage channels
        if (server.ownerId === walletAddress) return true

        // Check if user has MANAGE_CHANNELS permission
        const serverMembers = (server as any)?.members || []
        const currentMember = serverMembers.find((m: any) => m.userId === walletAddress)

        if (!currentMember || !currentMember.roles) return false

        // Check permissions from user's roles
        for (const roleId of currentMember.roles) {
            const role = server.roles[roleId.toString()]
            if (role) {
                if (PermissionHelpers.hasPermission(role.permissions, Permissions.ADMINISTRATOR) ||
                    PermissionHelpers.hasPermission(role.permissions, Permissions.MANAGE_CHANNELS)) {
                    return true
                }
            }
        }

        return false
    }, [server, walletAddress])

    const getChannelsInCategory = (categoryId: string): ExtendedChannel[] => {
        return channels
            .filter(channel => channel.categoryId?.toString() === categoryId)
            .sort((a, b) => (a.orderId || 0) - (b.orderId || 0))
    }

    const createCategory = async () => {
        if (!newCategoryName.trim() || !activeServerId || !canManageChannels) {
            toast.error("Invalid category name or insufficient permissions")
            return
        }

        setIsCreatingCategory(true)
        try {
            // Calculate the highest order + 1 for new category
            const maxOrder = Math.max(...categories.map(c => c.orderId || 0), 0)

            const success = await subspaceActions.servers.createCategory(activeServerId, {
                name: newCategoryName.trim(),
                orderId: maxOrder + 1
            })

            if (success) {
                toast.success("Category created successfully!")
                setNewCategoryName("")
                setIsCategoryDialogOpen(false)
            } else {
                toast.error("Failed to create category")
            }
        } catch (error) {
            console.error("Error creating category:", error)
            toast.error("Failed to create category")
        } finally {
            setIsCreatingCategory(false)
        }
    }

    const openChannelDialog = (categoryId?: string) => {
        setChannelCreationCategory(categoryId)
        setIsChannelDialogOpen(true)
    }

    const openChannelEditDialog = (channel: ExtendedChannel) => {
        setChannelToEdit(channel)
        setEditChannelName(channel.name)
        setEditAllowMessaging((channel.allowMessaging ?? 1) === 1)
        setEditAllowAttachments((channel.allowAttachments ?? 1) === 1)
        setIsChannelEditDialogOpen(true)
    }

    const openCategoryDialog = () => {
        setIsCategoryDialogOpen(true)
    }

    const createChannel = async () => {
        if (!newChannelName.trim() || !activeServerId || !canManageChannels) {
            toast.error("Invalid channel name or insufficient permissions")
            return
        }

        setIsCreatingChannel(true)
        try {
            // Calculate the highest order + 1 for new channel in this category
            const channelsInCategory = channelCreationCategory ? getChannelsInCategory(channelCreationCategory) : uncategorizedChannels
            const maxOrder = Math.max(...channelsInCategory.map(c => c.orderId || 0), 0)

            const success = await subspaceActions.servers.createChannel(activeServerId, {
                name: newChannelName.trim(),
                categoryId: channelCreationCategory || undefined,
                orderId: maxOrder + 1
                // Note: Voice channels not yet supported by server
            })

            if (success) {
                toast.success("Text channel created successfully!")
                setNewChannelName("")
                setIsChannelDialogOpen(false)
                setChannelCreationCategory(undefined)
            } else {
                toast.error("Failed to create channel")
            }
        } catch (error) {
            console.error("Error creating channel:", error)
            toast.error("Failed to create channel")
        } finally {
            setIsCreatingChannel(false)
        }
    }

    const updateChannel = async () => {
        if (!editChannelName.trim() || !activeServerId || !canManageChannels || !channelToEdit) {
            toast.error("Invalid channel name or insufficient permissions")
            return
        }

        setIsUpdatingChannel(true)
        try {
            const success = await subspaceActions.servers.updateChannel(activeServerId, {
                channelId: channelToEdit.channelId.toString(),
                name: editChannelName.trim(),
                allowMessaging: editAllowMessaging ? 1 : 0,
                allowAttachments: editAllowAttachments ? 1 : 0
            })

            if (success) {
                toast.success("Channel updated successfully!")
                setIsChannelEditDialogOpen(false)
                setChannelToEdit(null)
                setEditChannelName("")
                setEditAllowMessaging(true)
                setEditAllowAttachments(true)
            } else {
                toast.error("Failed to update channel")
            }
        } catch (error) {
            console.error("Error updating channel:", error)
            toast.error("Failed to update channel")
        } finally {
            setIsUpdatingChannel(false)
        }
    }

    const confirmDeleteChannel = (channel: ExtendedChannel) => {
        setChannelToDelete(channel)
    }

    const deleteChannel = async () => {
        if (!channelToDelete || !activeServerId || !canManageChannels) {
            toast.error("Insufficient permissions to delete channel")
            return
        }

        const channelId = channelToDelete.channelId.toString()
        setIsDeletingChannel(channelId)
        try {
            const success = await subspaceActions.servers.deleteChannel(activeServerId, channelId)

            if (success) {
                toast.success(`#${channelToDelete.name} deleted successfully!`)
                setChannelToDelete(null)
            } else {
                toast.error("Failed to delete channel")
            }
        } catch (error) {
            console.error("Error deleting channel:", error)
            toast.error("Failed to delete channel")
        } finally {
            setIsDeletingChannel(null)
        }
    }

    const confirmDeleteCategory = (category: ExtendedCategory) => {
        setCategoryToDelete(category)
    }

    const deleteCategory = async () => {
        if (!categoryToDelete || !activeServerId || !canManageChannels) {
            toast.error("Insufficient permissions to delete category")
            return
        }

        const categoryId = categoryToDelete.categoryId.toString()
        const channelsInCategory = getChannelsInCategory(categoryId)
        const channelCount = channelsInCategory.length

        setIsDeletingCategory(categoryId)
        try {
            const success = await subspaceActions.servers.deleteCategory(activeServerId, categoryId)

            if (success) {
                if (channelCount > 0) {
                    toast.success(`"${categoryToDelete.name}" category deleted! ${channelCount} channel(s) moved to uncategorized.`)
                } else {
                    toast.success(`"${categoryToDelete.name}" category deleted successfully!`)
                }
                setCategoryToDelete(null)
            } else {
                toast.error("Failed to delete category")
            }
        } catch (error) {
            console.error("Error deleting category:", error)
            toast.error("Failed to delete category")
        } finally {
            setIsDeletingCategory(null)
        }
    }

    // Drag and drop handlers
    const handleDragStart = (event: DragStartEvent) => {
        const dragId = event.active.id as string
        setActiveId(dragId)
        setIsDragging(true)
        setDragOverId(null)
        setInsertionPreview(null)
    }

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event

        if (!over) {
            setDragOverId(null)
            setInsertionPreview(null)
            return
        }

        const activeIdStr = active.id as string
        const overIdStr = over.id as string

        setDragOverId(overIdStr)

        // Show insertion preview for channel-to-channel drops
        if ((activeIdStr.startsWith('channel-') || activeIdStr.startsWith('uncategorized-channel-')) &&
            (overIdStr.startsWith('channel-') || overIdStr.startsWith('uncategorized-channel-'))) {

            // Extract target channel info
            let targetChannelId: string
            let targetCategoryId: string | undefined

            if (overIdStr.startsWith('uncategorized-channel-')) {
                targetChannelId = overIdStr.replace('uncategorized-channel-', '')
                targetCategoryId = undefined
            } else {
                targetChannelId = overIdStr.replace('channel-', '')
                const targetChannel = channels.find(ch => ch.channelId.toString() === targetChannelId)
                targetCategoryId = targetChannel?.categoryId?.toString()
            }

            setInsertionPreview({
                targetId: targetChannelId,
                position: 'before',
                categoryId: targetCategoryId
            })
        } else {
            setInsertionPreview(null)
        }
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        setActiveId(null)
        setIsDragging(false)
        setDragOverId(null)
        setInsertionPreview(null)

        if (!over || active.id === over.id) {
            return
        }

        const activeIdStr = active.id as string
        const overIdStr = over.id as string

        // Handle category reordering
        if (activeIdStr.startsWith('category-') && overIdStr.startsWith('category-')) {
            const activeIndex = categories.findIndex(cat => `category-${cat.categoryId}` === activeIdStr)
            const overIndex = categories.findIndex(cat => `category-${cat.categoryId}` === overIdStr)

            if (activeIndex !== -1 && overIndex !== -1) {
                const newCategories = arrayMove(categories, activeIndex, overIndex)

                // Update orders on server
                for (let i = 0; i < newCategories.length; i++) {
                    const category = newCategories[i]
                    const newOrderId = i + 1

                    if (category.orderId !== newOrderId) {
                        try {
                            await subspaceActions.servers.updateCategory(activeServerId, {
                                categoryId: category.categoryId.toString(),
                                orderId: newOrderId
                            })
                        } catch (error) {
                            console.error("Failed to update category order:", error)
                            toast.error("Failed to update category order")
                        }
                    }
                }
            }
        }
        // Handle moving channels to different categories
        else if ((activeIdStr.startsWith('channel-') || activeIdStr.startsWith('uncategorized-channel-')) && overIdStr.startsWith('category-')) {
            // Extract channel ID and target category ID - handle both formats
            let activeChannelId: string
            if (activeIdStr.startsWith('uncategorized-channel-')) {
                activeChannelId = activeIdStr.replace('uncategorized-channel-', '')
            } else {
                activeChannelId = activeIdStr.replace('channel-', '')
            }
            const targetCategoryId = overIdStr.replace('category-', '')

            // Convert to strings for consistent comparison
            const activeChannel = channels.find(ch => ch.channelId.toString() === activeChannelId)
            const targetCategory = categories.find(cat => cat.categoryId.toString() === targetCategoryId)

            if (activeChannel && targetCategory) {
                const currentCategoryId = activeChannel.categoryId?.toString()

                // Only move if actually changing categories (null/undefined means uncategorized)
                if (currentCategoryId !== targetCategoryId) {
                    try {
                        // Get the target category's channels to determine new order
                        const targetChannels = getChannelsInCategory(targetCategoryId)
                        const newOrderId = targetChannels.length + 1

                        // Show loading state
                        setIsMovingChannel(activeChannelId)
                        toast.loading(`Moving #${activeChannel.name} to "${targetCategory.name}"...`)

                        const success = await subspaceActions.servers.updateChannel(activeServerId, {
                            channelId: activeChannelId,
                            categoryId: targetCategoryId,
                            orderId: newOrderId
                        })

                        if (success) {
                            toast.success(`#${activeChannel.name} moved to "${targetCategory.name}"`)
                        } else {
                            toast.error("Failed to move channel")
                        }
                    } catch (error) {
                        console.error("Failed to move channel:", error)
                        toast.error("Failed to move channel")
                    } finally {
                        setIsMovingChannel(null)
                        toast.dismiss() // Dismiss any loading toasts
                    }
                }
            }
        }
        // Handle moving channels to uncategorized (dropping on uncategorized header)
        else if ((activeIdStr.startsWith('channel-') || activeIdStr.startsWith('uncategorized-channel-')) && overIdStr === 'uncategorized-header') {
            // Extract channel ID properly
            let activeChannelId: string
            if (activeIdStr.startsWith('uncategorized-channel-')) {
                activeChannelId = activeIdStr.replace('uncategorized-channel-', '')
            } else {
                activeChannelId = activeIdStr.replace('channel-', '')
            }

            const activeChannel = channels.find(ch => ch.channelId.toString() === activeChannelId)

            if (activeChannel) {
                // Only move if channel is currently in a category (not already uncategorized)
                const isCurrentlyInCategory = activeChannel.categoryId && activeChannel.categoryId.toString() !== ''

                console.log('🎯 Category check:', {
                    categoryId: activeChannel.categoryId,
                    categoryIdString: activeChannel.categoryId?.toString(),
                    isCurrentlyInCategory
                })

                if (isCurrentlyInCategory) {
                    try {
                        // Move to uncategorized (categoryId = null)
                        const newOrderId = uncategorizedChannels.length + 1

                        console.log('📤 Sending update:', {
                            channelId: activeChannelId,
                            categoryId: null,
                            orderId: newOrderId
                        })

                        // Show loading state
                        setIsMovingChannel(activeChannelId)
                        toast.loading(`Moving #${activeChannel.name} to uncategorized...`)

                        const success = await subspaceActions.servers.updateChannel(activeServerId, {
                            channelId: activeChannelId,
                            categoryId: null,
                            orderId: newOrderId
                        })

                        console.log('📥 Server response:', { success })

                        if (success) {
                            toast.success(`#${activeChannel.name} moved to uncategorized`)
                            // Force refresh to see changes
                            setTimeout(() => {
                                subspaceActions.servers.get(activeServerId, true)
                            }, 1000)
                        } else {
                            toast.error("Failed to move channel")
                        }
                    } catch (error) {
                        console.error("Failed to move channel:", error)
                        toast.error("Failed to move channel")
                    } finally {
                        setIsMovingChannel(null)
                        toast.dismiss() // Dismiss any loading toasts
                    }
                } else {
                    console.log('❌ Channel is already uncategorized or invalid category')
                }
            } else {
                console.log('❌ Channel not found for ID:', activeChannelId)
            }
        }
        // Handle channel reordering within uncategorized (or moving from categorized to uncategorized position)
        else if (activeIdStr.startsWith('uncategorized-channel-') && overIdStr.startsWith('uncategorized-channel-')) {
            const activeChannelId = activeIdStr.replace('uncategorized-channel-', '')
            const overChannelId = overIdStr.replace('uncategorized-channel-', '')

            const activeIndex = uncategorizedChannels.findIndex(ch => ch.channelId.toString() === activeChannelId)
            const overIndex = uncategorizedChannels.findIndex(ch => ch.channelId.toString() === overChannelId)

            if (activeIndex !== -1 && overIndex !== -1) {
                const newChannels = arrayMove(uncategorizedChannels, activeIndex, overIndex)

                // Update orders on server
                for (let i = 0; i < newChannels.length; i++) {
                    const channel = newChannels[i]
                    const newOrderId = i + 1

                    if (channel.orderId !== newOrderId) {
                        try {
                            await subspaceActions.servers.updateChannel(activeServerId, {
                                channelId: channel.channelId.toString(),
                                orderId: newOrderId
                            })
                        } catch (error) {
                            console.error("Failed to update channel order:", error)
                            toast.error("Failed to update channel order")
                        }
                    }
                }
            }
        }
        // Handle moving categorized channels to specific positions in uncategorized
        else if (activeIdStr.startsWith('channel-') && overIdStr.startsWith('uncategorized-channel-')) {
            const activeChannelId = activeIdStr.replace('channel-', '')
            const overChannelId = overIdStr.replace('uncategorized-channel-', '')

            const activeChannel = channels.find(ch => ch.channelId.toString() === activeChannelId)
            const overChannel = uncategorizedChannels.find(ch => ch.channelId.toString() === overChannelId)

            if (activeChannel && overChannel && activeChannel.categoryId) {
                try {
                    const targetIndex = uncategorizedChannels.findIndex(ch => ch.channelId.toString() === overChannelId)
                    const newOrderId = targetIndex + 1 // Insert before the target channel

                    // Show loading state
                    setIsMovingChannel(activeChannelId)
                    toast.loading(`Moving #${activeChannel.name} to uncategorized...`)

                    const success = await subspaceActions.servers.updateChannel(activeServerId, {
                        channelId: activeChannelId,
                        categoryId: null,
                        orderId: newOrderId
                    })

                    if (success) {
                        // Reorder existing uncategorized channels to make room
                        const channelsToReorder = uncategorizedChannels.filter(ch =>
                            ch.channelId.toString() !== activeChannelId &&
                            (ch.orderId || 0) >= newOrderId
                        )

                        for (const channel of channelsToReorder) {
                            try {
                                await subspaceActions.servers.updateChannel(activeServerId, {
                                    channelId: channel.channelId.toString(),
                                    orderId: (channel.orderId || 0) + 1
                                })
                            } catch (error) {
                                console.error("Failed to update channel order during reordering:", error)
                            }
                        }

                        toast.success(`#${activeChannel.name} moved to uncategorized`)
                    } else {
                        toast.error("Failed to move channel")
                    }
                } catch (error) {
                    console.error("Failed to move channel to uncategorized:", error)
                    toast.error("Failed to move channel")
                } finally {
                    setIsMovingChannel(null)
                    toast.dismiss()
                }
            }
        }
        // Handle channel reordering within same category OR moving channels between different categories
        else if ((activeIdStr.startsWith('channel-') || activeIdStr.startsWith('uncategorized-channel-')) && overIdStr.startsWith('channel-')) {
            let activeChannelId: string
            if (activeIdStr.startsWith('uncategorized-channel-')) {
                activeChannelId = activeIdStr.replace('uncategorized-channel-', '')
            } else {
                activeChannelId = activeIdStr.replace('channel-', '')
            }
            const overChannelId = overIdStr.replace('channel-', '')

            // Find which channels these are
            const activeChannel = channels.find(ch => ch.channelId.toString() === activeChannelId)
            const overChannel = channels.find(ch => ch.channelId.toString() === overChannelId)

            if (activeChannel && overChannel) {
                const activeCategoryId = activeChannel.categoryId?.toString()
                const overCategoryId = overChannel.categoryId?.toString()

                // Case 1: Same category - reorder within category
                if (activeCategoryId === overCategoryId) {
                    const channelsInCategory = overCategoryId ? getChannelsInCategory(overCategoryId) : uncategorizedChannels

                    const activeIndex = channelsInCategory.findIndex(ch => ch.channelId.toString() === activeChannelId)
                    const overIndex = channelsInCategory.findIndex(ch => ch.channelId.toString() === overChannelId)

                    if (activeIndex !== -1 && overIndex !== -1) {
                        const newChannels = arrayMove(channelsInCategory, activeIndex, overIndex)

                        // Update orders on server
                        for (let i = 0; i < newChannels.length; i++) {
                            const channel = newChannels[i]
                            const newOrderId = i + 1

                            if (channel.orderId !== newOrderId) {
                                try {
                                    await subspaceActions.servers.updateChannel(activeServerId, {
                                        channelId: channel.channelId.toString(),
                                        orderId: newOrderId
                                    })
                                } catch (error) {
                                    console.error("Failed to update channel order:", error)
                                    toast.error("Failed to update channel order")
                                }
                            }
                        }
                    }
                }
                // Case 2: Different categories - move channel to target category at specific position
                else {
                    try {
                        const targetChannels = overCategoryId ? getChannelsInCategory(overCategoryId) : uncategorizedChannels
                        const targetIndex = targetChannels.findIndex(ch => ch.channelId.toString() === overChannelId)

                        // Insert position is before the target channel
                        const newOrderId = targetIndex + 1 // +1 for 1-based indexing to insert at target position

                        // Show loading state
                        setIsMovingChannel(activeChannelId)
                        const targetCategoryName = overCategoryId ?
                            categories.find(cat => cat.categoryId.toString() === overCategoryId)?.name :
                            'uncategorized'
                        toast.loading(`Moving #${activeChannel.name} to "${targetCategoryName}"...`)

                        const success = await subspaceActions.servers.updateChannel(activeServerId, {
                            channelId: activeChannelId,
                            categoryId: overCategoryId || null,
                            orderId: newOrderId
                        })

                        if (success) {
                            // Reorder existing channels in target category to make room
                            const channelsToReorder = targetChannels.filter(ch =>
                                ch.channelId.toString() !== activeChannelId &&
                                (ch.orderId || 0) >= newOrderId
                            )

                            for (const channel of channelsToReorder) {
                                try {
                                    await subspaceActions.servers.updateChannel(activeServerId, {
                                        channelId: channel.channelId.toString(),
                                        orderId: (channel.orderId || 0) + 1
                                    })
                                } catch (error) {
                                    console.error("Failed to update channel order during reordering:", error)
                                }
                            }

                            toast.success(`#${activeChannel.name} moved to "${targetCategoryName}"`)
                        } else {
                            toast.error("Failed to move channel")
                        }
                    } catch (error) {
                        console.error("Failed to move channel between categories:", error)
                        toast.error("Failed to move channel")
                    } finally {
                        setIsMovingChannel(null)
                        toast.dismiss()
                    }
                }
            }
        }
    }

    if (!server) {
        return (
            <div className="flex items-center justify-center min-h-[600px] relative">
                {/* Background decoration */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary)/0.01)_0%,transparent_50%)] pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(var(--primary)/0.01)_0%,transparent_50%)] pointer-events-none" />

                <div className="text-center space-y-4 relative z-10">
                    <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    </div>
                    <div>
                        <h3 className="font-freecam text-sm uppercase tracking-wide text-primary">Loading Server</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            Fetching channel data...
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    if (!canManageChannels) {
        return (
            <div className="flex items-center justify-center min-h-[600px] relative">
                {/* Background decoration */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(red/0.01)_0%,transparent_50%)] pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(red/0.01)_0%,transparent_50%)] pointer-events-none" />

                <div className="text-center space-y-4 relative z-10">
                    <div className="w-12 h-12 mx-auto bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                        <X className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                        <h3 className="font-freecam text-sm uppercase tracking-wide text-red-500">Access Denied</h3>
                        <p className="text-xs text-red-500/80 mt-1">
                            You don't have permission to manage channels
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6 relative h-full">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary)/0.01)_0%,transparent_50%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(var(--primary)/0.01)_0%,transparent_50%)] pointer-events-none" />

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis]}
            >
                <DragOverlay>
                    {activeId ? (
                        <div className="bg-card border rounded-lg p-3 shadow-2xl drop-shadow-2xl border-primary/30 backdrop-blur-sm opacity-90">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm">
                                    <GripVertical className="w-3 h-3 text-primary/60" />
                                    {activeId.startsWith('category-') ? (
                                        (() => {
                                            const categoryId = activeId.replace('category-', '')
                                            const category = categories.find(cat => cat.categoryId.toString() === categoryId)
                                            const channelCount = category ? getChannelsInCategory(categoryId).length : 0
                                            return (
                                                <div className="flex items-center gap-2">
                                                    <Hash className="w-3 h-3 text-primary/60" />
                                                    <span className="font-freecam text-xs uppercase tracking-wide text-primary">
                                                        {category ? category.name : 'Unknown Category'}
                                                    </span>
                                                    {category && (
                                                        <Badge variant="secondary" className="text-xs bg-primary/20 text-primary/80 border-primary/30">
                                                            {channelCount} channels
                                                        </Badge>
                                                    )}
                                                </div>
                                            )
                                        })()
                                    ) : (
                                        (() => {
                                            const channelId = activeId.replace('channel-', '').replace('uncategorized-channel-', '')
                                            const channel = channels.find(ch => ch.channelId.toString() === channelId)
                                            const isUncategorized = activeId.startsWith('uncategorized-channel-')
                                            const currentCategory = channel && !isUncategorized ?
                                                categories.find(cat => cat.categoryId.toString() === channel.categoryId?.toString()) : null

                                            return (
                                                <div className="flex items-center gap-2">
                                                    <Hash className="w-3 h-3 text-primary/60" />
                                                    <span className="font-ocr text-foreground">
                                                        {channel ? `#${channel.name}` : 'Unknown Channel'}
                                                    </span>
                                                    {channel?.private && (
                                                        <Badge variant="secondary" className="text-xs font-ocr bg-primary/20 text-primary border-primary/30">
                                                            Private
                                                        </Badge>
                                                    )}
                                                </div>
                                            )
                                        })()
                                    )}
                                </div>
                                <div className="text-xs text-primary/60 font-ocr ml-5">
                                    {activeId.startsWith('category-') ? 'Moving category' : 'Moving channel'}
                                </div>
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>

                {/* Main Channel List */}
                <Card className="border-primary/10 shadow-md backdrop-blur-sm bg-card/30 relative z-10">
                    {/* Card glow effect */}
                    <div className="absolute inset-0 from-primary/2 via-transparent to-primary/2 rounded-lg pointer-events-none" />

                    <CardHeader className="pb-4 relative z-10">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="font-freecam text-sm uppercase tracking-wide text-primary/70 flex items-center gap-2">
                                    <Hash className="w-4 h-4 text-primary/40" />
                                    Channel Management
                                </CardTitle>
                                <p className="text-xs text-primary/50 mt-1">
                                    {channels.length} channels • {categories.length} categories
                                </p>
                            </div>
                            <Button
                                size="sm"
                                onClick={openCategoryDialog}
                                variant="outline"
                                className="text-xs border-primary/20 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                            >
                                <Plus className="w-3 h-3 mr-1" />
                                New Category
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <ScrollArea className="">
                            <div className="space-y-4">
                                {/* Uncategorized Channels */}
                                <div className="space-y-3">
                                    <UncategorizedDropZone dragOverId={dragOverId}>
                                        <div className="flex items-center justify-between group p-3 rounded-lg transition-all duration-200 border bg-primary/3 border-primary/15 hover:border-primary/20 hover:bg-primary/5">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2">
                                                    <Hash className="w-4 h-4 text-primary/40" />
                                                    <h3 className="font-freecam text-xs uppercase tracking-wide text-primary/70">
                                                        Uncategorized
                                                    </h3>
                                                    <Badge variant="secondary" className="text-xs bg-primary/10 text-primary/60 border-primary/20">
                                                        {uncategorizedChannels.length}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    size="sm"
                                                    onClick={() => openChannelDialog()}
                                                    variant="ghost"
                                                    className="h-6 w-6 p-0 hover:bg-primary/5 text-primary/40 hover:text-primary/60 transition-all duration-200"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    </UncategorizedDropZone>

                                    <div className="relative">
                                        {/* Connector line - only show if there are channels */}
                                        {uncategorizedChannels.length > 0 && (
                                            <div className="absolute left-6 top-0 bottom-0 w-px bg-primary/15" />
                                        )}
                                        <div className="pl-2">
                                            {uncategorizedChannels.length > 0 && (
                                                <SortableContext
                                                    items={uncategorizedChannels.map(ch => `uncategorized-channel-${ch.channelId}`)}
                                                    strategy={verticalListSortingStrategy}
                                                >
                                                    <div className="space-y-1 ml-4">
                                                        {uncategorizedChannels.map((channel) => (
                                                            <SortableChannel
                                                                key={channel.channelId}
                                                                channel={channel}
                                                                onEdit={openChannelEditDialog}
                                                                onDelete={confirmDeleteChannel}
                                                                isDeleting={isDeletingChannel === channel.channelId.toString()}
                                                                isMoving={isMovingChannel === channel.channelId.toString()}
                                                                idPrefix="uncategorized-channel"
                                                                insertionPreview={insertionPreview}
                                                                dragOverId={dragOverId}
                                                            />
                                                        ))}
                                                    </div>
                                                </SortableContext>
                                            )}
                                            {uncategorizedChannels.length === 0 && (
                                                <div className="text-center py-4 text-xs text-primary/30 font-ocr ml-4 border border-dashed border-primary/15 rounded-lg bg-primary/3">
                                                    <Hash className="w-4 h-4 mx-auto mb-2 text-primary/25" />
                                                    No uncategorized channels
                                                    <p className="text-xs text-primary/25 mt-1">
                                                        Click + to create your first channel
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Separator */}
                                {categories.length > 0 && (
                                    <Separator className="bg-primary/15" />
                                )}

                                {/* Categories with Channels */}
                                <SortableContext
                                    items={categories.map(cat => `category-${cat.categoryId}`)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {categories.map((category) => {
                                        const channelsInCategory = getChannelsInCategory(category.categoryId.toString())
                                        const isDeletingThis = isDeletingCategory === category.categoryId.toString()

                                        return (
                                            <SortableCategory
                                                key={category.categoryId}
                                                category={category}
                                                onDeleteCategory={confirmDeleteCategory}
                                                onCreateChannel={openChannelDialog}
                                                isDeletingCategory={isDeletingThis}
                                                channelCount={channelsInCategory.length}
                                                dragOverId={dragOverId}
                                            >
                                                {channelsInCategory.length > 0 ? (
                                                    <SortableContext
                                                        items={channelsInCategory.map(ch => `channel-${ch.channelId}`)}
                                                        strategy={verticalListSortingStrategy}
                                                    >
                                                        <div className="space-y-1 ml-4">
                                                            {channelsInCategory.map((channel) => (
                                                                <SortableChannel
                                                                    key={channel.channelId}
                                                                    channel={channel}
                                                                    onEdit={openChannelEditDialog}
                                                                    onDelete={confirmDeleteChannel}
                                                                    isDeleting={isDeletingChannel === channel.channelId.toString()}
                                                                    isMoving={isMovingChannel === channel.channelId.toString()}
                                                                    insertionPreview={insertionPreview}
                                                                    dragOverId={dragOverId}
                                                                />
                                                            ))}
                                                        </div>
                                                    </SortableContext>
                                                ) : (
                                                    <div className="text-center py-3 text-xs text-primary/30 font-ocr ml-4 border border-dashed border-primary/15 rounded-lg bg-primary/3">
                                                        <Hash className="w-4 h-4 mx-auto mb-2 text-primary/25" />
                                                        No channels in this category
                                                        <p className="text-xs text-primary/25 mt-1">
                                                            Click + to add channels
                                                        </p>
                                                    </div>
                                                )}
                                            </SortableCategory>
                                        )
                                    })}
                                </SortableContext>
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Channel Delete Confirmation Dialog */}
                <AlertDialog open={!!channelToDelete} onOpenChange={() => setChannelToDelete(null)}>
                    <AlertDialogContent className="border-red-500/20 bg-card/95 backdrop-blur-sm">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="font-freecam text-sm uppercase tracking-wide text-red-500">
                                Delete Channel
                            </AlertDialogTitle>
                            <AlertDialogDescription className="font-ocr text-xs text-muted-foreground leading-relaxed">
                                Are you sure you want to delete <span className="text-foreground font-medium">#{channelToDelete?.name}</span>?
                                <br />
                                <span className="text-red-500 font-medium">This action cannot be undone.</span>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel
                                className="font-ocr text-xs border-primary/20 hover:border-primary/30"
                                disabled={!!isDeletingChannel}
                            >
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={deleteChannel}
                                className="font-ocr text-xs bg-red-500 hover:bg-red-600 border-red-500 text-white"
                                disabled={!!isDeletingChannel}
                            >
                                {isDeletingChannel ? (
                                    <>
                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    "Delete Channel"
                                )}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Edit Channel Dialog */}
                <Dialog open={isChannelEditDialogOpen} onOpenChange={setIsChannelEditDialogOpen}>
                    <DialogContent className="border-primary/20 bg-card/95 backdrop-blur-sm">
                        <DialogHeader>
                            <DialogTitle className="font-freecam text-sm uppercase tracking-wide text-primary">
                                Edit Channel
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="edit-channel-name" className="font-ocr text-xs text-primary/80">
                                    Channel Name
                                </Label>
                                <Input
                                    id="edit-channel-name"
                                    value={editChannelName}
                                    onChange={(e) => setEditChannelName(e.target.value)}
                                    placeholder="Enter channel name"
                                    className="font-ocr text-sm mt-1 border-primary/20 focus:border-primary/30 bg-background/50"
                                    maxLength={50}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && editChannelName.trim()) {
                                            updateChannel()
                                        }
                                    }}
                                    disabled={isUpdatingChannel}
                                />
                                <p className="text-xs text-primary/60 mt-1 font-ocr">
                                    {editChannelName.length}/50 characters
                                </p>
                            </div>

                            <div className="space-y-3 p-3 bg-primary/3 rounded-lg border border-primary/15">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="font-ocr text-xs text-foreground">Allow Messaging</Label>
                                        <p className="text-xs text-muted-foreground font-ocr">
                                            Users can send messages in this channel
                                        </p>
                                    </div>
                                    <Switch
                                        checked={editAllowMessaging}
                                        onCheckedChange={setEditAllowMessaging}
                                        disabled={isUpdatingChannel}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="font-ocr text-xs text-foreground">Allow Attachments</Label>
                                        <p className="text-xs text-muted-foreground font-ocr">
                                            Users can upload files in this channel
                                        </p>
                                    </div>
                                    <Switch
                                        checked={editAllowAttachments}
                                        onCheckedChange={setEditAllowAttachments}
                                        disabled={isUpdatingChannel}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsChannelEditDialogOpen(false)
                                        setChannelToEdit(null)
                                        setEditChannelName("")
                                        setEditAllowMessaging(true)
                                        setEditAllowAttachments(true)
                                    }}
                                    className="font-ocr text-xs border-primary/20 hover:border-primary/30"
                                    disabled={isUpdatingChannel}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={updateChannel}
                                    disabled={!editChannelName.trim() || isUpdatingChannel}
                                    className="font-ocr text-xs bg-primary hover:bg-primary/90 text-black"
                                >
                                    {isUpdatingChannel ? (
                                        <>
                                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        "Update Channel"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Create Category Dialog */}
                <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                    <DialogContent className="border-primary/20 bg-card/95 backdrop-blur-sm">
                        <DialogHeader>
                            <DialogTitle className="font-freecam text-sm uppercase tracking-wide text-primary">
                                Create Category
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="category-name" className="font-ocr text-xs text-primary/80">
                                    Category Name
                                </Label>
                                <Input
                                    id="category-name"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="Enter category name"
                                    className="font-ocr text-sm mt-1 border-primary/20 focus:border-primary/30 bg-background/50"
                                    maxLength={50}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newCategoryName.trim()) {
                                            createCategory()
                                        }
                                    }}
                                    disabled={isCreatingCategory}
                                />
                                <p className="text-xs text-primary/60 mt-1 font-ocr">
                                    {newCategoryName.length}/50 characters
                                </p>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsCategoryDialogOpen(false)
                                        setNewCategoryName("")
                                    }}
                                    className="font-ocr text-xs border-primary/20 hover:border-primary/30"
                                    disabled={isCreatingCategory}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={createCategory}
                                    disabled={!newCategoryName.trim() || isCreatingCategory}
                                    className="font-ocr text-xs bg-primary hover:bg-primary/90 text-black"
                                >
                                    {isCreatingCategory ? (
                                        <>
                                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        "Create Category"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Create Channel Dialog */}
                <Dialog open={isChannelDialogOpen} onOpenChange={setIsChannelDialogOpen}>
                    <DialogContent className="border-primary/20 bg-card/95 backdrop-blur-sm">
                        <DialogHeader>
                            <DialogTitle className="font-freecam text-sm uppercase tracking-wide text-primary">
                                Create Channel
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="channel-name" className="font-ocr text-xs text-primary/80">
                                    Channel Name
                                </Label>
                                <Input
                                    id="channel-name"
                                    value={newChannelName}
                                    onChange={(e) => setNewChannelName(e.target.value)}
                                    placeholder="Enter channel name"
                                    className="font-ocr text-sm mt-1 border-primary/20 focus:border-primary/30 bg-background/50"
                                    maxLength={50}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newChannelName.trim()) {
                                            createChannel()
                                        }
                                    }}
                                    disabled={isCreatingChannel}
                                />
                                <p className="text-xs text-primary/60 mt-1 font-ocr">
                                    {newChannelName.length}/50 characters
                                    {channelCreationCategory && " • Will be created in selected category"}
                                </p>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsChannelDialogOpen(false)
                                        setNewChannelName("")
                                        setChannelCreationCategory(undefined)
                                    }}
                                    className="font-ocr text-xs border-primary/20 hover:border-primary/30"
                                    disabled={isCreatingChannel}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={createChannel}
                                    disabled={!newChannelName.trim() || isCreatingChannel}
                                    className="font-ocr text-xs bg-primary hover:bg-primary/90 text-black"
                                >
                                    {isCreatingChannel ? (
                                        <>
                                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        "Create Channel"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Category Delete Confirmation Dialog */}
                <AlertDialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
                    <AlertDialogContent className="border-red-500/20 bg-card/95 backdrop-blur-sm">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="font-freecam text-sm uppercase tracking-wide text-red-500">
                                Delete Category
                            </AlertDialogTitle>
                            <AlertDialogDescription className="font-ocr text-xs text-muted-foreground leading-relaxed">
                                Are you sure you want to delete the <span className="text-foreground font-medium">"{categoryToDelete?.name}"</span> category?
                                <br />
                                {categoryToDelete && (() => {
                                    const channelsInCategory = getChannelsInCategory(categoryToDelete.categoryId.toString())
                                    return channelsInCategory.length > 0 ? (
                                        <>
                                            <span className="text-blue-500 font-medium">
                                                {channelsInCategory.length} channel(s) will be moved to uncategorized.
                                            </span>
                                            <br />
                                        </>
                                    ) : null
                                })()}
                                <span className="text-red-500 font-medium">This action cannot be undone.</span>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel
                                className="font-ocr text-xs border-primary/20 hover:border-primary/30"
                                disabled={!!isDeletingCategory}
                            >
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={deleteCategory}
                                className="font-ocr text-xs bg-red-500 hover:bg-red-600 border-red-500 text-white"
                                disabled={!!isDeletingCategory}
                            >
                                {isDeletingCategory ? (
                                    <>
                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    "Delete Category"
                                )}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DndContext>
        </div>
    )
}

function ChannelItem({
    channel,
    onEdit,
    onDelete,
    isDeleting
}: {
    channel: ExtendedChannel
    onEdit: (channel: ExtendedChannel) => void
    onDelete: (channel: ExtendedChannel) => void
    isDeleting: boolean
}) {
    return (
        <div className="flex items-center justify-between group hover:bg-primary/5 p-3 rounded-lg transition-all duration-200 border border-transparent hover:border-primary/30">
            <div className="flex items-center gap-2">
                <GripVertical className="w-3 h-3 text-primary/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Hash className="w-3 h-3 text-primary/60" />
                <span className="font-ocr text-sm text-foreground">{channel.name}</span>
                {channel.private && (
                    <div className="flex items-center gap-1">
                        <Lock className="w-3 h-3 text-primary/60" />
                        <Badge variant="secondary" className="text-xs font-ocr bg-primary/20 text-primary border-primary/30">
                            Private
                        </Badge>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(channel)}
                    className="h-6 w-6 p-0 hover:bg-primary/10 text-primary/60 hover:text-primary transition-all duration-200"
                >
                    <Edit className="w-3 h-3" />
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(channel)}
                    className="h-6 w-6 p-0 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 transition-all duration-200"
                    disabled={isDeleting}
                >
                    {isDeleting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                        <Trash2 className="w-3 h-3" />
                    )}
                </Button>
            </div>
        </div>
    )
}

// Uncategorized Drop Zone Component
function UncategorizedDropZone({ children, dragOverId }: { children: React.ReactNode; dragOverId?: string | null }) {
    const {
        setNodeRef,
        isOver,
    } = useDroppable({
        id: 'uncategorized-header',
    })

    const isDraggedOver = dragOverId === 'uncategorized-header'

    return (
        <div ref={setNodeRef} className="relative">
            <div className={`${(isOver || isDraggedOver) ? "ring-2 ring-primary/25 ring-offset-2 ring-offset-background" : ""}`}>
                {children}
            </div>
            {(isOver || isDraggedOver) && (
                <div className="absolute -bottom-2 left-0 right-0 text-center">
                    <div className="inline-block text-primary/80 text-xs font-ocr py-1 px-3 bg-primary/5 rounded-full border border-primary/20 shadow-lg animate-pulse">
                        Drop here to move to uncategorized
                    </div>
                </div>
            )}
        </div>
    )
}

// Sortable Category Component
function SortableCategory({
    category,
    children,
    onDeleteCategory,
    onCreateChannel,
    isDeletingCategory,
    channelCount = 0,
    dragOverId
}: {
    category: ExtendedCategory
    children: React.ReactNode
    onDeleteCategory: (category: ExtendedCategory) => void
    onCreateChannel: (categoryId: string) => void
    isDeletingCategory: boolean
    channelCount?: number
    dragOverId?: string | null
}) {
    const {
        attributes,
        listeners,
        setNodeRef: setSortableNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: `category-${category.categoryId}` })

    const {
        setNodeRef: setDroppableNodeRef,
        isOver,
    } = useDroppable({
        id: `category-${category.categoryId}`,
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    // Combine both refs
    const setNodeRef = (node: HTMLDivElement | null) => {
        setSortableNodeRef(node)
        setDroppableNodeRef(node)
    }

    const categoryId = category.categoryId.toString()
    const isDraggedOver = dragOverId === `category-${categoryId}`

    return (
        <div ref={setNodeRef} style={style} className="space-y-3">
            <div className={`flex items-center justify-between group p-3 rounded-lg transition-all duration-200 border bg-primary/3 ${isOver || isDraggedOver
                ? "border-primary/25 shadow-md bg-primary/5 ring-2 ring-primary/15"
                : "border-primary/15 hover:border-primary/20 hover:bg-primary/5"
                }`}>
                <div className="flex items-center gap-3">
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity text-primary/60 hover:text-primary"
                    >
                        <GripVertical className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-primary/40" />
                        <h3 className="font-freecam text-xs uppercase tracking-wide text-primary/70">
                            {category.name}
                        </h3>
                        <Badge variant="secondary" className="text-xs font-ocr bg-primary/10 text-primary/60 border-primary/20">
                            {channelCount}
                        </Badge>
                        {(isOver || isDraggedOver) && (
                            <span className="ml-2 text-xs text-primary font-ocr animate-pulse">
                                ← Drop here
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        size="sm"
                        onClick={() => onCreateChannel(category.categoryId.toString())}
                        variant="ghost"
                        className="h-6 w-6 p-0 hover:bg-primary/5 text-primary/40 hover:text-primary/60 transition-all duration-200"
                    >
                        <Plus className="w-3 h-3" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeleteCategory(category)}
                        className="h-6 w-6 p-0 text-red-500/40 hover:text-red-500/60 hover:bg-red-500/5 transition-all duration-200"
                        disabled={isDeletingCategory}
                    >
                        {isDeletingCategory ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                            <Trash2 className="w-3 h-3" />
                        )}
                    </Button>
                </div>
            </div>
            <div className="relative">
                {/* Connector line - only show if there are channels */}
                {channelCount > 0 && (
                    <div className="absolute left-6 top-0 bottom-0 w-px bg-primary/15" />
                )}
                <div className="pl-2">
                    {children}
                </div>
            </div>
        </div>
    )
}

// Insertion Line Component
function InsertionLine({ show, position = 'before' }: { show: boolean; position?: 'before' | 'after' }) {
    if (!show) return null

    return (
        <div className={`${position === 'before' ? '-mb-1' : '-mt-1'} ${position === 'before' ? 'order-first' : 'order-last'}`}>
            <div className="h-0.5 from-transparent via-primary to-transparent rounded-full animate-pulse shadow-lg">
                <div className="h-full bg-primary/50 rounded-full"></div>
            </div>
            <div className="flex justify-center -mt-1">
                <div className="w-2 h-2 bg-primary rounded-full shadow-lg animate-pulse"></div>
            </div>
        </div>
    )
}

// Sortable Channel Component
function SortableChannel({
    channel,
    onEdit,
    onDelete,
    isDeleting,
    isMoving = false,
    idPrefix = 'channel',
    insertionPreview,
    dragOverId
}: {
    channel: ExtendedChannel
    onEdit: (channel: ExtendedChannel) => void
    onDelete: (channel: ExtendedChannel) => void
    isDeleting: boolean
    isMoving?: boolean
    idPrefix?: string
    insertionPreview?: { targetId: string; position: 'before' | 'after'; categoryId?: string } | null
    dragOverId?: string | null
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: `${idPrefix}-${channel.channelId}` })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : isMoving ? 0.7 : 1,
    }

    const isLoading = isDeleting || isMoving
    const channelId = channel.channelId.toString()
    const isDraggedOver = dragOverId === `${idPrefix}-${channelId}`
    const showInsertionLine = insertionPreview?.targetId === channelId

    return (
        <div className="relative">
            {/* Insertion line before */}
            <InsertionLine
                show={showInsertionLine && insertionPreview?.position === 'before'}
                position="before"
            />

            <div ref={setNodeRef} style={style} className={`flex items-center justify-between group p-3 rounded-lg transition-all duration-200 border ${isMoving
                ? "bg-blue-500/5 border-blue-500/20 shadow-md"
                : isDeleting
                    ? "bg-red-500/5 border-red-500/20 shadow-md"
                    : isDraggedOver
                        ? "bg-primary/8 border-primary/25 shadow-md ring-2 ring-primary/15"
                        : "border-transparent hover:border-primary/15 hover:bg-primary/3"
                }`}>
                <div className="flex items-center gap-3">
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity text-primary/30 hover:text-primary/40"
                    >
                        <GripVertical className="w-3 h-3" />
                    </div>
                    <Hash className="w-3 h-3 text-primary/40" />
                    <span className="font-ocr text-sm text-foreground flex items-center gap-2">
                        {channel.name}
                        {isMoving && (
                            <span className="text-xs text-blue-500 font-ocr animate-pulse">
                                moving...
                            </span>
                        )}
                    </span>
                    {channel.private && (
                        <div className="flex items-center gap-1">
                            <Lock className="w-3 h-3 text-primary/40" />
                            <Badge variant="secondary" className="text-xs font-ocr bg-primary/10 text-primary/60 border-primary/20">
                                Private
                            </Badge>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(channel)}
                        className="h-6 w-6 p-0 hover:bg-primary/5 text-primary/40 hover:text-primary/60 transition-all duration-200"
                        disabled={isLoading}
                    >
                        <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(channel)}
                        className="h-6 w-6 p-0 text-red-500/40 hover:text-red-500/60 hover:bg-red-500/5 transition-all duration-200"
                        disabled={isLoading}
                    >
                        {isDeleting ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                        ) : isMoving ? (
                            <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                        ) : (
                            <Trash2 className="w-3 h-3" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Insertion line after */}
            <InsertionLine
                show={showInsertionLine && insertionPreview?.position === 'after'}
                position="after"
            />
        </div>
    )
}
