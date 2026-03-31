"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { track } from "@/lib/analytics";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RestoreUnlocksCard() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const restored = searchParams.get("restored") === "1";
  const restoredCount = searchParams.get("restoredCount");
  const restoreState = searchParams.get("restore");

  useEffect(() => {
    if (restored) {
      track("unlock_restore_completed", {
        restored_count: Number(restoredCount ?? "0"),
        path: pathname ?? "/",
      });
      return;
    }

    if (restoreState === "invalid" || restoreState === "empty") {
      track("unlock_restore_failed", {
        reason: restoreState,
        path: pathname ?? "/",
      });
    }
  }, [restored, restoredCount, restoreState, pathname]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setErrorMessage("Enter a valid email.");
      return;
    }
    setErrorMessage("");
    setStatus("loading");
    track("unlock_restore_requested", { path: pathname ?? "/" });

    try {
      const response = await fetch("/api/unlocks/restore/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          nextPath: pathname ?? "/",
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setErrorMessage(data?.error ?? "Could not send restore link.");
        setStatus("error");
        track("unlock_restore_failed", {
          reason: data?.error ?? "request_failed",
          path: pathname ?? "/",
        });
        return;
      }

      setStatus("sent");
      track("unlock_restore_email_sent", { path: pathname ?? "/" });
    } catch {
      setErrorMessage("Could not send restore link.");
      setStatus("error");
      track("unlock_restore_failed", { reason: "network_error", path: pathname ?? "/" });
    }
  }

  return (
    <div className="rounded-2xl border border-dune bg-white px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-umber">
        Already paid before?
      </p>
      <p className="mt-1 text-sm text-bark">
        Restore your unlocked destinations on this device with your purchase email.
      </p>

      {restored && (
        <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-800">
          Unlocks restored{restoredCount ? ` (${restoredCount})` : ""}. You can now continue.
        </p>
      )}
      {restoreState === "invalid" && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          That restore link is invalid or expired. Request a new one below.
        </p>
      )}
      {restoreState === "empty" && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          No unlock purchases found for that link.
        </p>
      )}

      {status === "sent" ? (
        <p className="mt-3 rounded-lg bg-cream px-3 py-2 text-xs text-umber">
          Check your email for a one-time restore link (expires in 20 minutes).
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="flex-1 rounded-lg border border-dune bg-cream px-3 py-2 text-sm text-bark placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="rounded-lg bg-bark px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {status === "loading" ? "Sending..." : "Restore unlocks"}
          </button>
        </form>
      )}

      {errorMessage ? (
        <p className="mt-2 text-xs text-red-600">{errorMessage}</p>
      ) : null}
    </div>
  );
}
