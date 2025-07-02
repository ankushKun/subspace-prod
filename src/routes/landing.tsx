import bg from "@/assets/bg.png"
import { ThemeToggleButton } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"
import alienShip from "@/assets/subspace/alien-ship.svg"
import alienTransparent from "@/assets/subspace/alien-transparent.svg"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import LoginDialog from "@/components/login-dialog"
import { useWallet } from "@/hooks/use-wallet"
import { ExternalLink } from "lucide-react"
import { Link } from "react-router"


function Trapezoid({ className }: { className?: string }) {
    return (
        <div className={cn("w-52 bg-primary absolute z-0 h-12", className)} style={{ transform: 'perspective(100px) rotateX(-35deg)', transformOrigin: 'top center' }} />
    )
}

export default function SubspaceLanding() {
    const { connected } = useWallet()

    return (
        <div className="flex flex-col items-center justify-start h-screen overflow-clip overflow-y-scroll">
            <ThemeToggleButton className="rounded-xs left-4.5 !z-20 absolute -top-0.5 !text-black !bg-transparent" />
            {!connected ? <LoginDialog>
                <Button className="absolute top-0 right-1 font-ocr !z-20 rounded-none !bg-transparent p-0 px-2 h-8">
                    login
                </Button>
            </LoginDialog> :
                <Link to="/app">
                    <Button className="absolute top-0 right-1 font-ocr h-8 !z-20 rounded-none !bg-transparent p-0 !px-1.5">app <ExternalLink /></Button>
                </Link>
            }
            <div className="!bg-primary text-background !w-screen mx-auto !h-2 transform-gpu absolute overflow-x-clip top-0">
                <Trapezoid className="left-1/2 -translate-x-1/2 top-2 w-60 absolute" />
                <div className="mx-auto z-10 px-2 absolute left-1/2 -translate-x-1/2 top-2 text-xl font-ocr text-black flex items-center justify-center gap-2">
                    <img src={alienTransparent} alt="logo" className="object-cover w-5 mb-1.5" />
                    SUBSPACE
                </div>
                <Trapezoid className="left-0 -translate-x-2/3 w-72 top-0 z-0" />
                <Trapezoid className="right-0 translate-x-2/3 w-72 top-0 z-0" />
            </div>
            <div className="w-full h-full !z-0 pt-20 flex flex-col items-center justify-center px-4 sm:px-6 text-foreground relative py-8 sm:py-12">
                <div className="max-w-6xl mx-auto text-center space-y-10 sm:space-y-12 md:space-y-16">

                    <div className="font-freecam text-2xl sm:text-3xl md:text-4xl lg:text-5xl flex flex-col items-center justify-center gap-6 sm:gap-8 md:gap-10">

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                            <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl">GET</div>
                            <div className="text-primary text-3xl sm:text-4xl md:text-5xl lg:text-6xl">ABDUCTED</div>
                        </div>

                        <div className="flex items-center justify-center gap-2 sm:gap-4 text-center text-lg sm:text-xl md:text-2xl lg:text-3xl">
                            INTO A WORLD OF
                        </div>

                        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4">
                            <div className="text-primary text-3xl sm:text-4xl md:text-5xl lg:text-6xl">
                                ALIEN
                            </div>
                            <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl">
                                TECH
                            </div>
                        </div>
                    </div>

                    {/* Decorative elements */}
                    <div className="flex justify-center items-center space-x-6 sm:space-x-8 md:space-x-10 my-8 md:my-12 opacity-50">
                        <div className="w-10 sm:w-12 md:w-16 h-0.5 bg-primary/50"></div>
                        <div className="w-2.5 sm:w-3 md:w-4 h-2.5 sm:h-3 md:h-4 bg-primary rounded-full animate-pulse"></div>
                        <div className="w-12 sm:w-16 md:w-20 h-0.5 bg-primary/30"></div>
                        <div className="w-2 sm:w-2.5 md:w-3 h-2 sm:h-2.5 md:h-3 bg-primary/70 rounded-full animate-pulse delay-500"></div>
                        <div className="w-10 sm:w-12 md:w-16 h-0.5 bg-primary/50"></div>
                    </div>

                    {/* Subtitle */}
                    <div className="text-muted-foreground max-w-4xl mx-auto font-freecam font-light text-base sm:text-lg md:text-xl px-4 leading-relaxed">
                        Connect with your friends across the cosmos with <span className="text-primary">decentralized</span> communications
                    </div>

                    {/* CTA area */}
                    <div className="flex flex-col items-center space-y-4 sm:space-y-6 mt-12 md:mt-16 px-4">
                        {!connected ? <LoginDialog>
                            <Button variant="ghost" className="text-base sm:text-lg md:text-xl font-ocr tracking-[0.15em] sm:tracking-[0.2em] md:tracking-[0.3em] bg-primary text-black h-12 sm:h-14 md:h-16 px-6 sm:px-8 md:px-10 rounded-lg">
                                ◆ MAKE CONTACT ◆
                            </Button>
                        </LoginDialog> : <>
                            <Button variant="ghost" className="text-base uppercase sm:text-lg md:text-xl font-ocr tracking-[0.15em] sm:tracking-[0.2em] md:tracking-[0.3em] bg-primary text-black h-12 sm:h-14 md:h-16 px-6 sm:px-8 md:px-10 rounded-lg">
                                <Link to="/app">
                                    start chatting
                                </Link>
                            </Button>
                        </>}
                        <div className="flex space-x-2 text-primary/60">
                            <div className="w-1 h-1 bg-current rounded-full animate-ping"></div>
                            <div className="w-1 h-1 bg-current rounded-full animate-ping delay-200"></div>
                            <div className="w-1 h-1 bg-current rounded-full animate-ping delay-400"></div>
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
            {/* footer */}
            <div className="w-full bg-[#131313] mt-auto flex md:flex-row flex-col items-center justify-center overflow-clip">
                <div className="w-full h-full !text-white p-3 sm:p-4 px-4 sm:px-6 flex flex-col gap-1 sm:gap-2">
                    <div className="font-freecam text-primary text-sm sm:text-base">powered by {" "}
                        <a href="https://ao.ar.io" target="_blank"
                            className="hover:underline underline-offset-4 hover:tracking-widest transition-all duration-200 hover:text-white">
                            AOTHECOMPUTER
                        </a>
                    </div>
                    {/* @ts-ignore */}
                    <div className="font-ocr text-primary text-[10px] sm:text-xs opacity-60">v{__VERSION__}  {__COMMIT_HASH__}</div>
                </div>
                <img src={alienShip} alt="logo" draggable={false} className="ml-auto bg-primary object-cover relative top-0.5" />
            </div>

        </div>
    )
}