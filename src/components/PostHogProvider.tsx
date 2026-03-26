"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    // Both vars must be present — do not fall back to any default host
    if (!token || !host) return;
    posthog.init(token, {
      api_host: host,
      capture_pageview: false,   // page views are fired manually
      capture_pageleave: false,
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
