import { create } from "zustand";
import "arweave"
import { WanderConnect } from "@wanderapp/connect";
import Arweave from "arweave";
import type { JWKInterface } from "arweave/web/lib/wallet";
import { createJSONStorage, persist } from "zustand/middleware";
import { WAuth, WAuthProviders } from "@wauth/sdk";
import { createSigner } from "@permaweb/aoconnect";
import type { AoSigner } from "@subspace-protocol/sdk";

export enum ConnectionStrategies {
    ArWallet = "ar_wallet",
    WanderConnect = "wander_connect",
    ScannedJWK = "scanned_jwk",
    GuestUser = "guest_user",
    WAuth = "wauth",
    // UploadedJWK = "uploaded_jwk" // TODO: add later
}

interface WalletState {
    address: string;
    originalAddress: string;
    connected: boolean;
    connectionStrategy: ConnectionStrategies | null;
    provider: WAuthProviders | null; // only exists if connectionStrategy is WAuth
    wanderInstance: WanderConnect | null // only exists if connectionStrategy is WanderConnect
    wauthInstance: WAuth | null // only exists if connectionStrategy is WAuth
    jwk?: JWKInterface // only exists if connectionStrategy is ScannedJWK
    actions: WalletActions
}

interface WalletActions {
    setWanderInstance: (instance: WanderConnect | null) => void
    updateAddress: (address: string) => void
    connect: ({ strategy, jwk, provider }: { strategy: ConnectionStrategies, jwk?: JWKInterface, provider?: WAuthProviders }) => Promise<void>
    disconnect: () => void
    getSigner: () => Promise<AoSigner | null>
    waitForWAuthInit: () => Promise<void>
    initializeAuthState: () => void
}

function triggerAuthenticatedEvent(address: string) {
    window.dispatchEvent(new CustomEvent("subspace-authenticated", { detail: { address } }))
}

// Helper function to wait for WAuth initialization
async function waitForWAuthInitialization(wauthInstance: WAuth): Promise<void> {
    // If already initialized (has sessionPassword or not logged in), return immediately
    if ((wauthInstance as any).sessionPassword !== null || !wauthInstance.isLoggedIn()) {
        return;
    }

    // Wait up to 3 seconds for initialization to complete
    const maxWaitTime = 3000;
    const checkInterval = 100;
    let elapsed = 0;

    while (elapsed < maxWaitTime) {
        // Check if initialization is complete
        if ((wauthInstance as any).sessionPassword !== null || !wauthInstance.isLoggedIn()) {
            return;
        }

        await new Promise(resolve => setTimeout(resolve, checkInterval));
        elapsed += checkInterval;
    }

    console.warn("WAuth initialization timeout - proceeding anyway");
}

