import { createContext, useContext, useEffect, useState, useMemo } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
    children: React.ReactNode
    defaultTheme?: Theme
    storageKey?: string
}

type ThemeProviderState = {
    theme: Theme
    setTheme: (theme: Theme) => void
    toggleTheme: () => void
}

const initialState: ThemeProviderState = {
    theme: "system",
    setTheme: () => null,
    toggleTheme: () => null
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
    children,
    defaultTheme = "dark", // Force dark as default
    storageKey = "vite-ui-theme",
    ...props
}: ThemeProviderProps) {
    // Force dark theme - ignore localStorage and system preferences
    const [theme] = useState<Theme>("dark")

    useEffect(() => {
        const root = window.document.documentElement

        // Always apply dark theme
        root.classList.remove("light", "dark", "system")
        root.classList.add("dark")

        // Also set the data attribute for better theme detection
        root.setAttribute("data-theme", "dark")
    }, [])

    // Memoize the context value - but disable theme changing
    const value = useMemo(() => ({
        theme: "dark" as Theme, // Always return dark
        setTheme: () => {
            // No-op: prevent theme changes
            console.log("Theme switching is disabled - app is forced to dark mode")
        },
        toggleTheme: () => {
            // No-op: prevent theme changes
            console.log("Theme switching is disabled - app is forced to dark mode")
        }
    }), [])

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext)

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider")

    return context
}
