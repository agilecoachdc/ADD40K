// Silhouette humanoïde SVG, déclinée par race (proportions + oreilles +
// défenses), affichant le score de protection (VP) de chaque membre —
// tête, bras (x2, valeur miroir car le modèle de données ne distingue pas
// gauche/droite, cf. ArmorEntry dans shared/types.ts), torse, jambes (x2).
// Utilisée sur la fiche personnage (WeaponsArmorPanel) et sur la tuile MJ
// (GmTracker) — même composant, taille différente via la prop `size`.

import type { ArmorTotals } from "@shared/calc-engine";

interface RaceSilhouetteConfig {
  /** Échelle verticale globale (silhouette plus petite = hobbit/gnome, plus grande = orc). */
  heightScale: number;
  /** Échelle horizontale (carrure épaules/torse). */
  widthScale: number;
  /** Échelle de la tête (proportion plus grosse = races trapues). */
  headScale: number;
  ears: "round" | "pointed" | "large" | "cat";
  tusks?: boolean;
}

const DEFAULT_CONFIG: RaceSilhouetteConfig = { heightScale: 1, widthScale: 1, headScale: 1, ears: "round" };

const RACE_SILHOUETTES: Record<string, RaceSilhouetteConfig> = {
  humain: { heightScale: 1.0, widthScale: 1.0, headScale: 1.0, ears: "round" },
  rohirim: { heightScale: 1.06, widthScale: 1.12, headScale: 0.97, ears: "round" },
  eldar: { heightScale: 1.1, widthScale: 0.82, headScale: 0.94, ears: "pointed" },
  gith: { heightScale: 1.03, widthScale: 0.88, headScale: 1.08, ears: "pointed" },
  rakshasa: { heightScale: 1.0, widthScale: 0.94, headScale: 1.0, ears: "cat" },
  orc: { heightScale: 1.14, widthScale: 1.28, headScale: 1.05, ears: "pointed", tusks: true },
  hobbit: { heightScale: 0.68, widthScale: 0.95, headScale: 1.22, ears: "round" },
  gnome: { heightScale: 0.6, widthScale: 0.88, headScale: 1.28, ears: "large" },
};

const SILHOUETTE_FILL = "#334155"; // slate-700

function buildGeometry(cfg: RaceSilhouetteConfig) {
  const feetY = 156;
  const bodyH = 132 * cfg.heightScale;
  const topY = feetY - bodyH;
  const headRy = 15 * cfg.headScale;
  const headRx = 13 * cfg.headScale;
  const headCy = topY + headRy;
  const shoulderY = topY + headRy * 2 + 4;
  const waistY = topY + bodyH * 0.58;
  const shoulderHalfW = 22 * cfg.widthScale;
  const waistHalfW = 14 * cfg.widthScale;
  const armW = 10 * cfg.widthScale;
  const legW = 10 * cfg.widthScale;
  const legGap = 3 * cfg.widthScale;

  const torso = `${50 - shoulderHalfW},${shoulderY} ${50 + shoulderHalfW},${shoulderY} ${50 + waistHalfW},${waistY} ${50 - waistHalfW},${waistY}`;
  const armLeft = { x: 50 - shoulderHalfW - armW, y: shoulderY, w: armW, h: waistY - shoulderY };
  const armRight = { x: 50 + shoulderHalfW, y: shoulderY, w: armW, h: waistY - shoulderY };
  const legLeft = { x: 50 - legGap / 2 - legW, y: waistY, w: legW, h: feetY - waistY };
  const legRight = { x: 50 + legGap / 2, y: waistY, w: legW, h: feetY - waistY };

  return {
    headCx: 50,
    headCy,
    headRx,
    headRy,
    torso,
    armLeft,
    armRight,
    legLeft,
    legRight,
    badgeArmY: shoulderY + (waistY - shoulderY) / 2,
    badgeTorsoY: shoulderY + (waistY - shoulderY) / 2,
    badgeLegY: waistY + (feetY - waistY) / 2,
  };
}

