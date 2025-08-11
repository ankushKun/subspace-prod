import { useSubspace } from "@/hooks/use-subspace"
import { useWallet } from "@/hooks/use-wallet"
import { useParams } from "react-router"
import { useEffect } from "react"

// The sole purpose of this component is to fetch subspace related data from processes through api calls or dryruns
// This is not a UI component and will be invisible to the user
export default function DataLoader() {
    const { actions: subspaceActions } = useSubspace()
    const { connected, address } = useWallet()
    const { serverId, channelId, friendId } = useParams()

    useEffect(() => {
        if (connected && address) {
            subspaceActions.profile.get()
        }
    }, [connected, address])


    return <div id="data-loader" style={{ display: "none" }}></div>
}