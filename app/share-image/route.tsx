import { ImageResponse } from "next/og";
const size = { width: 1200, height: 630 };
export function GET() {
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", padding: "80px", background: "#111111", color: "white" }}>
      <div style={{ display: "flex", fontSize: 28, color: "#ff4550", letterSpacing: "8px" }}>TISA</div>
      <div style={{ display: "flex", marginTop: 32, fontSize: 78, fontWeight: 700 }}>Find the kit that feels like yours.</div>
      <div style={{ display: "flex", marginTop: 36, fontSize: 26, color: "#bbbbbb" }}>Football jerseys · Find your size · Order on WhatsApp</div>
    </div>, size,
  );
}
