// Page d'accueil — Macareux animé de Saint-Pierre-et-Miquelon
export default function Home() {
  return (
    <>
      {/* Animations CSS pour le macareux et la scène */}
      <style>{`
        @keyframes flottement {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(1deg); }
        }
        @keyframes aile {
          0%, 100% { transform: rotate(0deg); }
          30% { transform: rotate(-8deg); }
          60% { transform: rotate(3deg); }
        }
        @keyframes vague1 {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(30px); }
        }
        @keyframes vague2 {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-25px); }
        }
        @keyframes nuage {
          0% { transform: translateX(-100px); }
          100% { transform: translateX(500px); }
        }
        @keyframes clignement {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
      `}</style>

      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        /* Dégradé évoquant le ciel et la mer de l'archipel */
        background: "linear-gradient(180deg, #87CEEB 0%, #B0D4E8 30%, #4A7A8C 55%, #2C5F6E 60%, #1B4A5A 70%, #1A3D4A 100%)",
        overflow: "hidden",
        position: "relative",
      }}>

        {/* Titre principal */}
        <h1 style={{
          fontSize: "2rem",
          fontWeight: "bold",
          color: "#fff",
          textShadow: "0 2px 8px rgba(0,0,0,0.3)",
          marginBottom: "2rem",
          textAlign: "center",
          zIndex: 10,
          fontFamily: "system-ui, sans-serif",
          letterSpacing: "0.02em",
        }}>
          WebJourney — Saint-Pierre-et-Miquelon
        </h1>

        {/* Scène SVG complète */}
        <svg
          viewBox="0 0 400 400"
          style={{ width: "min(400px, 90vw)", height: "auto", zIndex: 10 }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* -- Nuages en arrière-plan -- */}
          <g style={{ animation: "nuage 20s linear infinite" }} opacity="0.5">
            <ellipse cx="60" cy="50" rx="40" ry="14" fill="#fff" />
            <ellipse cx="85" cy="45" rx="25" ry="10" fill="#fff" />
          </g>
          <g style={{ animation: "nuage 28s linear infinite 5s" }} opacity="0.3">
            <ellipse cx="200" cy="30" rx="35" ry="11" fill="#fff" />
            <ellipse cx="220" cy="25" rx="20" ry="8" fill="#fff" />
          </g>

          {/* -- Falaises à l'arrière-plan -- */}
          <path d="M0 200 L30 160 L70 175 L110 140 L150 165 L180 145 L200 170 L200 280 L0 280 Z" fill="#5C7A3E" />
          <path d="M180 170 L220 150 L260 170 L300 135 L340 155 L380 140 L400 160 L400 280 L180 280 Z" fill="#4A6B30" />

          {/* -- Mer / vagues -- */}
          <rect x="0" y="260" width="400" height="140" fill="#2C5F6E" />

          {/* Vagues animées */}
          <g style={{ animation: "vague1 4s ease-in-out infinite" }}>
            <path d="M-20 275 Q30 260 80 275 Q130 290 180 275 Q230 260 280 275 Q330 290 380 275 Q430 260 480 275 L480 285 L-20 285 Z" fill="#3A7A8C" opacity="0.6" />
          </g>
          <g style={{ animation: "vague2 5s ease-in-out infinite 0.5s" }}>
            <path d="M-20 285 Q40 272 100 285 Q160 298 220 285 Q280 272 340 285 Q400 298 460 285 L460 295 L-20 295 Z" fill="#2A6A7C" opacity="0.5" />
          </g>

          {/* -- Groupe du macareux avec animation de flottement -- */}
          <g style={{ animation: "flottement 3s ease-in-out infinite", transformOrigin: "200px 220px" }}>

            {/* Corps principal — forme ovale noire */}
            <ellipse cx="200" cy="230" rx="38" ry="50" fill="#1a1a1a" />

            {/* Ventre blanc */}
            <ellipse cx="200" cy="240" rx="24" ry="38" fill="#fff" />

            {/* Queue */}
            <path d="M195 278 L200 295 L210 278" fill="#1a1a1a" />

            {/* Aile gauche (animée) */}
            <g style={{ animation: "aile 3s ease-in-out infinite", transformOrigin: "175px 215px" }}>
              <path d="M162 215 Q155 240 160 260 Q168 255 175 235 Q178 220 175 210 Z" fill="#1a1a1a" />
            </g>

            {/* Aile droite (animée, inversée) */}
            <g style={{ animation: "aile 3s ease-in-out infinite 0.2s", transformOrigin: "225px 215px" }}>
              <path d="M238 215 Q245 240 240 260 Q232 255 225 235 Q222 220 225 210 Z" fill="#1a1a1a" />
            </g>

            {/* Tête — cercle noir */}
            <circle cx="200" cy="190" r="28" fill="#1a1a1a" />

            {/* Joues blanches */}
            <path d="M185 185 Q188 205 200 210 Q212 205 215 185 Q210 195 200 198 Q190 195 185 185 Z" fill="#f5f0e0" />

            {/* Oeil gauche — cercle blanc + pupille */}
            <g style={{ animation: "clignement 4s ease-in-out infinite", transformOrigin: "190px 183px" }}>
              <circle cx="190" cy="183" r="5" fill="#fff" />
              <circle cx="191" cy="183" r="3" fill="#1a1a1a" />
              <circle cx="192" cy="181.5" r="1" fill="#fff" />
            </g>

            {/* Oeil droit */}
            <g style={{ animation: "clignement 4s ease-in-out infinite 0.1s", transformOrigin: "210px 183px" }}>
              <circle cx="210" cy="183" r="5" fill="#fff" />
              <circle cx="211" cy="183" r="3" fill="#1a1a1a" />
              <circle cx="212" cy="181.5" r="1" fill="#fff" />
            </g>

            {/* Bec — la partie la plus colorée du macareux */}
            {/* Base du bec (rouge-orange) */}
            <path d="M196 192 L183 200 L196 207 Z" fill="#CC3300" />
            <path d="M204 192 L217 200 L204 207 Z" fill="#CC3300" />
            {/* Partie centrale (orange vif) */}
            <path d="M193 195 L180 201 L193 206 Q195 200 193 195 Z" fill="#FF6600" />
            <path d="M207 195 L220 201 L207 206 Q205 200 207 195 Z" fill="#FF6600" />
            {/* Pointe du bec (jaune-orange) */}
            <path d="M190 197 L176 201 L190 205 Q191 201 190 197 Z" fill="#FFB800" />
            <path d="M210 197 L224 201 L210 205 Q209 201 210 197 Z" fill="#FFB800" />
            {/* Ligne décorative du bec */}
            <line x1="185" y1="193" x2="185" y2="208" stroke="#8B2200" strokeWidth="0.8" opacity="0.5" />
            <line x1="215" y1="193" x2="215" y2="208" stroke="#8B2200" strokeWidth="0.8" opacity="0.5" />

            {/* Pattes orange */}
            <g>
              <path d="M190 275 L185 290 L178 292 M185 290 L185 294 M185 290 L190 292" stroke="#FF6600" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <path d="M210 275 L215 290 L222 292 M215 290 L215 294 M215 290 L210 292" stroke="#FF6600" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            </g>
          </g>

          {/* Vague devant le macareux (effet de profondeur) */}
          <g style={{ animation: "vague1 4.5s ease-in-out infinite 1s" }}>
            <path d="M-20 295 Q50 282 120 295 Q190 308 260 295 Q330 282 400 295 L400 310 L-20 310 Z" fill="#1B4A5A" opacity="0.7" />
          </g>

          {/* Reflets sur l'eau */}
          <ellipse cx="200" cy="310" rx="30" ry="3" fill="#3A7A8C" opacity="0.3" />
        </svg>

        {/* Sous-titre discret */}
        <p style={{
          color: "rgba(255,255,255,0.6)",
          fontSize: "0.9rem",
          marginTop: "1.5rem",
          zIndex: 10,
          fontFamily: "system-ui, sans-serif",
        }}>
          Le macareux moine, emblème de l&apos;archipel
        </p>
      </div>
    </>
  );
}
