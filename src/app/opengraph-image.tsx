import { ImageResponse } from "next/og";

// Social card: the canvas question set in the universe — no claims.
export const alt = "Faraday Studio — What do you want to create?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "radial-gradient(circle at 70% 55%, #2a2a2e 0%, #050506 38%, #000 70%)",
          color: "#fbfbfa",
        }}
      >
        <div style={{ fontSize: 22, letterSpacing: 6, fontWeight: 600 }}>FARADAY STUDIO</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, lineHeight: 1, letterSpacing: -4 }}>What do you</div>
          <div style={{ fontSize: 96, lineHeight: 1, letterSpacing: -4 }}>want to create?</div>
          <div style={{ fontSize: 26, marginTop: 28, color: "#9a9aa0", letterSpacing: 1 }}>Imagine. Type. Draw.</div>
        </div>
        <div style={{ fontSize: 18, color: "#77777d", letterSpacing: 4 }}>EARLY ACCESS</div>
      </div>
    ),
    size
  );
}
