import { cn } from "@/lib/utils"

function Skeleton({ className, children, ...props }: React.ComponentProps<"div"> & { children?: React.ReactNode }) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-smooth-pulse rounded-md relative overflow-hidden", className)}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
      {children && (
        <div className="relative z-10 flex items-center justify-center h-full">
          {children}
        </div>
      )}
    </div>
  )
}

export { Skeleton }
