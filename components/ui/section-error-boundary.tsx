"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";

interface SectionErrorBoundaryProps {
  children: ReactNode;
  name: string;
  fallback?: ReactNode;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class SectionErrorBoundary extends Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  constructor(props: SectionErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): SectionErrorBoundaryState {
    return { hasError: true, error };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {
    // Silent per project convention -- no console logging
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-800">
              Something went wrong in {this.props.name}
            </p>
            <button
              onClick={this.handleRetry}
              className="mt-3 rounded-md bg-red-100 px-4 py-2 text-sm text-red-700 hover:bg-red-200"
            >
              Try again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
