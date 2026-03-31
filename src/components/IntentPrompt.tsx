"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { track } from "@/lib/analytics";
import type { StayPurpose, WorkStyle, DailyBalance } from "@/types";
import { IntentLoadingCard } from "@/components/IntentLoadingCard";

type IntentStep = "purpose" | "workStyle" | "dailyBalance";

const PURPOSES: { value: StayPurpose; label: string; color: string }[] = [
  { value: "surf",       label: "Surf",       color: "#E07A5F" },
  { value: "dive",       label: "Dive",       color: "#5DA9E9" },
  { value: "hike",       label: "Hike",       color: "#6AA84F" },
  { value: "yoga",       label: "Yoga",       color: "#9B6AD6" },
  { value: "kite",       label: "Kite",       color: "#F2A93B" },
  { value: "work_first", label: "Work first", color: "#8FB7B3" },
  { value: "exploring",  label: "Exploring",  color: "#2E2A26" },
];

const PURPOSE_MAP = Object.fromEntries(PURPOSES.map((p) => [p.value, p])) as unknown as Record<
  StayPurpose, { label: string; color: string }
>;

function PurposeGlyph({ purpose }: { purpose: StayPurpose }) {
  if (purpose === "surf") {
    return <span className="text-[10px] font-semibold">S</span>;
  }
  if (purpose === "dive") {
    return <span className="text-[10px] font-semibold">D</span>;
  }
  if (purpose === "hike") {
    return <span className="text-[10px] font-semibold">H</span>;
  }
  if (purpose === "yoga") {
    return <span className="text-[10px] font-semibold">Y</span>;
  }
  if (purpose === "kite") {
    return <span className="text-[10px] font-semibold">K</span>;
  }
  if (purpose === "work_first") {
    return <span className="text-[10px] font-semibold">W</span>;
  }
  return <span className="text-[10px] font-semibold">E</span>;
}

const WORK_STYLES: { value: WorkStyle; label: string; hint: string }[] = [
  { value: "light",    label: "Light",    hint: "A few focused hours" },
  { value: "balanced", label: "Balanced", hint: "Half workdays" },
  { value: "heavy",    label: "Heavy",    hint: "Full remote" },
];

const DAILY_BALANCES: { value: DailyBalance; label: string; hint: string }[] = [
  { value: "purpose_first", label: "Purpose-first", hint: "Shape days around why I came" },
  { value: "balanced",      label: "Balanced",      hint: "Work and life both matter" },
  { value: "work_first",    label: "Work-first",    hint: "Protect work first" },
];

interface Props {
  citySlug: string;
  cityName: string;
  /**
   * Pre-filled purpose from URL — when the user arrived from Browse (purpose
   * known from category) but workStyle is missing. Skips the purpose step.
   */
  prefillPurpose?: StayPurpose | null;
}

