import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTrigger } from "@/components/ui/dialog"

import wander from "@/assets/logos/wander.png"
import arweave from "@/assets/logos/arweave.svg"
import metamask from "@/assets/logos/metamask.svg"
import discord from "@/assets/logos/discord.svg"
import github from "@/assets/logos/github.svg"
import google from "@/assets/logos/google.svg"
import x from "@/assets/logos/x.svg"

import { Button } from "@/components/ui/button"
import { Mail, QrCode, User2 } from "lucide-react"
import { ConnectionStrategies, useWallet } from "@/hooks/use-wallet"
import { useState, useEffect } from "react"
import { Scanner, type IDetectedBarcode } from '@yudiel/react-qr-scanner';
import type { JWKInterface } from "arweave/web/lib/wallet";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { useIsMobileDevice } from "@/hooks/use-mobile"
import { WAuthProviders } from "@wauth/sdk"

const totalScanSteps = 7;

export default function LoginDialog({ children }: { children: React.ReactNode }) {
    const [scanning, setScanning] = useState(false)
    const [scannedJWK, setScannedJWK] = useState<Record<string, any>>({})
    const [scanProgress, setScanProgress] = useState(0)
    const { address, actions: walletActions, connected, connectionStrategy, wanderInstance } = useWallet()
    const isMobileDevice = useIsMobileDevice()

    function handleScan(detectedCodes: IDetectedBarcode[]) {
        const raw = detectedCodes[0]?.rawValue
        if (raw) {
            try {
                const data = JSON.parse(raw) as Record<string, any>
                const key = Object.keys(data)[0]
                const value = data[key]

                setScannedJWK(prev => {
                    const newJWK = { ...prev, [key]: value }
                    const newProgress = Object.keys(newJWK).length
                    setScanProgress(newProgress)
                    return newJWK
                })
            } catch (error) {
                console.error("Failed to parse QR code data:", error)
            }
        }
    }

    useEffect(() => {
        if (scanProgress === totalScanSteps) {
            // Add required JWK properties
            const completeJWK = {
                ...scannedJWK,
                kty: "RSA",
                e: "AQAB"
            } as JWKInterface

            // Check if all required keys are present
            const requiredKeys = ["kty", "e", "n", "d", "p", "q", "dp", "dq", "qi"]
            const allKeysPresent = requiredKeys.every(key => completeJWK[key])

            if (allKeysPresent) {
                try {
                    walletActions.connect({ strategy: ConnectionStrategies.ScannedJWK, jwk: completeJWK })
                    toast.success("Wallet connected successfully!")
                    // Reset state after successful connection
                    setScanning(false)
                    setScannedJWK({})
                    setScanProgress(0)
                } catch (error) {
                    console.error("Failed to connect with scanned JWK:", error)
                    toast.error("Failed to connect with scanned wallet")
                    // Reset scanning state on error
                    setScanning(false)
                    setScannedJWK({})
                    setScanProgress(0)
                }
            } else {
                console.error("Missing required JWK keys:", requiredKeys.filter(key => !completeJWK[key]))
                toast.error("Incomplete wallet data scanned")
                // Reset scanning state
                setScanning(false)
                setScannedJWK({})
                setScanProgress(0)
            }
        }
    }, [scanProgress, scannedJWK, walletActions.connect])

    function clickClose() {
        const closeButton = document.getElementById("close-button")
        if (closeButton) {
            closeButton.click()
        }
    }

    function handleLoginOptionClicked(strategy: ConnectionStrategies, provider?: WAuthProviders) {
        clickClose()
        if (strategy === ConnectionStrategies.ScannedJWK) {
            // walletActions.connect({ strategy: ConnectionStrategies.ScannedJWK, jwk: scannedJWK})
        } else if (strategy === ConnectionStrategies.WAuth) {
            walletActions.connect({ strategy: ConnectionStrategies.WAuth, provider: provider })
        } else if (strategy === ConnectionStrategies.ArWallet) {
            walletActions.connect({ strategy: ConnectionStrategies.ArWallet })
        } else if (strategy === ConnectionStrategies.WanderConnect) {
        }
    }

    return (
        <Dialog onOpenChange={(open) => {
            if (!open) {
                setScanning(false)
                setScannedJWK({})
                setScanProgress(0)
            }
        }}>
            <DialogTrigger>
                {children}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    What do you want to login with?
                </DialogHeader>
                <DialogDescription className="flex flex-col gap-4 mt-4">
                    {scanning ? <>
                        <div className="space-y-4">
                            <div className="relative">
                                <Scanner
                                    constraints={{ facingMode: "environment" }}
                                    classNames={{
                                        container: "w-full max-w-sm md:!max-w-md mx-auto flex items-center justify-center rounded"
                                    }}
                                    onScan={handleScan}
                                    formats={["qr_code"]}
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>Scanning progress</span>
                                    <span>{scanProgress}/{totalScanSteps}</span>
                                </div>
                                <Progress value={(scanProgress / totalScanSteps) * 100} className="w-full" />
                                <div className="text-center text-xs text-muted-foreground">
                                    Scan all {totalScanSteps} QR codes from subspace on desktop
                                </div>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setScanning(false)}
                            className="w-full"
                        >
                            Cancel Scanning
                        </Button>
                    </> : <>
                        <div className="flex gap-1 justify-evenly items-center">
                            <Button variant="ghost" className="text-start !px-4 border border-border/50 h-12 justify-between"
                                onClick={() => handleLoginOptionClicked(ConnectionStrategies.WAuth, WAuthProviders.Discord)}
                            >
                                <img src={discord} className="w-8 h-8 p-1 ml-auto aspect-square object-contain" />
                            </Button>
                            <Button variant="ghost" className="text-start !px-4 border border-border/50 h-12 justify-between"
                                onClick={() => handleLoginOptionClicked(ConnectionStrategies.WAuth, WAuthProviders.Github)}
                            >
                                <img src={github} className="w-8 h-8 p-1 ml-auto aspect-square object-contain invert dark:invert-0" />
                            </Button>
                            <Button variant="ghost" className="text-start !px-4 border border-border/50 h-12 justify-between"
                                onClick={() => handleLoginOptionClicked(ConnectionStrategies.WAuth, WAuthProviders.Google)}
                            >
                                <img src={google} className="w-8 h-8 p-1 ml-auto aspect-square object-contain" />
                            </Button>
                            <Button variant="ghost" className="text-start !px-4 border border-border/50 h-12 justify-between"
                                onClick={() => handleLoginOptionClicked(ConnectionStrategies.WAuth, WAuthProviders.X)}
                            >
                                <img src={x} className="w-8 h-8 p-1 ml-auto rounded aspect-square object-contain" />
                            </Button>
                            {/* <Button variant="ghost" className="text-start !px-4 border border-border/50 h-12 p-0 justify-between"

                            >
                                <User2 className="w-8 h-8 ml-auto aspect-square object-contain" />
                                <span className="text-muted-foreground/50 text-xs">guest user</span>
                            </Button> */}
                        </div>
                        <div className="flex gap-1 justify-evenly items-center flex-col md:flex-row w-full">
                            {window && window.arweaveWallet && window.arweaveWallet.walletName == "ArConnect" &&
                                <Button variant="ghost" className="text-start justify-start border border-border/50 h-12 grow"
                                    onClick={() => handleLoginOptionClicked(ConnectionStrategies.ArWallet)}
                                >
                                    <div>Arweave Wallet</div>
                                    <img src={arweave} className="w-8 h-8 p-0.5 ml-auto aspect-square opacity-60 group-hover:opacity-100 transition-opacity duration-200 invert dark:invert-0" />
                                </Button>
                            }
                            <Button variant="ghost" className="text-start grow justify-start border border-border/50 h-12"
                                onClick={() => {
                                    if (wanderInstance) wanderInstance.open()
                                    else handleLoginOptionClicked(ConnectionStrategies.WanderConnect)
                                    clickClose()
                                }}
                            >
                                <div>Wander Connect</div>
                                <img src={wander} className="w-8 h-8 ml-auto aspect-square object-contain" />
                            </Button>
                        </div>
                        {/* {isMobileDevice && <Button variant="ghost" className="text-start !px-4 border border-border/50 h-12 justify-between"
                            onClick={() => setScanning(true)}
                        >
                            <div>Scan QR Code</div>
                            <QrCode className="!h-8 !w-8 p-0.5" />
                        </Button>} */}
                        {/* <Button disabled variant="ghost" className="text-start !px-4 border border-border/50 h-12 justify-between">
                            <div>Metamask</div>
                            <span className="text-muted-foreground/50 text-xs">(coming soon)</span>
                            <img src={metamask} className="w-8 h-8 p-1 ml-auto aspect-square object-contain" />
                        </Button> */}

                        {process.env.NODE_ENV === "development" && <div className="text-center text-muted-foreground/50 text-xs h-[0.5px] bg-foreground/50 w-[20px] mx-auto" />}

                        {process.env.NODE_ENV === "development" && <Button variant="ghost" className="text-start !px-4 border border-border/50 h-12 justify-between"
                            onClick={() => {
                                // prompt input for a jwk string
                                const jwk = prompt("Enter the JWK string")
                                if (jwk) {
                                    const jwkObj = JSON.parse(jwk)
                                    jwkObj.kty = "RSA"
                                    jwkObj.e = "AQAB"
                                    handleLoginOptionClicked(ConnectionStrategies.ScannedJWK, jwkObj)
                                }
                            }}
                        >
                            simulate delegation <span className="text-muted-foreground/50 text-xs">(dev only)</span>
                        </Button>}
                        {process.env.NODE_ENV === "development" && <Button variant="ghost" className="text-start !px-4 border border-border/50 h-12 justify-between"
                            onClick={() => {
                                walletActions.disconnect()
                            }}
                        >
                            clear login <span className="text-muted-foreground/50 text-xs">(dev only)</span>
                        </Button>}
                    </>}
                </DialogDescription>
            </DialogContent>
        </Dialog>
    )
}