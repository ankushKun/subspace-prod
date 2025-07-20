import { cn } from "@/lib/utils";

export default function DmsList({ className }: { className?: string }) {
    return <div className={cn("flex flex-col w-60 h-full py-4 px-3 !z-10", className)}>
        DMs
    </div>
}