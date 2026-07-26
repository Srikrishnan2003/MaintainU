import { useCallback } from "react";

export function useErrorLogger() {
    const logError = useCallback((error: Error, context: string) => {
        if (process.env.NODE_ENV === "production") {
            // TO INTEGRATE ERROR MONITORING:
            // Replace this block with your error reporting service
            // e.g. Sentry.captureException(error, { extra: { context } })
            console.error(error);
        } else {
            console.error(`[Error Boundary] ${context}:`, error);
        }
    }, []);

    return logError;
}
