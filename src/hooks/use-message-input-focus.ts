import { useRef, useCallback, useEffect } from 'react';
import { useGlobalState } from './use-global-state';

export function useMessageInputFocus() {
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const { activeServerId, activeChannelId } = useGlobalState();

    const focusInput = useCallback(() => {
        if (inputRef.current && !inputRef.current.disabled) {
            inputRef.current.focus();
        }
    }, []);

    // Focus when server or channel changes (when a channel becomes active)
    useEffect(() => {
        if (activeServerId && activeChannelId) {
            // Small delay to ensure the component is fully rendered
            const timeoutId = setTimeout(() => {
                focusInput();
            }, 100);

            return () => clearTimeout(timeoutId);
        }
    }, [activeServerId, activeChannelId, focusInput]);

    // Global keydown listener to focus input when user starts typing
    useEffect(() => {
        const handleGlobalKeyDown = (event: KeyboardEvent) => {
            // Don't focus if:
            // - Input is already focused
            // - User is typing in another input/textarea
            // - User pressed a modifier key or special key
            // - A dialog/modal is open
            if (
                document.activeElement === inputRef.current ||
                document.activeElement?.tagName === 'INPUT' ||
                document.activeElement?.tagName === 'TEXTAREA' ||
                event.ctrlKey ||
                event.metaKey ||
                event.altKey ||
                event.key === 'Tab' ||
                event.key === 'Escape' ||
                event.key === 'Enter' ||
                event.key.startsWith('Arrow') ||
                event.key.startsWith('F') ||
                document.querySelector('[role="dialog"]') ||
                document.querySelector('.dialog-content')
            ) {
                return;
            }

            // Only focus for printable characters
            if (event.key.length === 1 && activeServerId && activeChannelId) {
                focusInput();
            }
        };

        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => document.removeEventListener('keydown', handleGlobalKeyDown);
    }, [activeServerId, activeChannelId, focusInput]);

    return {
        inputRef,
        focusInput
    };
}
