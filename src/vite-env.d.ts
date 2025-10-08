/// <reference types="vite/client" />

declare global {
    interface Window {
        completePageLoading?: () => void;
    }
}

export { };