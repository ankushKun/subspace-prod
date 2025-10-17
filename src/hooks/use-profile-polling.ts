import { useEffect, useRef } from "react"
import { useWallet } from "./use-wallet"
import { useSubspaceActions } from "./use-subspace"
import { Subspace } from "@subspace-protocol/sdk"

/**
 * Custom hook that polls the logged-in user's profile every 20 seconds
 * to keep the servers list and friends list updated
 */
export function useProfilePolling() {
    const { address, connected } = useWallet()
    const subspaceActions = useSubspaceActions()
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        console.log("[useProfilePolling] Effect triggered - connected:", connected, "address:", address, "Subspace.initialized:", Subspace.initialized)
        // Only start polling if user is connected, has an address, and Subspace is initialized
        if (connected && address && Subspace.initialized) {
            console.log("[useProfilePolling] Starting profile polling for user:", address)

            const pollProfile = async () => {
                try {
                    console.log("[useProfilePolling] Polling profile for user:", address)
                    // Fetch the current user's profile to update servers and friends lists
                    await subspaceActions.profiles.get(address)
                } catch (error) {
                    console.error("[useProfilePolling] Error polling profile:", error)
                }
            }

            // Poll immediately on first run
            pollProfile()

            // Set up interval to poll every 20 seconds (20000ms)
            pollingIntervalRef.current = setInterval(pollProfile, 20000)

            return () => {
                if (pollingIntervalRef.current) {
                    console.log("[useProfilePolling] Stopping profile polling for user:", address)
                    clearInterval(pollingIntervalRef.current)
                    pollingIntervalRef.current = null
                }
            }
        } else {
            // Clear any existing polling when user is not connected
            if (pollingIntervalRef.current) {
                console.log("[useProfilePolling] Clearing polling interval - user not connected")
                clearInterval(pollingIntervalRef.current)
                pollingIntervalRef.current = null
            }
        }
    }, [connected, address, subspaceActions])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current)
            }
        }
    }, [])
}
