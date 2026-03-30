"use client";

import { useEffect, useState } from "react";

const STEPS = [
  { label: "Mapping neighborhood zones",      hint: "Identifying distinct areas to compare",       durationMs: 4000  },
  { label: "Scoring work infrastructure",     hint: "Wifi, coworkings, cafés per zone",            durationMs: 6000  },
  { label: "Ranking areas for your profile",  hint: "Applying your activity and work balance",     durationMs: 8000  },
  { label: "Writing your base analysis",      hint: "Grounding the narrative in scored evidence",  durationMs: 99999 },
];

export function CityLoadingAnimation({ cityName }: { cityName?: string }) {
  const [activeStep, setActiveStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cumulative = 0;
    const timers = STEPS.slice(0, -1).map((step, idx) => {
      cumulative += step.durationMs;
      return setTimeout(() => setActiveStep(idx + 1), cumulative);
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col items-center px-6 py-16">
      {/* Pulsing ring animation */}
      <div className="relative flex items-center justify-center mb-10">
        <span className="absolute inline-flex h-16 w-16 rounded-full bg-bark/8 animate-ping" style={{ animationDuration: "2s" }} />
        <span className="absolute inline-flex h-12 w-12 rounded-full bg-bark/10 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.4s" }} />
        <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-bark">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="3" fill="white" />
            <path d="M9 2v2M9 14v2M2 9h2M14 9h2M4.22 4.22l1.42 1.42M12.36 12.36l1.42 1.42M4.22 13.78l1.42-1.42M12.36 5.64l1.42-1.42" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Title */}
      <h2 className="text-lg font-semibold text-bark text-center leading-snug">
        Analyzing your base
        {cityName ? (
          <> in <span className="text-teal">{cityName}</span></>
        ) : null}
      </h2>
      <p className="mt-1.5 text-sm text-umber/70 text-center">
        {elapsed < 8
          ? "Discovering neighborhoods and scoring each area…"
          : elapsed < 25
          ? "Ranking areas against your profile…"
          : elapsed < 40
          ? "Writing your personalized base analysis…"
          : "Almost there — finalizing your recommendation…"}
      </p>

      {/* Step pipeline */}
      <div className="mt-10 w-full max-w-sm space-y-3">
        {STEPS.map((step, idx) => {
          const isDone    = idx < activeStep;
          const isActive  = idx === activeStep;
          const isPending = idx > activeStep;

          return (
            <div
              key={step.label}
              className={`flex items-start gap-3 rounded-xl px-4 py-3 transition-all duration-500 ${
                isActive  ? "bg-bark/5 border border-bark/10" :
                isDone    ? "opacity-50" :
                            "opacity-25"
              }`}
            >
              {/* Step icon */}
              <div className="mt-0.5 flex-shrink-0">
                {isDone ? (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-teal">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                ) : isActive ? (
                  <div className="flex h-5 w-5 items-center justify-center">
                    <span className="h-2.5 w-2.5 rounded-full bg-bark animate-pulse" style={{ animationDuration: "1s" }} />
                  </div>
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center">
                    <span className="h-2 w-2 rounded-full bg-dune" />
                  </div>
                )}
              </div>

              {/* Step text */}
              <div className="min-w-0">
                <p className={`text-sm font-medium leading-snug ${isActive ? "text-bark" : isDone ? "text-umber" : "text-umber/40"}`}>
                  {step.label}
                </p>
                {isActive && (
                  <p className="mt-0.5 text-xs text-umber/60 leading-snug">{step.hint}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time hint */}
      <p className="mt-8 text-xs text-umber/40 text-center">
        {elapsed > 0 ? `${elapsed}s elapsed · ` : ""}Usually 20–45 seconds
      </p>
    </div>
  );
}
