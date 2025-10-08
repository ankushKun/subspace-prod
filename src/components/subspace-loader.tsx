import icon from "@/assets/subspace/alien-face-black.svg"
import { Settings } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"

const messages = [
    "Waiting for Subspace process to respond..."
    // // Serious messages
    // "Booting up...",
    // "Loading...",
    // "Connecting to the network...",
    // "Initializing the system...",
    // "Starting the engine...",
    // "Establishing secure connection...",
    // "Synchronizing data...",
    // "Verifying credentials...",
    // "Preparing user interface...",
    // "Fetching latest updates...",

    // // random
    // "meow :3",
    // // Funny messages
    // "Summoning green aliens...",
    // "Negotiating with the server gremlins...",
    // "Polishing the spaceship...",
    // "Counting stars in the blockchain...",
    // "Feeding the hamsters powering the servers...",
    // "Convincing the AI to cooperate...",
    // "Reticulating splines...",
    // "Assembling quantum bits...",
    // "Consulting the oracle...",
    // "Warming up the flux capacitor...",
]

interface SubspaceLoaderProps {
    isAnimatingOut?: boolean
}

export default function SubspaceLoader({ isAnimatingOut = false }: SubspaceLoaderProps) {
    const [message, setMessage] = useState(messages[Math.floor(Math.random() * messages.length)])

    useEffect(() => {
        const interval = setInterval(() => {
            setMessage(messages[Math.floor(Math.random() * messages.length)])
        }, 2100)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className={`flex flex-col items-center justify-center h-screen relative ${isAnimatingOut ? 'animate-blur-out' : 'animate-blur-in'}`}>
            {/* <Link to="/app/settings">
                <Button variant="ghost" size="icon" className="absolute top-4 right-4">
                    <Settings className="w-4 h-4" />
                </Button>
            </Link> */}
            <div className="flex flex-col items-center justify-center">
                <div className="w-24 h-24 bg-primary aspect-square rounded-full overflow-clip flex items-center justify-center">
                    <img src={icon} alt="icon" className="w-[80%] animate-rotation" />
                </div>

                {/* Discord-style loading spinner with multiple segments */}
                {/* <div className="relative w-40 h-40">
                    <div className="absolute inset-0 w-40 h-40 border-2 border-muted-foreground/10 rounded-full"></div>

                    <div className="absolute inset-0 opacity-20 w-40 h-40 border-2 border-transparent border-t-primary rounded-full animate-spin [animation-duration:1.2s]"></div>
                    <div className="absolute inset-0 opacity-20 w-40 h-40 border-2 border-transparent border-r-primary/60 rounded-full animate-spin [animation-duration:1.8s] [animation-direction:reverse]"></div>
                </div> */}
            </div>

            <p className="text-xs text-muted-foreground mt-6 font-medium font-ocr text-center">{message}</p>
        </div >
    )
}