import { useEffect, useRef } from "react"
import { useWallet } from "./use-wallet"
import { useSubspaceActions } from "./use-subspace"
import { Subspace, Utils } from "@subspace-protocol/sdk"

/**
 * Custom hook that polls the logged-in user's profile every 20 seconds
 * to keep the servers list and friends list updated
 */
export function useProfilePolling() {
    const { address, connected } = useWallet()
    const subspaceActions = useSubspaceActions()
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        Utils.log({ type: "debug", label: "Profile Polling Effect triggered", data: { connected, address, SubspaceInitialized: Subspace.initialized } })
        // Only start polling if user is connected, has an address, and Subspace is initialized
        if (connected && address && Subspace.initialized) {
            Utils.log({ type: "debug", label: "Profile Polling Starting", data: address })

            const pollProfile = async () => {
                try {
                    Utils.log({ type: "debug", label: "Polling Profile", data: address })
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
                    Utils.log({ type: "debug", label: "Profile Polling Stopping", data: { address, interval: pollingIntervalRef.current } })
                    clearInterval(pollingIntervalRef.current)
                    pollingIntervalRef.current = null
                }
            }
        } else {
            // Clear any existing polling when user is not connected
            if (pollingIntervalRef.current) {
                Utils.log({ type: "debug", label: "Profile Polling Clearing interval - user not connected", data: { interval: pollingIntervalRef.current } })
                clearInterval(pollingIntervalRef.current)
                pollingIntervalRef.current = null
            }
        }
    }, [connected, address, subspaceActions, Subspace.initialized])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current)
            }
        }
    }, [])
}
