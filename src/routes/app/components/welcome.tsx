import { cn } from "@/lib/utils"

export default function Welcome({ className }: { className?: string }) {
    return <div className={cn("flex flex-col items-center justify-center h-screen w-screen text-center relative overflow-hidden", className)}>
        <div className="max-w-4xl mx-auto text-center space-y-8">

            <div className="font-freecam text-2xl flex flex-col items-center justify-center gap-6">

                <div className="flex flex-col lg:flex-row items-center justify-center gap-3">
                    <div className="text-2xl">Welcome to</div>
                    <div className="text-primary text-4xl">Subspace</div>
                </div>

                <div className="flex items-center justify-center gap-2 text-center text-base text-muted-foreground">
                    Connect with communities,<br /> join conversations, and share<br />
                    ideas in a decentralized space
                </div>
            </div>

            {/* Action hints */}
            <div className="flex flex-col items-center space-y-4 sm:space-y-6 mt-12 md:mt-16 px-4">
                <div className="text-muted-foreground max-w-2xl mx-auto font-freecam text-sm sm:text-base leading-relaxed">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="text-primary">👥</span>
                        <span className="font-ocr">Join a server to connect with communities</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-primary">💬</span>
                        <span className="font-ocr">Start a direct message conversation</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-primary/20 rounded-full animate-pulse"></div>
            <div className="absolute top-1/3 right-1/3 w-0.5 h-0.5 bg-primary/30 rounded-full animate-pulse delay-1000"></div>
            <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-primary/10 rounded-full animate-pulse delay-2000"></div>
            <div className="absolute bottom-1/4 right-1/4 w-0.5 h-0.5 bg-primary/40 rounded-full animate-pulse delay-1500"></div>
        </div>
    </div>
}