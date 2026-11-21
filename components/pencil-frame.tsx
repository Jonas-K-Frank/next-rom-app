/** Blyantstreg-ramme: håndtegnet kant med lette overskridelser og
 *  varierende tryk. Hovedstregen er delt i fire paths, så vandrette
 *  og lodrette kan have hver sin tykkelse (vandrette trækkes typisk
 *  med mere tryk end de lodrette).
 *
 *  Props:
 *  - color: stregfarve
 *  - withFill: hvidt fyld indeni (til kort, ikke til gennemsigtige felter)
 *  - showCrumble: tynde grafit-krus ovenpå
 *  - strokeWidthH / strokeWidthV: tykkelse på vandrende/lodrette hovedstreger
 *  - crumbleWidthH / crumbleWidthV: tykkelse på krus-stregerne */
export function PencilFrame({
  color = "#262626",
  withFill = true,
  showCrumble = true,
  strokeWidthH = 1,
  strokeWidthV = 1,
  crumbleWidthH = 0.8,
  crumbleWidthV = 0.8,
}: {
  color?: string;
  withFill?: boolean;
  showCrumble?: boolean;
  strokeWidthH?: number;
  strokeWidthV?: number;
  crumbleWidthH?: number;
  crumbleWidthV?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 300 200"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      fill="none"
      style={{ stroke: color }}
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
    >
      {/* Hvidt fyld, præcis indenfor blyantstregen (uændret). */}
      {withFill && (
        <path
          d="M11 6 C40 4.5, 90 6.5, 150 5.5 C205 4.7, 258 6.2, 293 5.8 C295.2 5.8, 296 6.8, 295.8 8.5 C294.5 25, 295.8 40, 294.8 60 C293.8 85, 295.2 110, 294.4 135 C294.2 152, 295 170, 294.6 193 C294.5 195.5, 293.5 196.5, 291 196.3 C265 194.5, 240 196, 215 195.2 C185 194.3, 160 196, 135 195.4 C105 194.6, 75 196, 45 195.3 C25 194.8, 12 195.5, 6.8 194.9 C4.6 194.6, 3.8 193.6, 3.9 191.4 C4.4 175, 3.6 160, 4.2 142 C5 118, 3.8 95, 4.4 70 C4.9 50, 4 30, 4.4 10.5 C4.5 8, 5.5 7, 7.8 6.8 Z"
          fill="#fff"
          stroke="none"
        />
      )}

      {/* VANDRETB hovedstreger (over- og underside) — trukket med
          mest tryk. Hjørne-overskridelserne er delt med de lodrette,
          så stregerne mødes lidt "forbi" hjørnet som en håndtegnning. */}
      <path
        d="M11 6 C40 4.5, 90 6.5, 150 5.5 C205 4.7, 258 6.2, 293 5.8 C295.2 5.8, 296 6.8, 295.8 8.5"
        strokeWidth={strokeWidthH}
        opacity="0.8"
      />
      <path
        d="M291 196.3 C265 194.5, 240 196, 215 195.2 C185 194.3, 160 196, 135 195.4 C105 194.6, 75 196, 45 195.3 C25 194.8, 12 195.5, 6.8 194.9 C4.6 194.6, 3.8 193.6, 3.9 191.4"
        strokeWidth={strokeWidthH}
        opacity="0.8"
      />

      {/* LODRETB hovedstreger (sidekanterne) — lettere tryk. */}
      <path
        d="M295.8 8.5 C294.5 25, 295.8 40, 294.8 60 C293.8 85, 295.2 110, 294.4 135 C294.2 152, 295 170, 294.6 193 C294.5 195.5, 293.5 196.5, 291 196.3"
        strokeWidth={strokeWidthV}
        opacity="0.8"
      />
      <path
        d="M3.9 191.4 C4.4 175, 3.6 160, 4.2 142 C5 118, 3.8 95, 4.4 70 C4.9 50, 4 30, 4.4 10.5 C4.5 8, 5.5 7, 7.8 6.8"
        strokeWidth={strokeWidthV}
        opacity="0.8"
      />

      {/* Tynde grafit-krus-streger ovenpå, let forskudte. */}
      {showCrumble && (
        <>
          <path
            d="M12 5 C50 4, 100 6, 150 5 C205 4, 260 6, 296 5"
            strokeWidth={crumbleWidthH}
            opacity="0.3"
          />
          <path
            d="M293 195 C255 196.5, 210 194.8, 160 195.5 C120 196, 70 194.6, 5 195"
            strokeWidth={crumbleWidthH}
            opacity="0.3"
          />
          <path
            d="M295 8 C294 40, 296 80, 295 120 C294.5 155, 295.5 175, 295 195"
            strokeWidth={crumbleWidthV}
            opacity="0.3"
          />
          <path
            d="M4 192 C3.6 160, 4.8 120, 4 80 C3.5 55, 4.4 25, 4.5 8"
            strokeWidth={crumbleWidthV}
            opacity="0.3"
          />
        </>
      )}
    </svg>
  );
}