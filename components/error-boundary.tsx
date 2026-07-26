"use client";

import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    resetError = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="p-4 w-full">
                    <div className="bg-card border border-red-500/30 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-foreground">Something went wrong</h3>
                            <p className="text-sm text-muted-foreground mt-1">We're having trouble loading this section.</p>
                        </div>
                        
                        {this.state.error && process.env.NODE_ENV !== "production" && (
                            <details className="w-full text-left bg-muted/50 rounded-xl p-3 text-xs overflow-auto max-h-32 mt-2 border border-border">
                                <summary className="cursor-pointer font-semibold text-muted-foreground mb-1">Error details</summary>
                                <pre className="text-red-500/80 mt-2 font-mono whitespace-pre-wrap">{this.state.error.message}</pre>
                            </details>
                        )}
                        
                        <button
                            onClick={this.resetError}
                            className="mt-2 flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:opacity-90 transition-all shadow-sm"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Try again
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
