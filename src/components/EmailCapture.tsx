"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

interface Props {
  context: "city_not_found" | "post_payment" | "homepage";
  citySlug?: string;
  cityName?: string;
  neighborhoodSlug?: string;
  /** Heading text */
  prompt: string;
}

export function EmailCapture({
  context,
  citySlug,
  cityName,
  neighborhoodSlug,
  prompt,
}: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      setErrorMsg("Enter a valid email.");
      return;
    }
    setErrorMsg("");
    setStatus("loading");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, context, citySlug, neighborhoodSlug }),
      });

      if (res.ok || res.status === 409) {
        // 409 = already subscribed — treat as success silently
        setStatus("done");
        track("email_captured", { context, city_slug: citySlug });
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data?.error ?? "Something went wrong. Try again.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Something went wrong. Try again.");
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-dune bg-white px-6 py-5">
        <p className="text-sm font-medium text-bark">Done ✓</p>
        <p className="mt-1 text-sm text-umber">
          We&rsquo;ll let you know when there&rsquo;s an update.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dune bg-white px-6 py-5">
      <p className="text-sm font-medium text-bark">{prompt}</p>
      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="flex-1 rounded-lg border border-dune bg-cream px-4 py-2.5 text-sm text-bark placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="shrink-0 rounded-lg bg-bark px-5 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {status === "loading" ? "…" : "Notify me →"}
        </button>
      </form>
      {errorMsg && (
        <p className="mt-2 text-xs text-red-500">{errorMsg}</p>
      )}
      <p className="mt-2 text-xs text-stone-400">No newsletters. Product updates only.</p>
      {cityName && (
        <p className="mt-0.5 text-xs text-stone-400">
          We&rsquo;ll email you when we update {cityName}.
        </p>
      )}
    </div>
  );
}
