import { useEffect, useRef } from 'react';

/**
 * Calls `refetch` when the user comes back to the tab, so changes made on another
 * device (for example the mobile app) show up without a manual reload.
 */
export function useRefetchOnFocus(refetch: () => void) {
    const refetchRef = useRef(refetch);
    refetchRef.current = refetch;

    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible') refetchRef.current();
        };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);
        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onVisible);
        };
    }, []);
}
