import React, { useEffect, useMemo, useState } from "react";
import type { Components } from "react-markdown";
import { useSubspace } from "@/hooks/use-subspace";
import { useWallet } from "@/hooks/use-wallet";
import { useNavigate } from "react-router";
import { useGlobalState } from "@/hooks/use-global-state";
// import ProfilePopover from "@/routes/app/components/profile-popover";
import { ProfilePopover } from "@/components/profile";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Users, ExternalLink, Loader2, CircleQuestionMark } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "./utils";

// Shared Markdown renderers used across chat views.
// Consumers can extend behaviors by merging with their own link renderer:
// components={{ ...mdComponents, a: CustomLink }}
export const mdComponents: Components = {
    // Link renderer with global behaviors (invites, mentions, safe https-only links)
    a: ({ href, children, ...rest }) => {
        const navigate = useNavigate();
        const { servers, actions } = useSubspace();
        const { address } = useWallet();
        const isHttps = typeof href === 'string' && href.startsWith('https://');
        const { activeServerId } = useGlobalState();

        // User mention placeholder (userId embedded in href)
        if (href?.startsWith("#__user_mention_")) {
            const userId = href.replace("#__user_mention_", "").replace("__", "");
            return (
                <ProfilePopover userId={userId} side="bottom" align="center">
                    <span
                        className="inline-flex items-center px-1 py-0.5 mx-0.5 text-sm font-medium text-primary bg-primary/20 hover:bg-primary/25 transition-colors rounded-sm cursor-pointer"
                        {...rest}
                    >
                        @{children}
                    </span>
                </ProfilePopover>
            );
        }

        // Channel mention placeholder (channelId embedded in href)
        if (href?.startsWith("#__channel_mention_")) {
            const channelId = href.replace("#__channel_mention_", "").replace("__", "");
            const handleChannelClick = (e: React.MouseEvent) => {
                e.preventDefault();
                const currentServerId = useGlobalState.getState().activeServerId;
                if (currentServerId) navigate(`/app/${currentServerId}/${channelId}`);
            };
            return (
                <span
                    className="inline-flex items-center px-1 py-0.5 mx-0.5 text-sm font-medium text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors duration-150 rounded-sm cursor-pointer"
                    onClick={handleChannelClick}
                    {...rest}
                >
                    #{children}
                </span>
            );
        }

        // Invite links (render inline preview and keep original link clickable)
        const inviteMatch = href?.match(/invite\/([A-Za-z0-9_-]+)/);
        if (inviteMatch) {
            const serverId = inviteMatch[1];
            return (
                <>
                    {isHttps ? (
                        <>
                            <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline cursor-pointer transition-colors"
                                {...rest}
                            >
                                {children}
                            </a>
                            <InvitePreviewInline serverId={serverId} href={href} />
                        </>
                    ) : (
                        <span className="" {...rest}>{children}</span>
                    )}
                </>
            );
        }

        // Fallback: treat bare userId links (non-https) as user mentions in DMs
        const looksLikeUserId = typeof href === 'string' && !href.includes('://') && /^[A-Za-z0-9_-]{25,}$/.test(href || '');
        if (looksLikeUserId) {
            const userId = href as string;
            return (
                <ProfilePopover userId={userId} side="bottom" align="center">
                    <span
                        className="inline-flex items-center px-1 py-0.5 mx-0.5 text-sm font-medium text-primary bg-primary/20 hover:bg-primary/25 transition-colors rounded-sm cursor-pointer"
                        {...rest}
                    >
                        @{children}
                    </span>
                </ProfilePopover>
            );
        }

        // Default: only hyperlink https links, render others as inert text
        return isHttps ? (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline cursor-pointer transition-colors"
                {...rest}
            >
                {children}
            </a>
        ) : (
            <span {...rest}>{children}</span>
        );
    },

    // Text formatting
    strong: ({ node, ...props }: any) => (
        <strong className="font-bold text-foreground" {...props} />
    ),
    em: ({ node, ...props }: any) => (
        <em className="italic text-foreground" {...props} />
    ),
    del: ({ node, ...props }: any) => (
        <del className="line-through text-muted-foreground" {...props} />
    ),

    // Code blocks and inline code
    code: ({ node, inline, ...props }: any) => (
        inline ? (
            <code
                className="bg-muted/50 border border-border/50 text-foreground px-1.5 py-0.5 rounded text-sm font-mono"
                {...props}
            />
        ) : (
            <code
                className="block bg-muted/50 border border-border/50 text-foreground p-3 rounded-md text-sm font-mono whitespace-pre-wrap overflow-x-auto"
                {...props}
            />
        )
    ),
    pre: ({ node, ...props }: any) => (
        <pre className="bg-muted/50 border border-border/50 text-foreground p-3 rounded-md text-sm font-mono whitespace-pre-wrap overflow-x-auto my-2" {...props} />
    ),

    // Headers
    h1: ({ node, ...props }: any) => (
        <h1 className="text-2xl font-bold text-foreground mb-2 mt-4 first:mt-0" {...props} />
    ),
    h2: ({ node, ...props }: any) => (
        <h2 className="text-xl font-bold text-foreground mb-2 mt-3 first:mt-0" {...props} />
    ),
    h3: ({ node, ...props }: any) => (
        <h3 className="text-lg font-semibold text-foreground mb-1 mt-2 first:mt-0" {...props} />
    ),
    h4: ({ node, ...props }: any) => (
        <h4 className="text-base font-semibold text-foreground mb-1 mt-2 first:mt-0" {...props} />
    ),
    h5: ({ node, ...props }: any) => (
        <h5 className="text-sm font-semibold text-foreground mb-1 mt-1 first:mt-0" {...props} />
    ),
    h6: ({ node, ...props }: any) => (
        <h6 className="text-sm font-medium text-muted-foreground mb-1 mt-1 first:mt-0" {...props} />
    ),

    // Lists
    ul: ({ node, ...props }: any) => (
        <ul className="list-disc list-inside space-y-1 my-2 text-foreground ml-4" {...props} />
    ),
    ol: ({ node, ...props }: any) => (
        <ol className="list-decimal list-inside space-y-1 my-2 text-foreground ml-4" {...props} />
    ),
    li: ({ node, ...props }: any) => (
        <li className="text-foreground" {...props} />
    ),

    // Blockquotes
    blockquote: ({ node, ...props }: any) => (
        <blockquote className="border-l-4 border-muted-foreground/30 pl-4 py-2 my-2 bg-muted/30 text-muted-foreground italic rounded-r" {...props} />
    ),

    // Tables
    table: ({ node, ...props }: any) => (
        <div className="overflow-x-auto my-2">
            <table className="min-w-full border border-border rounded-md" {...props} />
        </div>
    ),
    thead: ({ node, ...props }: any) => (
        <thead className="bg-muted/50" {...props} />
    ),
    tbody: ({ node, ...props }: any) => (
        <tbody {...props} />
    ),
    tr: ({ node, ...props }: any) => (
        <tr className="border-b border-border" {...props} />
    ),
    th: ({ node, ...props }: any) => (
        <th className="px-3 py-2 text-left font-semibold text-foreground border-r border-border last:border-r-0" {...props} />
    ),
    td: ({ node, ...props }: any) => (
        <td className="px-3 py-2 text-foreground border-r border-border last:border-r-0" {...props} />
    ),

    // Horizontal rule
    hr: ({ node, ...props }: any) => (
        <hr className="border-t border-border my-4" {...props} />
    ),

    // Paragraphs
    p: ({ node, ...props }: any) => (
        <p className="text-foreground leading-relaxed mb-2 last:mb-0" {...props} />
    ),
};

