import { createRoot } from 'react-dom/client'
import './index.css'
import { HashRouter, Route, Routes, useParams } from "react-router";
import { ThemeProvider } from '@/components/theme-provider';
import SubspaceLanding from './routes/landing';
import App from '@/routes/app';
import Settings from '@/routes/settings';
import ServerSettings from '@/routes/app/settings';
import { ConnectionStrategies, useWallet } from '@/hooks/use-wallet';
import { useEffect } from 'react';
import { useCallback } from 'react';
import { useGlobalState } from '@/hooks/use-global-state';
import { useSubspace } from '@/hooks/use-subspace';

function Main() {
    const { actions: subspaceActions } = useSubspace()
    const { jwk, address, connected, connectionStrategy, provider, actions: walletActions } = useWallet()

    const handleConnection = async function () {
        if (!connectionStrategy) return

        try {
            if (connectionStrategy === ConnectionStrategies.ScannedJWK) {
                await walletActions.connect({ strategy: connectionStrategy, jwk })
                console.log("connected with jwk")
            } else if (connectionStrategy === ConnectionStrategies.WAuth) {
                await walletActions.connect({ strategy: connectionStrategy, provider })
                console.log("connected with strategy", connectionStrategy, provider)
            } else {
                await walletActions.connect({ strategy: connectionStrategy })
                console.log("connected with strategy", connectionStrategy)
            }
        } catch (error) {
            console.error("Connection failed:", error)
        }
    }

    useEffect(() => {
        handleConnection()
    }, [])

    useEffect(() => {
        if (connected && address)
            subspaceActions.init()
    }, [connected, address])



    return <>
        <ThemeProvider>
            <HashRouter>
                <Routes>
                    <Route path="/" element={<SubspaceLanding />} />
                    <Route path="/app" element={<App />} />
                    <Route path="/app/settings" element={<Settings />} />
                    <Route path="/app/:serverId" element={<App />} />
                    <Route path="/app/:serverId/:channelId" element={<App />} />
                    <Route path="/app/:serverId/settings" element={<ServerSettings />} />
                </Routes>
            </HashRouter>
        </ThemeProvider>
    </>
}

createRoot(document.getElementById('root')!).render(<Main />)
