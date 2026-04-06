"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  resetKeys?: Array<string | number | boolean | null | undefined>;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  componentDidUpdate(prevProps: Props) {
    if (!this.state.hasError) return;
    const prev = prevProps.resetKeys ?? [];
    const next = this.props.resetKeys ?? [];
    if (prev.length !== next.length) {
      this.setState({ hasError: false, error: null });
      return;
    }
    for (let i = 0; i < next.length; i += 1) {
      if (prev[i] !== next[i]) {
        this.setState({ hasError: false, error: null });
        return;
      }
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Something went wrong</h2>
          <p className="text-sm text-gray-500 mb-4">
            This section encountered an error. Your other data is safe.
          </p>
          {this.state.error?.message && (
            <p className="text-xs text-gray-400 mb-4 max-w-md break-words">{this.state.error.message}</p>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
