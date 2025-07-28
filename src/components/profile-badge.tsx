import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipProvider, TooltipContent } from "@radix-ui/react-tooltip";
import { Link } from "react-router";
import { useState } from "react";

export default function ProfileBadge({ logo, hoverText, link }: { logo: string, hoverText: string, link: string }) {
    const [isHovered, setIsHovered] = useState(false)
    if (!logo) return null

    return <TooltipProvider>
        <Tooltip open={isHovered}>
            <TooltipTrigger asChild>
                <Badge className="w-5 h-5 p-0 inline rounded-full border-0 bg-transparent relative" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
                    <Link to={link} target="_blank" rel="noopener noreferrer">
                        <img draggable={false} src={`https://arweave.net/${logo}`} className="w-full h-full object-cover" />
                    </Link>
                </Badge>
            </TooltipTrigger>
            <TooltipContent className="bg-primary border font-ka text-sm rounded-md text-background relative px-1 animate-in slide-in-from-bottom-2 duration-200" sideOffset={5}>
                <div className="text-center bg-primary z-20 relative">{hoverText}</div>
                <div className="w-2 h-2 bg-primary rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1 border-r border-b"></div>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
}