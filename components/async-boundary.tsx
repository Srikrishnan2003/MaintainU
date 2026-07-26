"use client";

import React, { Suspense } from "react";
import { ErrorBoundary } from "./error-boundary";

interface AsyncBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    errorFallback?: React.ReactNode;
    onError?: (error: Error, info: React.ErrorInfo) => void;
}

const DefaultSuspenseFallback = () => (
    <div className="w-full h-12 bg-muted/30 animate-pulse rounded-2xl" />
);

export function AsyncBoundary({ children, fallback, errorFallback, onError }: AsyncBoundaryProps) {
    return (
        <ErrorBoundary fallback={errorFallback} onError={onError}>
            <Suspense fallback={fallback || <DefaultSuspenseFallback />}>
                {children}
            </Suspense>
        </ErrorBoundary>
    );
}
