"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

interface Props {
  event: string;
  properties?: Record<string, unknown>;
}

/**
 * Fires a single analytics event on mount and renders nothing.
 * Props are captured at mount time via refs — no re-fires on re-render.
 */
export function AnalyticsEvent({ event, properties }: Props) {
  const eventRef = useRef(event);
  const propsRef = useRef(properties);

  useEffect(() => {
    track(eventRef.current, propsRef.current);
  }, []);

  return null;
}
