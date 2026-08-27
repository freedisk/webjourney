import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Capsule — aperçu de l'application de notes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

const COLORS = {
  ink: "#0e0e12",
  paper: "#f7f4ea",
  purple: "#6d35ff",
  violet: "#a855f7",
  mint: "#84f7c2",
  yellow: "#ffe56b",
  muted: "#5f6170",
};

function Line({ width, color = "#d7d2c7" }) {
  return <div style={{ width, height: 10, background: color, borderRadius: 2 }} />;
}

export default async function OpenGraphImage() {
  const logoData = await readFile(join(process.cwd(), "public", "icons", "icon-512.png"));
  const logoSource = Uint8Array.from(logoData).buffer;

  return new ImageResponse(
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "stretch",
        overflow: "hidden",
        color: COLORS.paper,
        background: COLORS.ink,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ position: "absolute", width: 520, height: 520, borderRadius: 520, background: "#281b57", top: -270, left: -170 }} />
      <div style={{ position: "absolute", width: 360, height: 360, borderRadius: 360, border: `36px solid ${COLORS.purple}`, right: -150, bottom: -180, opacity: 0.55 }} />
      <div style={{ position: "absolute", width: 310, height: 18, background: COLORS.mint, left: 0, bottom: 0 }} />
      <div style={{ position: "absolute", width: 890, height: 18, background: COLORS.purple, right: 0, bottom: 0 }} />

      <section
        style={{
          position: "relative",
          width: 680,
          padding: "62px 34px 54px 70px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ position: "relative", width: 112, height: 112, display: "flex" }}>
            <div style={{ position: "absolute", inset: 8, background: "#000000", border: `3px solid ${COLORS.paper}` }} />
            {/* ImageResponse attend une source binaire native, non un composant next/image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSource}
              alt=""
              width="104"
              height="104"
              style={{ position: "absolute", top: 0, left: 0, width: 104, height: 104, border: `3px solid ${COLORS.paper}` }}
            />
          </div>
          <div style={{ marginLeft: 26, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: 7 }}>CAPSULE</div>
            <div style={{ marginTop: 7, fontSize: 15, fontWeight: 800, letterSpacing: 4, color: COLORS.mint }}>NOTES PERSONNELLES</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 68, lineHeight: 1.02, fontWeight: 900, letterSpacing: -2 }}>Vos idées.</div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 2 }}>
            <span style={{ fontSize: 68, lineHeight: 1.02, fontWeight: 900, letterSpacing: -2, color: COLORS.violet }}>Bien rangées.</span>
            <span style={{ width: 17, height: 17, marginLeft: 14, marginTop: 34, background: COLORS.yellow }} />
          </div>
          <div style={{ maxWidth: 555, marginTop: 24, color: "#c9c5d5", fontSize: 24, lineHeight: 1.35 }}>
            Markdown, images et IA dans une application rapide, installable et privée.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          {[
            ["MARKDOWN", COLORS.purple],
            ["IMAGES", COLORS.mint],
            ["IA", COLORS.yellow],
            ["PWA", COLORS.violet],
          ].map(([label, color]) => (
            <div
              key={label}
              style={{
                marginRight: 12,
                padding: "9px 14px",
                color: label === "IMAGES" || label === "IA" ? COLORS.ink : COLORS.paper,
                background: color,
                border: `2px solid ${COLORS.paper}`,
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: 1.5,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </section>

      <section style={{ position: "relative", width: 520, padding: "56px 66px 58px 18px", display: "flex" }}>
        <div style={{ position: "absolute", top: 76, right: 45, width: 404, height: 494, background: "#000000", border: `3px solid ${COLORS.paper}` }} />
        <div
          style={{
            position: "relative",
            width: 404,
            height: 494,
            display: "flex",
            flexDirection: "column",
            color: COLORS.ink,
            background: COLORS.paper,
            border: `3px solid ${COLORS.ink}`,
          }}
        >
          <div style={{ height: 64, padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `3px solid ${COLORS.ink}` }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ width: 12, height: 12, marginRight: 8, background: COLORS.purple, border: `2px solid ${COLORS.ink}` }} />
              <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: 2 }}>CAPSULE</span>
            </div>
            <div style={{ display: "flex" }}>
              <span style={{ width: 9, height: 9, marginLeft: 7, borderRadius: 9, background: COLORS.yellow, border: `1px solid ${COLORS.ink}` }} />
              <span style={{ width: 9, height: 9, marginLeft: 7, borderRadius: 9, background: COLORS.mint, border: `1px solid ${COLORS.ink}` }} />
            </div>
          </div>

          <div style={{ padding: "24px 22px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: 1.4, color: COLORS.muted }}>AUJOURD’HUI</span>
              <span style={{ padding: "5px 9px", background: COLORS.yellow, border: `2px solid ${COLORS.ink}`, fontSize: 11, fontWeight: 900 }}>PROJET</span>
            </div>

            <div style={{ marginTop: 20, padding: "18px", display: "flex", flexDirection: "column", background: "#ffffff", border: `3px solid ${COLORS.ink}` }}>
              <span style={{ fontSize: 23, fontWeight: 900 }}>Préparer la prochaine étape</span>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column" }}>
                <Line width="95%" color="#8e8a98" />
                <div style={{ marginTop: 10, display: "flex" }}><Line width="72%" /></div>
                <div style={{ marginTop: 10, display: "flex" }}><Line width="84%" /></div>
              </div>
              <div style={{ marginTop: 20, display: "flex", alignItems: "center" }}>
                <span style={{ width: 15, height: 15, marginRight: 10, background: COLORS.mint, border: `2px solid ${COLORS.ink}` }} />
                <span style={{ fontSize: 13, fontWeight: 800 }}>Idées structurées</span>
              </div>
            </div>

            <div style={{ marginTop: 18, display: "flex" }}>
              <div style={{ width: 162, height: 96, marginRight: 16, padding: 14, display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#e7ddff", border: `3px solid ${COLORS.ink}` }}>
                <Line width="68%" color={COLORS.purple} />
                <Line width="94%" />
                <Line width="76%" />
              </div>
              <div style={{ width: 162, height: 96, padding: 14, display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#ddf8e9", border: `3px solid ${COLORS.ink}` }}>
                <Line width="54%" color="#16a36a" />
                <Line width="88%" />
                <Line width="66%" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>,
    size,
  );
}
