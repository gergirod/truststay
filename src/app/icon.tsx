import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Sand background + bark "T" + coral accent dot
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
          background: "#F5F0EA",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* T crossbar */}
        <div style={{
          position: "absolute",
          top: 8, left: 8,
          width: 16, height: 3,
          borderRadius: 1.5,
          background: "#2E2A26",
        }} />
        {/* T stem */}
        <div style={{
          position: "absolute",
          top: 11, left: 14.5,
          width: 3, height: 13,
          borderRadius: 1.5,
          background: "#2E2A26",
        }} />
        {/* Coral accent dot */}
        <div style={{
          position: "absolute",
          top: 5.5, right: 5.5,
          width: 6, height: 6,
          borderRadius: "50%",
          background: "#E07A5F",
        }} />
      </div>
    ),
    { ...size }
  );
}
