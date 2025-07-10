import { cn } from "@/lib/utils";

export default function Messages({ className }: { className?: string }) {
    return <div className={cn("", className)}>
        messages
    </div>
}