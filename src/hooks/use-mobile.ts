import * as React from "react"

// Discord-like breakpoints for optimal mobile experience
const MOBILE_BREAKPOINT = 768   // Mobile phones
const TABLET_BREAKPOINT = 1024  // Tablets
const DESKTOP_BREAKPOINT = 1100 // Desktop (original threshold)

export function useIsMobile() {
    const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

    React.useEffect(() => {
        const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
        const onChange = () => {
            setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
        }
        mql.addEventListener("change", onChange)
        setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
        return () => mql.removeEventListener("change", onChange)
    }, [])

    return !!isMobile
}

export function useIsTablet() {
    const [isTablet, setIsTablet] = React.useState<boolean | undefined>(undefined)

    React.useEffect(() => {
        const mql = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${TABLET_BREAKPOINT - 1}px)`)
        const onChange = () => {
            const width = window.innerWidth
            setIsTablet(width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT)
        }
        mql.addEventListener("change", onChange)
        const width = window.innerWidth
        setIsTablet(width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT)
        return () => mql.removeEventListener("change", onChange)
    }, [])

    return !!isTablet
}

export function useIsDesktop() {
    const [isDesktop, setIsDesktop] = React.useState<boolean | undefined>(undefined)

    React.useEffect(() => {
        const mql = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`)
        const onChange = () => {
            setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT)
        }
        mql.addEventListener("change", onChange)
        setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT)
        return () => mql.removeEventListener("change", onChange)
    }, [])

    return !!isDesktop
}

// Enhanced device detection for better mobile UX
export function useIsMobileDevice() {
    const [isMobileDevice, setIsMobileDevice] = React.useState<boolean>(false)

    React.useEffect(() => {
        // Check if we're in browser environment
        if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
            setIsMobileDevice(/iPad|iPhone|iPod|Android|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent))
        }
    }, [])

    return isMobileDevice
}

// Touch capability detection
export function useHasTouchScreen() {
    const [hasTouch, setHasTouch] = React.useState<boolean>(false)

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            setHasTouch(
                'ontouchstart' in window ||
                navigator.maxTouchPoints > 0 ||
                window.matchMedia('(pointer: coarse)').matches
            )
        }
    }, [])

    return hasTouch
}

// Combined hook for mobile optimization decisions
export function useMobileContext() {
    const isMobile = useIsMobile()
    const isTablet = useIsTablet()
    const isDesktop = useIsDesktop()
    const isMobileDevice = useIsMobileDevice()
    const hasTouch = useHasTouchScreen()

    return {
        isMobile,
        isTablet,
        isDesktop,
        isMobileDevice,
        hasTouch,
        // Convenience flags
        isCompact: isMobile || isTablet,  // Show compact layout
        shouldUseOverlays: isMobile,      // Use overlay navigation instead of sidebars
        shouldUseTouchSizes: isMobile || hasTouch, // Use larger touch targets
    }
}