// Global inline invite preview card that only reads from state; triggers background updates
function InvitePreviewInline({ serverId, href }: { serverId: string; href: string }) {
    const navigate = useNavigate();
    const { servers, actions } = useSubspace();
    const { address } = useWallet();

    const serverFromStore: any = servers?.[serverId];
    const cachedMembers = serverFromStore?.members;
    const isMemberFromCache = Array.isArray(cachedMembers)
        ? cachedMembers.some((m: any) => m?.userId === address)
        : cachedMembers && typeof cachedMembers === "object"
            ? !!cachedMembers[address as any]
            : false;

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isJoining, setIsJoining] = useState(false);

    // Background update to hydrate server/membership if missing
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                if (!serverFromStore && actions?.servers?.get) {
                    await actions.servers.get(serverId);
                }
                if (!isMemberFromCache && address && actions?.servers?.getMember) {
                    await actions.servers.getMember({
                        serverId,
                        userId: address
                    });
                }
            } catch {
                // ignore
            }
        })();
        return () => { cancelled = true };
    }, [serverId, address]);

    const serverIcon = serverFromStore?.logo ? `https://arweave.net/${serverFromStore.logo}` : null;
    const memberText = serverFromStore?.memberCount
        ? `${serverFromStore.memberCount} member${serverFromStore.memberCount !== 1 ? 's' : ''}`
        : 'Unknown members';
    const isUnknownServer = !serverFromStore;

    return (
        <div className="flex flex-col my-2 max-w-md">
            <div
                className={cn("flex items-center space-x-3 p-4 rounded-lg transition-colors h-20",
                    isUnknownServer ? "bg-muted/50 border border-border" : "bg-primary/[2%] border border-primary/10 hover:bg-primary/[4%]"
                )}
            >
                <div className={cn("flex items-center justify-center h-12 w-12 rounded-lg overflow-hidden",
                    isUnknownServer ? "bg-muted/50 border border-border" : "bg-primary/10"
                )}>
                    {serverIcon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={serverIcon} alt={serverFromStore?.name || 'Server'} className="h-full w-full object-cover" />
                    ) : (
                        <CircleQuestionMark className="h-6 w-6 text-muted-foreground" />
                    )}
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-sm font-medium text-foreground truncate">
                        {serverFromStore?.name || `Unknown Server ${serverId.substring(0, 8)}...`}
                    </p>
                    {serverFromStore?.description && (
                        <p className="text-xs text-muted-foreground truncate line-clamp-1">{serverFromStore.description}</p>
                    )}
                    <div className="flex items-center space-x-2 text-xs mt-1 text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{memberText}</span>
                    </div>
                </div>
                {isMemberFromCache ? (
                    <Button size="sm" variant="outline" className="shrink-0" onClick={() => navigate(`/app/${serverId}`)}>
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Go to Server
                    </Button>
                ) : isUnknownServer ? (
                    <Button size="sm" variant="outline" className="shrink-0" disabled>
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Join
                    </Button>
                ) : (
                    <Button size="sm" variant="outline" className="shrink-0" onClick={() => setIsDialogOpen(true)}>
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Join
                    </Button>
                )}
            </div>

            {/* Join confirmation dialog */}
            <Dialog open={isDialogOpen && !isUnknownServer} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Join {isUnknownServer ? `Unknown Server ${serverId.substring(0, 8)}...` : serverFromStore?.name}</DialogTitle>
                        <DialogDescription>
                            You are about to join this server. Review the details below and confirm.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center gap-3 py-2">
                        <div className="flex items-center justify-center h-12 w-12 bg-primary/10 rounded-lg overflow-hidden">
                            {serverIcon ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={serverIcon} alt={serverFromStore?.name || 'Server'} className="h-full w-full object-cover" />
                            ) : (
                                <CircleQuestionMark className="h-6 w-6 text-primary" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                                {serverFromStore?.name || `Server ${serverId.substring(0, 8)}...`}
                            </p>
                            {serverFromStore?.description && (
                                <p className="text-xs text-muted-foreground truncate line-clamp-2">{serverFromStore.description}</p>
                            )}
                            <div className="flex items-center space-x-2 text-xs mt-1 text-muted-foreground">
                                <Users className="h-3 w-3" />
                                <span>{memberText}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2">
                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={isJoining}>Cancel</Button>
                        <Button
                            variant="default"
                            onClick={async () => {
                                try {
                                    setIsJoining(true);
                                    const success = await actions?.servers?.join?.(serverId);
                                    if (success) {
                                        setIsDialogOpen(false);
                                        navigate(`/app/${serverId}`);
                                    }
                                } catch (e) {
                                    // ignore
                                } finally {
                                    setIsJoining(false);
                                }
                            }}
                            disabled={isJoining || isUnknownServer}
                        >
                            {isJoining ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Joining…</>) : 'Join Server'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

