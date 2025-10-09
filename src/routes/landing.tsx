import bg from "@/assets/bg.png"
import { ThemeToggleButton } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"
import alienShip from "@/assets/subspace/alien-ship.svg"
import alien from "@/assets/subspace/alien-black.svg"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import LoginDialog from "@/components/login-dialog"
import { useWallet } from "@/hooks/use-wallet"
import { useIsMobile } from "@/hooks/use-mobile"
import { ExternalLink } from "lucide-react"
import { Link, useNavigate } from "react-router"
import s1 from "@/assets/s1.png"
import s2 from "@/assets/s2.png"
import chk from "@/assets/chkthisout.png"
import { useEffect, useState, useRef } from "react"
import { Input } from "@/components/ui/input"


function Trapezoid({ className }: { className?: string }) {
    return (
        <div className={cn("w-52 bg-primary absolute border border-t-0 ring-black z-0 h-12", className)} style={{ transform: 'perspective(100px) rotateX(-35deg)', transformOrigin: 'top center' }} />
    )
}

export default function SubspaceLanding() {
    const { connected } = useWallet()
    const isMobile = useIsMobile()
    const navigate = useNavigate()
    const [email, setEmail] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const initialConnectionState = useRef<boolean | null>(null)

    function scrollToWaitlist() {
        const waitlist = document.getElementById("waitlist")
        if (waitlist) {
            waitlist.scrollIntoView({ behavior: "smooth", block: "center" })
        }
    }

    async function handleWaitlistSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!email || isSubmitting) return

        setIsSubmitting(true)

        try {
            await fetch("https://arweave.tech/api/subspace/waitlist", {
                // await fetch("http://localhost:3001/subspace/waitlist", {
                method: "POST",
                body: JSON.stringify({ email }),
                headers: {
                    "Content-Type": "application/json"
                }
            })
            setIsSubmitted(true)
            setEmail("")
        } catch (error) {
            console.error("Failed to submit to waitlist:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Navigate to /app when wallet connection changes from disconnected to connected
    useEffect(() => {
        // Store initial connection state on mount
        if (initialConnectionState.current === null) {
            initialConnectionState.current = connected
            return
        }

        // Navigate only if connection changed from false to true
        if (!initialConnectionState.current && connected) {
            navigate("/app")
        }

        // Update the tracked state
        initialConnectionState.current = connected
    }, [connected, navigate])

    return (
        <div className="flex flex-col min-h-screen max-w-screen overflow-clip">
            <title>Subspace</title>
            {/* <ThemeToggleButton className="rounded-xs left-4.5 !z-20 absolute -top-0.5 !text-black !bg-transparent" /> */}
            <img src={alien} alt="logo" className="absolute top-1 left-6 w-6 h-6 z-20" />
            {!connected ? <LoginDialog>
                <Button asChild className="absolute top-0 right-1 font-ocr !z-20 rounded-none !bg-transparent p-0 px-2 h-8">
                    <span>login</span>
                </Button>
            </LoginDialog> :
                <Link to="/app">
                    <Button className="absolute top-0 right-1 font-ocr h-8 !z-20 rounded-none !bg-transparent p-0 !px-1 pr-1.5">app <ExternalLink /></Button>
                </Link>
            }
            {/* <Link to="#waitlist" onClick={scrollToWaitlist}>
                <Button className="absolute top-0 right-1 font-ocr h-8 !z-20 rounded-none !bg-transparent p-0 !px-1">waitlist</Button>
            </Link> */}
            <div className="!bg-primary border-b text-background !w-screen mx-auto !h-2 transform-gpu absolute top-0 z-10 overflow-x-clip">
                <Trapezoid className="left-1/2 -translate-x-1/2 top-1.5 w-60 absolute" />
                <div className="mx-auto z-10 px-2 absolute left-1/2 -translate-x-1/2 top-2 text-xl font-ocr text-black flex items-center justify-center gap-2">
                    {/* <img src={alien} alt="logo" className="object-cover w-5 mb-1.5" /> */}
                    SUBSPACE
                </div>
                <Trapezoid className="left-0 -translate-x-2/3 w-72 top-0 z-0" />
                <Trapezoid className="right-0 translate-x-2/3 w-72 top-0 z-0" />
            </div>

            <div className="flex-1 w-full !z-0 pt-24 pb-16 flex flex-col items-center justify-center px-4 sm:px-6 text-foreground relative">
                <div className="max-w-4xl mx-auto text-center flex flex-col items-center justify-center">

                    {/* Main Logo Section */}
                    <div className="relative flex flex-col items-center justify-center h-[75vh] w-[90vw] md:w-[75vw]">
                        <div className="drop-shadow-2xl drop-shadow-primary/40 w-full ">
                            <svg
                                className="w-full h-auto"
                                viewBox="0 0 1639 596"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                style={{ color: "var(--primary)" }}
                            >
                                <path
                                    d="M282.511 31.9736H11.3008V103.026H282.511V266.448H0V0H282.511V31.9736ZM0.00195312 206.053H271.212V135H0.00195312V206.053Z"
                                    fill="currentColor"
                                />
                                <path
                                    d="M621.524 266.448H339.014V0H353.139V206.053H607.397V0H621.524V266.448Z"
                                    fill="currentColor"
                                />
                                <path
                                    d="M960.536 266.448H678.025V0H960.536V266.448ZM692.151 135V206.053H946.41V135H692.151ZM692.152 103.026H918.161V31.9736H692.152V103.026Z"
                                    fill="currentColor"
                                />
                                <path
                                    d="M282.511 360.974H11.3008V432.026H282.511V595.448H30.3447L0 567V535H271.211V464H30L0 434V329H282.511V360.974Z"
                                    fill="currentColor"
                                />
                                <path
                                    d="M5.81212 595V581H8.18788V595H5.81212ZM0 589.188V586.812H14V589.188H0Z"
                                    fill="currentColor"
                                />
                                <path
                                    d="M621.526 595H621.525V484.868H353.141V595H339.016V328.552H621.526V595ZM353.139 431.578H607.397V360.525H353.139V431.578Z"
                                    fill="currentColor"
                                />
                                <path
                                    d="M960.538 595H946.408V484.868H692.149V595H678.027V328.552H960.538V595ZM692.149 431.578H946.408V360.525H692.149V431.578Z"
                                    fill="currentColor"
                                />
                                <path
                                    d="M1299.55 360.525H1031.16V534.605H1299.55V595H1017.04V328.552H1299.55V360.525Z"
                                    fill="currentColor"
                                />
                                <path
                                    d="M1638.56 360.525H1370.18V431.578H1638.56V463.552H1370.18V534.604H1638.56V595H1356.05V328.552H1638.56V360.525Z"
                                    fill="currentColor"
                                />
                                <rect x="1017" width="622" height="266" fill="currentColor" />
                                <path
                                    d="M1327.85 51.8701C1392.5 52.0366 1456.65 74.7222 1456.65 120.354C1456.65 176.775 1350.23 234.319 1326.33 234.319C1302.43 234.319 1196 176.775 1196 120.354C1196 74.7223 1260.15 52.0367 1324.8 51.8701H1327.85ZM1309.85 215.969H1315.48V217.442H1309.85V218.696H1315.71V215.306H1310.09V213.832H1315.71V213.169H1309.85V215.969ZM1317 218.696H1322.86V218.694H1317.29V216.41H1322.86V213.169H1317V218.696ZM1324.15 218.696H1330.01V213.169H1324.15V218.696ZM1331.29 218.696H1337.15V217.443H1331.58V213.832H1337.15V213.169H1331.29V218.696ZM1338.43 218.696H1344.29V217.442H1338.73V215.969H1344.29V215.306H1338.73V213.832H1344.29V213.169H1338.43V218.696ZM1329.72 218.694H1324.44V216.41H1329.72V218.694ZM1322.57 215.306H1317.29V213.832H1322.57V215.306ZM1329.72 215.306H1324.44V213.832H1329.72V215.306ZM1322.12 198.113H1324.7V198.789H1322.12V199.359H1324.8V197.806H1322.23V197.13H1324.8V196.824H1322.12V198.113ZM1325.35 199.359H1328.04V196.824H1327.91V198.784H1325.49V196.824H1325.35V199.359ZM1328.57 199.359H1331.26V196.824H1328.57V199.359ZM1331.12 198.789H1328.71V198.113H1331.12V198.789ZM1330.86 197.806H1328.71V197.13H1330.86V197.806ZM1275.62 120.965C1264.07 106.556 1244.5 93.6781 1225.84 101.977L1224.67 102.614C1223.84 103.02 1223.02 103.429 1222.19 103.84L1221.57 104.248C1215.28 108.076 1213.06 113.704 1212.07 119.115C1204.26 171.25 1277.7 181.995 1314.37 174.092C1308 168.008 1302.46 162.316 1297.35 155.699C1296.73 154.89 1296.11 154.084 1295.46 153.284C1291.6 148.54 1288.84 143.629 1286.16 138.552C1283.01 132.586 1280.04 126.585 1275.62 120.965ZM1426.82 101.977C1408.16 93.6781 1388.58 106.556 1377.04 120.965C1372.61 126.585 1369.64 132.586 1366.49 138.552C1363.81 143.629 1361.05 148.54 1357.19 153.284C1356.54 154.084 1355.92 154.89 1355.31 155.699C1350.2 162.316 1344.66 168.008 1338.28 174.092C1374.96 181.995 1448.39 171.25 1440.58 119.115C1439.59 113.704 1437.37 108.076 1431.09 104.248L1430.46 103.84C1429.64 103.429 1428.81 103.02 1427.98 102.614L1426.82 101.977Z"
                                    fill="#131313"
                                />
                                <path
                                    d="M1459.12 72V38H1464.88V72H1459.12ZM1445 57.8848V52.1152H1479V57.8848H1445Z"
                                    fill="#131313"
                                />
                            </svg>
                        </div>


                        <div className="font-ocr tracking-wider text-foreground text-sm sm:text-base md:text-lg lg:text-xl drop-shadow-xl mt-10">
                            Group chat with your friends!
                        </div>


                    </div>


                    {/* App Preview Section */}
                    <div className="relative flex flex-col items-center justify-center w-[80vw]">
                        <div className="relative">
                            <img
                                draggable={false}
                                src={chk}
                                className="absolute z-20 -top-24 -right-10 w-60 invert drop-shadow-white/40 dark:invert-0 drop-shadow-lg dark:drop-shadow-white/0"
                                alt="Check this out!"
                            />
                            <img
                                draggable={false}
                                src={isMobile ? s2 : s1}
                                className={cn("w-full mx-auto border -rotate-2 sm:-rotate-1 md:rotate-0 object-cover drop-shadow-2xl drop-shadow-primary/5 rounded border-primary/20", isMobile ? " max-w-sm" : "")}
                                alt="Subspace app preview"
                            />
                        </div>
                    </div>

                    {/* CTA area */}
                    <div className="flex flex-col items-center space-y-8 sm:space-y-10 mt-20">
                        {!connected ? <LoginDialog>
                            <Button asChild variant="ghost" className="text-lg sm:text-xl md:text-2xl font-ka tracking-wider bg-primary text-black h-14 sm:h-16 md:h-18 px-10 sm:px-12 md:px-14 rounded-lg hover:bg-primary/90 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl drop-shadow-2xl">
                                <span>Start Talking</span>
                            </Button>
                        </LoginDialog> : <>
                            <Link to="/app">
                                <Button variant="ghost" className="text-lg sm:text-xl md:text-2xl font-ka tracking-wider bg-primary text-black h-14 sm:h-16 md:h-18 px-10 sm:px-12 md:px-14 rounded-lg hover:bg-primary/90 hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl drop-shadow-2xl">
                                    Start Talking
                                </Button>
                            </Link>
                        </>}

                        {/* Enhanced loading dots */}
                        <div className="flex space-x-3 text-primary/60 pt-2">
                            <div className="w-1.5 h-1.5 bg-current rounded-full animate-ping"></div>
                            <div className="w-1.5 h-1.5 bg-current rounded-full animate-ping delay-200"></div>
                            <div className="w-1.5 h-1.5 bg-current rounded-full animate-ping delay-400"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* footer */}
            <div className="w-full bg-[#131313] mt-auto flex md:flex-row flex-col items-center justify-center">
                <div className="w-full h-full !text-white p-4 sm:p-6 px-6 sm:px-8 flex flex-col gap-2 sm:gap-3">
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