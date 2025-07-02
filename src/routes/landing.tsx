import bg from "@/assets/bg.png"
import { ThemeToggleButton } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"
import alienShip from "@/assets/subspace/alien-ship.svg"
import alienTransparent from "@/assets/subspace/alien-transparent.svg"
import { useTheme } from "@/components/theme-provider"


function Trapezoid({ className }: { className?: string }) {
    return (
        <div className={cn("w-52 bg-primary absolute z-0 h-12", className)} style={{ transform: 'perspective(100px) rotateX(-35deg)', transformOrigin: 'top center' }} />
    )
}

export default function SubspaceLanding() {
    const { theme } = useTheme()

    return (
        <div className="flex flex-col items-center justify-start h-screen">
            <div className="bg-primary text-background w-full h-2.5 transform-gpu">
                <Trapezoid className="left-1/2 -translate-x-1/2 top-2 w-60" />
                <div className="mx-auto z-10 px-2 absolute left-1/2 -translate-x-1/2 top-1.5 pointer-events-none font-ocr text-black text-2xl flex items-center justify-center gap-3">
                    <img src={alienTransparent} alt="logo" className="object-cover w-7 h-7 mb-2" />
                    SUBSPACE
                </div>
                <Trapezoid className="left-0 -translate-x-2/3 top-2.5" />
                <ThemeToggleButton className="rounded-xs left-2 z-10 relative top-0.5 !text-black !bg-transparent " />
            </div>
            <div className="w-full mt-8 text-foreground">
                ok
            </div>
            {/* footer */}
            <div className="w-full bg-[#131313] mt-auto flex items-center justify-center overflow-clip">
                <div className="w-full h-full !text-white p-2 px-3 flex flex-col gap-1">
                    <div className="font-freecam text-primary">powered by {" "}
                        <a href="https://ao.ar.io" target="_blank"
                            className="hover:underline underline-offset-4 hover:tracking-widest transition-all duration-200 hover:text-white">
                            AOTHECOMPUTER
                        </a>
                    </div>
                    {/* @ts-ignore */}
                    <div className="font-freecam text-primary text-[10px] opacity-60">v{__VERSION__} | {__COMMIT_HASH__}</div>
                </div>
                <img src={alienShip} alt="logo" draggable={false} className="ml-auto bg-primary object-cover relative top-0.5" />
            </div>

        </div>
    )
}