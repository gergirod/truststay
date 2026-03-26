import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "#2E2A26",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          fontSize: 18,
          fontWeight: 700,
          color: "#8FB7B3",
          letterSpacing: "-1px",
        }}
      >
        Ts
      </div>
    ),
    { ...size }
  );
}
