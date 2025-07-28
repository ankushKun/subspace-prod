// Permissions constants that match the server logic bitwise permissions
export const Permissions = {
    SEND_MESSAGES: 1 << 0,    // 1
    MANAGE_NICKNAMES: 1 << 1, // 2
    MANAGE_MESSAGES: 1 << 2,  // 4
    KICK_MEMBERS: 1 << 3,     // 8
    BAN_MEMBERS: 1 << 4,      // 16
    MANAGE_CHANNELS: 1 << 5,  // 32
    MANAGE_SERVER: 1 << 6,    // 64
    MANAGE_ROLES: 1 << 7,     // 128
    MANAGE_MEMBERS: 1 << 8,   // 256
    MENTION_EVERYONE: 1 << 9, // 512
    ADMINISTRATOR: 1 << 10,   // 1024
    ATTACHMENTS: 1 << 11,     // 2048
    MANAGE_BOTS: 1 << 12,     // 4096
} as const

// Permission definitions for UI display
export const PermissionDefinitions = [
    {
        id: "SEND_MESSAGES",
        name: "Send Messages",
        description: "Send messages in text channels",
        value: Permissions.SEND_MESSAGES,
        category: "General"
    },
    {
        id: "MANAGE_MESSAGES",
        name: "Manage Messages",
        description: "Delete and edit messages from other users",
        value: Permissions.MANAGE_MESSAGES,
        category: "General"
    },
    {
        id: "ATTACHMENTS",
        name: "Attach Files",
        description: "Upload files and images to messages",
        value: Permissions.ATTACHMENTS,
        category: "General"
    },
    {
        id: "MENTION_EVERYONE",
        name: "Mention Everyone",
        description: "Use @everyone and @here mentions",
        value: Permissions.MENTION_EVERYONE,
        category: "General"
    },
    {
        id: "MANAGE_NICKNAMES",
        name: "Manage Nicknames",
        description: "Change other users' nicknames",
        value: Permissions.MANAGE_NICKNAMES,
        category: "Members"
    },
    {
        id: "MANAGE_MEMBERS",
        name: "Manage Members",
        description: "Modify member settings and permissions",
        value: Permissions.MANAGE_MEMBERS,
        category: "Members"
    },
    {
        id: "KICK_MEMBERS",
        name: "Kick Members",
        description: "Remove members from the server",
        value: Permissions.KICK_MEMBERS,
        category: "Members"
    },
    {
        id: "BAN_MEMBERS",
        name: "Ban Members",
        description: "Ban members from the server",
        value: Permissions.BAN_MEMBERS,
        category: "Members"
    },
    {
        id: "MANAGE_CHANNELS",
        name: "Manage Channels",
        description: "Create, edit, and delete channels",
        value: Permissions.MANAGE_CHANNELS,
        category: "Server"
    },
    {
        id: "MANAGE_ROLES",
        name: "Manage Roles",
        description: "Create, edit, and delete roles",
        value: Permissions.MANAGE_ROLES,
        category: "Server"
    },
    {
        id: "MANAGE_SERVER",
        name: "Manage Server",
        description: "Edit server settings and information",
        value: Permissions.MANAGE_SERVER,
        category: "Server"
    },
    {
        id: "MANAGE_BOTS",
        name: "Manage Bots",
        description: "Add and remove bots from the server",
        value: Permissions.MANAGE_BOTS,
        category: "Server"
    },
    {
        id: "ADMINISTRATOR",
        name: "Administrator",
        description: "All permissions (overrides other permissions)",
        value: Permissions.ADMINISTRATOR,
        category: "Advanced"
    }
] as const

// Helper functions for permission manipulation
export const PermissionHelpers = {
    // Check if a permission value includes a specific permission
    hasPermission: (permissions: number, permission: number): boolean => {
        return (permissions & permission) === permission
    },

    // Add a permission to a permission value
    addPermission: (permissions: number, permission: number): number => {
        return permissions | permission
    },

    // Remove a permission from a permission value
    removePermission: (permissions: number, permission: number): number => {
        return permissions & ~permission
    },

    // Get an array of permission objects that are enabled
    getEnabledPermissions: (permissions: number) => {
        return PermissionDefinitions.filter(perm =>
            PermissionHelpers.hasPermission(permissions, perm.value)
        )
    },

    // Calculate total permissions value from array of permission IDs
    calculatePermissions: (permissionIds: string[]): number => {
        return permissionIds.reduce((total, permId) => {
            const perm = PermissionDefinitions.find(p => p.id === permId)
            return perm ? total | perm.value : total
        }, 0)
    },

    // Check if user has administrator permission (overrides all others)
    isAdministrator: (permissions: number): boolean => {
        return PermissionHelpers.hasPermission(permissions, Permissions.ADMINISTRATOR)
    }
} 