function Ears({
  style,
  headCx,
  headCy,
  headRx,
  headRy,
}: {
  style: RaceSilhouetteConfig["ears"];
  headCx: number;
  headCy: number;
  headRx: number;
  headRy: number;
}) {
  if (style === "round") return null;
  if (style === "cat") {
    return (
      <>
        <polygon
          points={`${headCx - headRx * 0.5},${headCy - headRy * 0.7} ${headCx - headRx * 0.9},${headCy - headRy * 1.6} ${headCx - headRx * 0.1},${headCy - headRy * 1.1}`}
          fill={SILHOUETTE_FILL}
        />
        <polygon
          points={`${headCx + headRx * 0.5},${headCy - headRy * 0.7} ${headCx + headRx * 0.9},${headCy - headRy * 1.6} ${headCx + headRx * 0.1},${headCy - headRy * 1.1}`}
          fill={SILHOUETTE_FILL}
        />
      </>
    );
  }
  const length = style === "large" ? 1.5 : 1.0;
  return (
    <>
      <polygon
        points={`${headCx - headRx * 0.9},${headCy - headRy * 0.1} ${headCx - headRx * 1.9 * length},${headCy - headRy * 0.6 * length} ${headCx - headRx * 0.7},${headCy + headRy * 0.5}`}
        fill={SILHOUETTE_FILL}
      />
      <polygon
        points={`${headCx + headRx * 0.9},${headCy - headRy * 0.1} ${headCx + headRx * 1.9 * length},${headCy - headRy * 0.6 * length} ${headCx + headRx * 0.7},${headCy + headRy * 0.5}`}
        fill={SILHOUETTE_FILL}
      />
    </>
  );
}

function VpBadge({ x, y, value }: { x: number; y: number; value: number }) {
  const protectedPart = value > 0;
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={11}
        fill={protectedPart ? "#0f766e" : "#1e293b"}
        stroke={protectedPart ? "#2dd4bf" : "#475569"}
        strokeWidth={1.5}
      />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fontSize={12}
        fontWeight={700}
        fill={protectedPart ? "#f0fdfa" : "#94a3b8"}
      >
        {value}
      </text>
    </g>
  );
}

export function RaceArmorSilhouette({
  race,
  armorTotals,
  size = 120,
}: {
  race: string;
  armorTotals: ArmorTotals;
  size?: number;
}) {
  const cfg = RACE_SILHOUETTES[race] ?? DEFAULT_CONFIG;
  const g = buildGeometry(cfg);
  const height = Math.round(size * 1.6); // viewBox 100x160

  return (
    <svg width={size} height={height} viewBox="0 0 100 160" aria-hidden="true">
      <ellipse cx={g.headCx} cy={g.headCy} rx={g.headRx} ry={g.headRy} fill={SILHOUETTE_FILL} />
      <Ears style={cfg.ears} headCx={g.headCx} headCy={g.headCy} headRx={g.headRx} headRy={g.headRy} />
      {cfg.tusks && (
        <>
          <polygon
            points={`${g.headCx - 4},${g.headCy + g.headRy * 0.55} ${g.headCx - 6},${g.headCy + g.headRy * 0.9} ${g.headCx - 2},${g.headCy + g.headRy * 0.7}`}
            fill="#e2e8f0"
          />
          <polygon
            points={`${g.headCx + 4},${g.headCy + g.headRy * 0.55} ${g.headCx + 6},${g.headCy + g.headRy * 0.9} ${g.headCx + 2},${g.headCy + g.headRy * 0.7}`}
            fill="#e2e8f0"
          />
        </>
      )}
      <polygon points={g.torso} fill={SILHOUETTE_FILL} />
      <rect x={g.armLeft.x} y={g.armLeft.y} width={g.armLeft.w} height={g.armLeft.h} rx={3} fill={SILHOUETTE_FILL} />
      <rect x={g.armRight.x} y={g.armRight.y} width={g.armRight.w} height={g.armRight.h} rx={3} fill={SILHOUETTE_FILL} />
      <rect x={g.legLeft.x} y={g.legLeft.y} width={g.legLeft.w} height={g.legLeft.h} rx={3} fill={SILHOUETTE_FILL} />
      <rect x={g.legRight.x} y={g.legRight.y} width={g.legRight.w} height={g.legRight.h} rx={3} fill={SILHOUETTE_FILL} />

      <VpBadge x={g.headCx} y={g.headCy} value={armorTotals.vpTete} />
      <VpBadge x={g.armLeft.x + g.armLeft.w / 2} y={g.badgeArmY} value={armorTotals.vpBras} />
      <VpBadge x={g.armRight.x + g.armRight.w / 2} y={g.badgeArmY} value={armorTotals.vpBras} />
      <VpBadge x={50} y={g.badgeTorsoY} value={armorTotals.vpTorse} />
      <VpBadge x={g.legLeft.x + g.legLeft.w / 2} y={g.badgeLegY} value={armorTotals.vpJambes} />
      <VpBadge x={g.legRight.x + g.legRight.w / 2} y={g.badgeLegY} value={armorTotals.vpJambes} />
    </svg>
  );
}
