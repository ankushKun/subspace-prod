import { Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

export function ThemeToggleButton({ className }: { className?: string }) {
    const { theme } = useTheme()

    return (
        <Button
            variant="ghost"
            size="icon"
            className={cn("cursor-default opacity-50", className)}
            disabled
            title="Dark mode is forced - theme switching disabled"
        >
            {/* Always show moon icon since we're forced to dark mode */}
            <Moon className="h-[1.2rem] w-[1.2rem]" />
        </Button>
    )
}
