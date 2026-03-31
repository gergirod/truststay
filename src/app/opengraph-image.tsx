import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Truststay — prepare your stay before you land";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TEAL = "#8FB7B3";
const CORAL = "#E07A5F";
const AMBER = "#F2A65A";
const BARK = "#2E2A26";
const SAND = "#F5F0EA";
const UMBER = "#5F5A54";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: SAND,
          display: "flex",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            flex: 1,
            padding: "64px 56px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {[TEAL, CORAL, AMBER].map((c, i) => (
              <div
                key={i}
                style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: c, border: "2px solid white",
                }}
              />
            ))}
            <span style={{ fontSize: 18, color: UMBER, marginLeft: 6 }}>
              truststay.co
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span
              style={{
                fontSize: 18, fontWeight: 600,
                color: TEAL, textTransform: "uppercase", letterSpacing: 3,
              }}
            >
              Remote worker location intelligence
            </span>
            <span
              style={{
                fontSize: 68,
                fontWeight: 800,
                color: BARK,
                lineHeight: 1.05,
                letterSpacing: -2,
              }}
            >
              Truststay
            </span>
            <span style={{ fontSize: 22, color: UMBER, lineHeight: 1.5 }}>
              Pick your best base for surf, work, and daily life.
            </span>
          </div>

          <div style={{ display: "flex", gap: 24 }}>
            {[
              { color: TEAL, label: "Work" },
              { color: CORAL, label: "Coffee" },
              { color: AMBER, label: "Wellbeing" },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: color }} />
                <span style={{ fontSize: 16, color: UMBER }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            width: 420,
            background: "white",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            borderLeft: "1px solid #E4DDD2",
            padding: "48px 40px",
          }}
        >
          {[
            { color: TEAL, icon: "💻", label: "Work spots" },
            { color: CORAL, icon: "☕", label: "Coffee & meals" },
            { color: AMBER, icon: "🏃", label: "Wellbeing" },
          ].map(({ color, icon, label }) => (
            <div
              key={label}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 18,
                background: `${color}18`,
                borderRadius: 16,
                padding: "16px 20px",
                border: `1.5px solid ${color}44`,
              }}
            >
              <div
                style={{
                  width: 52, height: 52, borderRadius: "50%",
                  background: color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 26,
                  flexShrink: 0,
                }}
              >
                {icon}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: BARK }}>{label}</span>
                <span style={{ fontSize: 13, color: UMBER }}>walkable · rated · curated</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
