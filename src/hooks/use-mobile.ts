import * as React from "react"

const MOBILE_BREAKPOINT = 768

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


export function useIsMobileDevice() {
  const [isMobileDevice, setIsMobileDevice] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkMobileDevice = () => {
      if (typeof window === 'undefined') return false

      // Check User Agent for mobile devices
      const userAgent = navigator.userAgent.toLowerCase()
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i
      const isMobileUA = mobileRegex.test(userAgent)

      // Check for touch capability
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

      // Check for standalone mode (PWA)
      const isStandalone = (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://')
      )

      // Check for mobile-specific properties
      const hasMobileProperties = (
        'orientation' in window ||
        (navigator as any).userAgentData?.mobile === true
      )

      return isMobileUA || (hasTouch && hasMobileProperties) || isStandalone
    }

    setIsMobileDevice(checkMobileDevice())
  }, [])

  return !!isMobileDevice
}