export const useWallet = create<WalletState>()(persist((set, get) => ({
    // state
    address: "",
    originalAddress: "",
    connected: false,
    connectionStrategy: null,
    provider: null,
    wanderInstance: null,
    wauthInstance: new WAuth({ dev: process.env.NODE_ENV === "development" }),
    jwk: undefined,



    actions: {
        setWanderInstance: (instance: WanderConnect | null) => set({ wanderInstance: instance }),
        updateAddress: (address: string) => set((state) => ({ address, originalAddress: state.address })),

        waitForWAuthInit: async () => {
            const state = get();
            if (state.wauthInstance) {
                await waitForWAuthInitialization(state.wauthInstance);
            }
        },

        initializeAuthState: () => {
            const state = get();
            if (state.connected && state.connectionStrategy === ConnectionStrategies.WAuth && state.wauthInstance) {
                // Check if WAuth is actually logged in
                if (!state.wauthInstance.isLoggedIn()) {
                    console.log("[useWallet] WAuth authentication state lost, disconnecting");
                    // Clear the persisted state since authentication is lost
                    set({
                        address: "",
                        connected: false,
                        connectionStrategy: null,
                        provider: null,
                    });
                } else {
                    console.log("[useWallet] WAuth authentication state restored successfully");
                    // Try to get the wallet to ensure everything is working
                    state.wauthInstance.getWallet().then(wallet => {
                        if (wallet && wallet.address !== state.address) {
                            console.log("[useWallet] Updating address from restored wallet:", wallet.address);
                            set({ address: wallet.address });
                        }
                    }).catch(error => {
                        console.error("[useWallet] Failed to get wallet after auth restore:", error);
                        // If we can't get the wallet, the authentication might be invalid
                        set({
                            address: "",
                            connected: false,
                            connectionStrategy: null,
                            provider: null,
                        });
                    });
                }
            }
        },

        getSigner: async () => {
            const connectionStrategy = get().connectionStrategy;
            if (!connectionStrategy) return null

            switch (connectionStrategy) {
                case ConnectionStrategies.ArWallet:
                case ConnectionStrategies.WanderConnect:
                    return createSigner(window.arweaveWallet) as AoSigner
                case ConnectionStrategies.ScannedJWK:
                    {
                        const jwk = get().jwk;
                        if (!jwk) {
                            throw new Error("ScannedJWK connection strategy requires a JWK, but none was found");
                        }
                        return createSigner(jwk) as AoSigner;
                    }
                case ConnectionStrategies.WAuth:
                    {
                        const wauthInstance = get().wauthInstance;
                        if (!wauthInstance) {
                            throw new Error("WAuth instance not found");
                        }

                        // Ensure user is logged in
                        if (!wauthInstance.isLoggedIn()) {
                            // If not logged in but we think we should be, clear the state
                            const state = get();
                            if (state.connected && state.connectionStrategy === ConnectionStrategies.WAuth) {
                                console.log("[getSigner] WAuth authentication lost, clearing state");
                                set({
                                    address: "",
                                    connected: false,
                                    connectionStrategy: null,
                                    provider: null,
                                });
                            }
                            throw new Error("Not logged in to WAuth");
                        }

                        // Try to get the signer, but if wallet isn't loaded, try to refresh it first
                        try {
                            return wauthInstance.getAoSigner() as any;
                        } catch (error) {
                            if (`${error}`.includes("No wallet found")) {
                                // Try to refresh the wallet first
                                try {
                                    await wauthInstance.refreshWallet();
                                    return wauthInstance.getAoSigner() as any;
                                } catch (refreshError) {
                                    console.error("[getSigner] Failed to refresh WAuth wallet:", refreshError);
                                    throw new Error("WAuth wallet not available. Please try logging in again.");
                                }
                            }
                            throw error; // Re-throw other errors
                        }
                    }
                case ConnectionStrategies.GuestUser:
                    {
                        console.warn("Guest user mode doesn't support signing operations. Some features may be limited.");
                        return null;
                    }
                default:
                    throw new Error(`Connection Strategy ${get().connectionStrategy} does not have a signer implemented yet`)
            }
        },
        connect: async ({ strategy, jwk, provider }: { strategy: ConnectionStrategies, jwk?: JWKInterface, provider?: WAuthProviders }) => {

            // const state = get();
            // state.actions.disconnect();

            switch (strategy) {
                case ConnectionStrategies.ScannedJWK:
                    {
                        if (!jwk) throw new Error(`Connection Strategy ${strategy} requires a JWK to be passed to the connect function`)
                        const requiredKeys = ["kty", "e", "n", "d", "p", "q", "dp", "dq", "qi"];
                        const allKeysPresent = requiredKeys.every(key => jwk[key]);
                        if (!allKeysPresent) throw new Error("Missing required values in JWK");

                        const ar = new Arweave({});
                        const addr = await ar.wallets.getAddress(jwk);
                        if (!addr) throw new Error("Failed to get address");

                        set((state) => {
                            if (state.connected && state.connectionStrategy !== ConnectionStrategies.ScannedJWK) state.actions.disconnect();
                            return {
                                address: addr,
                                connected: true,
                                connectionStrategy: ConnectionStrategies.ScannedJWK,
                                wanderInstance: null,
                                jwk: jwk,
                                provider: null
                            }
                        })
                        triggerAuthenticatedEvent(addr)
                        break;
                    }
                case ConnectionStrategies.WAuth: {
                    if (!provider) throw new Error("Connection Strategy: WAuth requires a provider to be passed to the connect function")

                    let state = get();
                    if (state.connected && state.connectionStrategy !== ConnectionStrategies.WAuth) state.actions.disconnect();

                    // Check if we have a WAuth instance that's already logged in
                    if (state.wauthInstance && state.wauthInstance.isLoggedIn()) {
                        // Wait for WAuth initialization to complete before trying to get wallet
                        await waitForWAuthInitialization(state.wauthInstance);

                        try {
                            const wallet = await state.wauthInstance.getWallet()
                            if (wallet) {
                                set((state) => {
                                    return {
                                        address: wallet.address,
                                        connected: true,
                                        connectionStrategy: ConnectionStrategies.WAuth,
                                        wanderInstance: null,
                                        wauthInstance: state.wauthInstance,
                                        jwk: null,
                                        provider: provider
                                    }
                                })
                                triggerAuthenticatedEvent(wallet.address)
                                return
                            }
                        } catch (error) {
                            console.warn("Failed to get wallet from existing WAuth session:", error);
                            // Continue to fresh login
                        }
                    }

                    // Clear any existing WAuth instance and start fresh
                    if (state.wauthInstance) {
                        state.wauthInstance.logout();
                    }
                    state.wauthInstance = new WAuth({ dev: process.env.NODE_ENV === "development" })

                    const data = await state.wauthInstance.connect({ provider })
                    if (!data) return

                    const wallet = await state.wauthInstance.getWallet()
                    if (!wallet) return

                    set((state) => {
                        return {
                            address: wallet.address,
                            connected: true,
                            connectionStrategy: ConnectionStrategies.WAuth,
                            wanderInstance: null,
                            wauthInstance: state.wauthInstance,
                            jwk: null,
                            provider: provider
                        }
                    })
                    triggerAuthenticatedEvent(wallet.address)
                    break;
                }
                case ConnectionStrategies.GuestUser: {
                    // generate jwk and connect
                    break;
                }
                case ConnectionStrategies.ArWallet: {
                    if (window.arweaveWallet) {
                        if (window.arweaveWallet.walletName == "Wander Connect") {
                            set((state) => {
                                if (state.wanderInstance) state.wanderInstance.destroy();
                                return { wanderInstance: null }
                            })
                        }
                        window.arweaveWallet.connect(["SIGN_TRANSACTION", "ACCESS_ADDRESS", "ACCESS_PUBLIC_KEY"]).then(() => {
                            window.arweaveWallet.getActiveAddress().then((address) => {
                                set((state) => {
                                    if (state.connected && state.connectionStrategy !== ConnectionStrategies.ArWallet)
                                        state.actions.disconnect()
                                    window.addEventListener("walletSwitch", (e) => {
                                        set((state) => ({ address: e.detail.address }))
                                    })
                                    return {
                                        address: address,
                                        connected: true,
                                        connectionStrategy: ConnectionStrategies.ArWallet,
                                        wanderInstance: null,
                                        jwk: null,
                                        provider: null
                                    }
                                })
                                triggerAuthenticatedEvent(address)
                            })
                        })
                    } else {
                        throw new Error("Arweave Web Wallet not found");
                    }
                    break;
                }
                case ConnectionStrategies.WanderConnect: {
                    set((state) => {
                        if (state.connected && state.connectionStrategy !== ConnectionStrategies.WanderConnect)
                            state.actions.disconnect()
                        if (state.wanderInstance) {
                            state.wanderInstance.destroy()
                        }

                        const wander = new WanderConnect({
                            clientId: "FREE_TRIAL",
                            button: {
                                position: "static",
                                theme: "dark"
                            },
                            onAuth: (auth) => {
                                if (!!auth) {
                                    console.log("Wander Connect auth", auth)
                                    console.log("window.arweaveWallet", window.arweaveWallet)
                                    if (window.arweaveWallet) {
                                        window.arweaveWallet.connect(["ACCESS_ADDRESS", "SIGN_TRANSACTION", "ACCESS_PUBLIC_KEY", "ACCESS_ALL_ADDRESSES"]).then(() => {
                                            window.arweaveWallet.getActiveAddress().then((address) => {
                                                set((state) => {
                                                    return {
                                                        address: address,
                                                        connected: true,
                                                        connectionStrategy: ConnectionStrategies.WanderConnect,
                                                        wanderInstance: wander,
                                                        jwk: null,
                                                        provider: null
                                                    }
                                                })
                                                wander.close();
                                                triggerAuthenticatedEvent(address)
                                            })
                                        })
                                    }
                                }
                            }
                        })
                        console.log("Wander Connect open")
                        wander.open();
                        return { wanderInstance: wander }

                    })
                    break;
                }
            }



        },

        disconnect: (reload: boolean = false) => {
            set((state) => {
                if (state.wanderInstance) {
                    state.wanderInstance.destroy();
                }
                if (state.wauthInstance) {
                    state.wauthInstance.logout();
                    state.wauthInstance = null;
                }
                if (window.arweaveWallet) {
                    window.arweaveWallet.disconnect().then(() => {
                        window.removeEventListener("walletSwitch", (e) => { });
                    })
                }
                return {
                    address: "",
                    connected: false,
                    connectionStrategy: null,
                    wanderInstance: null,
                    wauthInstance: null,
                    jwk: undefined,
                    provider: null
                }
            })
            if (reload) window.location.reload();
        }
    }
}), {
    name: "subspace-wallet-connection",
    storage: createJSONStorage(() => localStorage),
    partialize: (state: WalletState) => ({
        address: state.connected ? state.address : "", // Only persist address if connected
        connected: state.connected, // Persist connected state
        connectionStrategy: state.connectionStrategy,
        provider: state.provider,
        jwk: state.jwk,
    })
}));
