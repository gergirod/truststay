import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: "#F5F0EA",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
      >
        {/* Three teardrop pins — teal, coral, amber */}
        {(["#8FB7B3", "#E07A5F", "#F2A65A"] as const).map((color, i) => (
          <div
            key={color}
            style={{
              width: 36,
              height: 48,
              borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
              background: color,
              marginTop: i === 1 ? -10 : 0, // center pin slightly higher
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          />
        ))}
      </div>
    ),
    { ...size }
  );
}
