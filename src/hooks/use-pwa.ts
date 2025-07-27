// use pwa hook

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

interface UsePWAReturn {
    isInstallable: boolean;
    isInstalled: boolean;
    showInstallPrompt: () => Promise<void>;
    installPromptOutcome: 'accepted' | 'dismissed' | null;
    isStandalone: boolean;
    debugInfo: {
        hasServiceWorker: boolean;
        hasManifest: boolean;
        isSecure: boolean;
        userAgent: string;
        deferredPromptAvailable: boolean;
    };
}

export const usePWA = (): UsePWAReturn => {
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [installPromptOutcome, setInstallPromptOutcome] = useState<'accepted' | 'dismissed' | null>(null);

    // Check if app is running in standalone mode (installed)
    const isStandalone = typeof window !== 'undefined' && (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://')
    );

    // Debug information
    const debugInfo = {
        hasServiceWorker: 'serviceWorker' in navigator,
        hasManifest: typeof document !== 'undefined' && !!document.querySelector('link[rel="manifest"]'),
        isSecure: typeof window !== 'undefined' && (window.location.protocol === 'https:' || window.location.hostname === 'localhost'),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        deferredPromptAvailable: !!deferredPrompt
    };

    useEffect(() => {

        // Check if already installed
        setIsInstalled(isStandalone);

        const handleBeforeInstallPrompt = (e: Event) => {

            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();

            const beforeInstallPromptEvent = e as BeforeInstallPromptEvent;

            setDeferredPrompt(beforeInstallPromptEvent);
            setIsInstallable(true);

        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setIsInstallable(false);
            setDeferredPrompt(null);
        };

        // Listen for the beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Listen for the appinstalled event
        window.addEventListener('appinstalled', handleAppInstalled);

        // Check if app is already installable (some browsers fire the event before listeners are added)
        if ('getInstalledRelatedApps' in navigator) {
            (navigator as any).getInstalledRelatedApps().then((relatedApps: any[]) => {
                if (relatedApps.length > 0) {
                    setIsInstalled(true);
                }
            }).catch((error: any) => {
                // Ignore errors - this API is not widely supported
            });
        }

        // Additional PWA criteria checks
        const checkPWACriteria = async () => {

            // Check service worker
            if ('serviceWorker' in navigator) {
                try {
                    const registration = await navigator.serviceWorker.getRegistration();
                } catch (error) {
                    console.error('Service Worker check failed:', error);
                }
            }

            // Check manifest
            const manifestLink = document.querySelector('link[rel="manifest"]');
            if (manifestLink) {

                // Try to fetch and validate manifest
                try {
                    const response = await fetch((manifestLink as HTMLLinkElement).href);
                    const manifest = await response.json();

                    // Check required manifest fields
                    const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
                    const missingFields = requiredFields.filter(field => !manifest[field]);
                    if (missingFields.length > 0) {
                        console.warn('Manifest missing required fields:', missingFields);
                    }

                    // Check icons
                    if (manifest.icons && manifest.icons.length > 0) {
                        const hasRequiredSizes = manifest.icons.some((icon: any) =>
                            icon.sizes && (icon.sizes.includes('192x192') || icon.sizes.includes('512x512'))
                        );
                    }
                } catch (error) {
                    console.error('Failed to fetch or parse manifest:', error);
                }
            }
        };

        checkPWACriteria();

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, [isStandalone]);

    const showInstallPrompt = useCallback(async (): Promise<void> => {

        if (!deferredPrompt) {
            return;
        }

        try {

            // Show the install prompt
            await deferredPrompt.prompt();

            // Wait for the user to respond to the prompt
            const { outcome } = await deferredPrompt.userChoice;

            setInstallPromptOutcome(outcome);

            if (outcome === 'accepted') {
                // User accepted the install prompt
            } else {
                // User dismissed the install prompt
            }

            // Clear the deferredPrompt so it can only be used once
            setDeferredPrompt(null);
            setIsInstallable(false);
        } catch (error) {
            console.error('Error showing install prompt:', error);
        }
    }, [deferredPrompt, debugInfo]);

    return {
        isInstallable,
        isInstalled,
        showInstallPrompt,
        installPromptOutcome,
        isStandalone,
        debugInfo,
    };
};