export function IntentPrompt({ citySlug, cityName, prefillPurpose }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialPurpose = prefillPurpose ?? null;
  const initialStep: IntentStep = initialPurpose ? "workStyle" : "purpose";

  const [step, setStep] = useState<IntentStep>(initialStep);
  const [selPurpose, setSelPurpose] = useState<StayPurpose | null>(initialPurpose);
  const [selWorkStyle, setSelWorkStyle] = useState<WorkStyle | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  if (dismissed) return null;

  function commit(p: StayPurpose, w: WorkStyle, b: DailyBalance) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("purpose", p);
    params.set("workStyle", w);
    params.set("dailyBalance", b);
    track("intent_prompt_completed", {
      city_slug: citySlug,
      city_name: cityName,
      purpose: p,
      work_style: w,
      daily_balance: b,
      source: "city_page_prompt",
    });
    setLoading(true);
    router.replace(`${pathname}?${params.toString()}`);
  }

  function handlePurposeSelect(p: StayPurpose) {
    setSelPurpose(p);
    track("intent_purpose_selected", { city_slug: citySlug, purpose: p });
    setStep("workStyle");
  }

  function handleWorkStyleSelect(w: WorkStyle) {
    setSelWorkStyle(w);
    if (!selPurpose) return;
    if (selPurpose === "work_first") {
      commit(selPurpose, w, "work_first");
    } else {
      setStep("dailyBalance");
    }
  }

  function handleDailyBalanceSelect(b: DailyBalance) {
    if (!selPurpose || !selWorkStyle) return;
    commit(selPurpose, selWorkStyle, b);
  }

  function handleDismiss() {
    track("intent_prompt_dismissed", { city_slug: citySlug });
    setDismissed(true);
  }

  // Loading state — shown after final selection
  if (loading && selPurpose && selWorkStyle) {
    return (
      <IntentLoadingCard
        purpose={selPurpose}
        workStyle={selWorkStyle}
        cityName={cityName}
      />
    );
  }

  const purposeInfo = selPurpose ? PURPOSE_MAP[selPurpose] : null;
  const workInfo = selWorkStyle ? WORK_STYLES.find((w) => w.value === selWorkStyle) : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-dune bg-white shadow-sm">
      <div className="h-[3px] bg-bark" />

      <div className="p-5">
        {/* Step header */}
        <div className="mb-4">
          {step === "purpose" && (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-umber">
                Shape this stay
              </p>
              <p className="mt-1 text-sm font-semibold text-bark">
                What brought you to {cityName}?
              </p>
            </>
          )}
          {step === "workStyle" && (
            <>
              {prefillPurpose ? (
                <>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-umber">
                    For {PURPOSE_MAP[prefillPurpose].label} in {cityName}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-bark">
                    How work-heavy is this stay?
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full text-white"
                      style={{ background: purposeInfo?.color ?? "#2E2A26" }}
                      aria-hidden="true"
                    >
                      {selPurpose ? <PurposeGlyph purpose={selPurpose} /> : null}
                    </span>
                    <span className="text-sm font-semibold text-bark">{purposeInfo?.label}</span>
                    <span className="text-umber/40 select-none">·</span>
                    <span className="text-sm font-semibold text-bark">How work-heavy is this stay?</span>
                  </div>
                  <button
                    onClick={() => setStep("purpose")}
                    className="mt-1 text-[11px] text-umber/40 hover:text-umber/70 transition-colors"
                  >
                    ← Back
                  </button>
                </>
              )}
            </>
          )}
          {step === "dailyBalance" && (
            <>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full text-white"
                  style={{ background: purposeInfo?.color ?? "#2E2A26" }}
                  aria-hidden="true"
                >
                  {selPurpose ? <PurposeGlyph purpose={selPurpose} /> : null}
                </span>
                <span className="text-sm font-semibold text-bark">{purposeInfo?.label}</span>
                <span className="text-umber/40 select-none">·</span>
                <span className="text-sm text-umber">{workInfo?.label}</span>
                <span className="text-umber/40 select-none">·</span>
                <span className="text-sm font-semibold text-bark">How do you want this stay to feel?</span>
              </div>
              <button
                onClick={() => setStep("workStyle")}
                className="mt-1 text-[11px] text-umber/40 hover:text-umber/70 transition-colors"
              >
                ← Back
              </button>
            </>
          )}
        </div>

        {/* Step content */}
        {step === "purpose" && (
          <>
            <div className="grid grid-cols-4 gap-2">
              {PURPOSES.map(({ value, label, color }) => (
                <button
                  key={value}
                  onClick={() => handlePurposeSelect(value)}
                  className="flex flex-col items-center gap-1 rounded-xl border border-dune bg-white px-1.5 py-2.5 text-center transition-all hover:border-bark/40 hover:bg-cream active:scale-95"
                >
                  <span
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-white"
                    style={{ background: color }}
                    aria-hidden="true"
                  >
                    <PurposeGlyph purpose={value} />
                  </span>
                  <span className="text-[11px] font-medium text-bark leading-tight">{label}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={handleDismiss}
                className="text-[11px] text-umber/40 hover:text-umber/70 transition-colors"
              >
                Skip — just show me the city
              </button>
            </div>
          </>
        )}

        {step === "workStyle" && (
          <div className="grid grid-cols-3 gap-2">
            {WORK_STYLES.map(({ value, label, hint }) => (
              <button
                key={value}
                onClick={() => handleWorkStyleSelect(value)}
                className="flex flex-col rounded-xl border border-dune bg-white px-3 py-3 text-left transition-all hover:border-bark/40 hover:bg-cream active:scale-95"
              >
                <span className="text-sm font-semibold text-bark">{label}</span>
                <span className="mt-0.5 text-[11px] leading-4 text-umber">{hint}</span>
              </button>
            ))}
          </div>
        )}

        {step === "dailyBalance" && (
          <div className="grid grid-cols-3 gap-2">
            {DAILY_BALANCES.map(({ value, label, hint }) => (
              <button
                key={value}
                onClick={() => handleDailyBalanceSelect(value)}
                className="flex flex-col rounded-xl border border-dune bg-white px-3 py-3 text-left transition-all hover:border-bark/40 hover:bg-cream active:scale-95"
              >
                <span className="text-sm font-semibold text-bark">{label}</span>
                <span className="mt-0.5 text-[11px] leading-4 text-umber">{hint}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
