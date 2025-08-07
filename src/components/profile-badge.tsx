import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipProvider, TooltipContent } from "@radix-ui/react-tooltip";
import { Link } from "react-router";
import { useState } from "react";

export default function ProfileBadge({ logo, hoverText, children, link }: { logo: string, hoverText: string, children?: React.ReactNode, link: string }) {
    const [isHovered, setIsHovered] = useState(false)
    if (!logo) return null

    return <TooltipProvider>
        <Tooltip open={isHovered}>
            <TooltipTrigger asChild>
                <Badge className="max-h-5 bg-primary/20 aspect-square p-0 inline rounded-full border-0 relative" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
                    <Link to={link} target="_blank" rel="noopener noreferrer">
                        <img draggable={false} src={`https://arweave.net/${logo}`} className="w-full h-full object-left object-cover" />
                    </Link>
                </Badge>
            </TooltipTrigger>
            <TooltipContent className="font-ka z-20 text-sm rounded-md overflow-clip text-background relative p-0 animate-in slide-in-from-bottom-2 duration-200" sideOffset={5}>
                {children ? <div className="text-center flex items-center justify-center p-0 max-w-20 z-20 relative">{children}</div> : <div className="text-center px-1 bg-primary z-20 relative">{hoverText}</div>}
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
}