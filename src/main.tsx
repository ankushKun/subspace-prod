import { createRoot } from 'react-dom/client'
import './index.css'
import { HashRouter, Route, Routes } from "react-router";
import { ThemeProvider } from '@/components/theme-provider';
import SubspaceLanding from './routes/landing';
import Server from '@/routes/server';
import Settings from '@/routes/settings';
import ServerSettings from '@/routes/server/settings';
import { ConnectionStrategies, useWallet } from './hooks/use-wallet';
import { useEffect } from 'react';
import { useCallback } from 'react';

function App() {
    const connect = useWallet((state) => state.actions.connect)
    const strategy = useWallet((state) => state.connectionStrategy)
    const provider = useWallet((state) => state.provider)
    const jwk = useWallet((state) => state.jwk)

    const handleConnection = async function () {
        if (!strategy) return

        try {
            if (strategy === ConnectionStrategies.ScannedJWK) {
                await connect({ strategy, jwk })
                console.log("connected with jwk")
            } else if (strategy === ConnectionStrategies.WAuth) {
                await connect({ strategy, provider })
                console.log("connected with strategy", strategy, provider)
            } else {
                await connect({ strategy })
                console.log("connected with strategy", strategy)
            }
        } catch (error) {
            console.error("Connection failed:", error)
        }
    }

    useEffect(() => {
        handleConnection()
    }, [handleConnection])



    return <>
        <ThemeProvider>
            <HashRouter>
                <Routes>
                    <Route path="/" element={<SubspaceLanding />} />
                    <Route path="/app">
                        <Route index element={<Server />} />
                        <Route path="settings" element={<Settings />} />
                        {/* --- */}
                        <Route path=":serverId" element={<Server />} />
                        <Route path=":serverId/:channelId" element={<Server />} />
                        <Route path=":serverId/settings" element={<ServerSettings />} />
                    </Route>
                </Routes>
            </HashRouter>
        </ThemeProvider>
    </>
}

createRoot(document.getElementById('root')!).render(<App />)
