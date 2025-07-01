import { useWallet } from "@/hooks/use-wallet"

export default function Server() {
    const { address, connected, wauthInstance } = useWallet()

    return <div className="flex flex-col items-center justify-center h-screen w-screen text-center text-2xl gap-4">
        <p>Connected: {connected ? "✅" : "❌"}</p>
        <p>Email: {wauthInstance?.getAuthRecord().email}</p>
        <p>Address: {address || "NA"}</p>
    </div>
}