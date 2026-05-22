"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ErrorBoundaryProps = {
  children: React.ReactNode;
  title?: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-950">
            {this.props.title ?? "Section unavailable"}
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Something went wrong while rendering this section.
          </p>
          <Button
            className="mt-4"
            variant="secondary"
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </Button>
        </Card>
      );
    }

    return this.props.children;
  }
}
