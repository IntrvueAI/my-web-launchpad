import { useEffect, useMemo, useState } from "react";

/**
 * Ambient seasonal particles for the landing page. Auto-selects the effect from the current month
 * (Northern-hemisphere seasons) so it stays in theme year-round — winter snow, spring blossom,
 * summer sun-motes, autumn leaves. Pass `season` to force one (handy for previews).
 */
export type Season = "winter" | "spring" | "summer" | "autumn";

export const getSeason = (date = new Date()): Season => {
  const m = date.getMonth(); // 0 = Jan
  if (m === 11 || m <= 1) return "winter"; // Dec–Feb
  if (m <= 4) return "spring"; // Mar–May
  if (m <= 7) return "summer"; // Jun–Aug
  return "autumn"; // Sep–Nov
};

interface SeasonConfig {
  count: number;
  colors: string[];
  sizeMin: number;
  sizeMax: number;
  /** 'fall' drifts downward (snow/petals/leaves); 'rise' floats gently upward (summer motes). */
  motion: "fall" | "rise";
  /** Rounded dot, soft petal, or leaf silhouette. */
  shape: "dot" | "petal" | "leaf";
  /** Warm glow around each particle (summer fireflies/pollen). */
  glow?: boolean;
  opacityMin: number;
  opacityMax: number;
}

const SEASONS: Record<Season, SeasonConfig> = {
  winter: {
    count: 50, colors: ["#ffffff", "#eaf3ff"], sizeMin: 2, sizeMax: 6,
    motion: "fall", shape: "dot", opacityMin: 0.3, opacityMax: 0.7,
  },
  spring: {
    count: 34, colors: ["#f9a8d4", "#fbcfe8", "#f472b6", "#fff0f6"], sizeMin: 6, sizeMax: 12,
    motion: "fall", shape: "petal", opacityMin: 0.4, opacityMax: 0.8,
  },
  summer: {
    count: 30, colors: ["#fde68a", "#fcd34d", "#fbbf24", "#fef3c7"], sizeMin: 3, sizeMax: 7,
    motion: "rise", shape: "dot", glow: true, opacityMin: 0.4, opacityMax: 0.85,
  },
  autumn: {
    count: 32, colors: ["#fb923c", "#f59e0b", "#b45309", "#d97706", "#fca311"], sizeMin: 7, sizeMax: 13,
    motion: "fall", shape: "leaf", opacityMin: 0.45, opacityMax: 0.85,
  },
};

const borderRadiusFor = (shape: SeasonConfig["shape"]) =>
  shape === "petal" ? "50% 0 50% 0" : shape === "leaf" ? "0 50% 0 50%" : "9999px";

const rand = (min: number, max: number) => min + Math.random() * (max - min);

const SeasonalEffect = ({ season }: { season?: Season }) => {
  const active = season ?? getSeason();
  const cfg = SEASONS[active];
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  const particles = useMemo(
    () =>
      Array.from({ length: cfg.count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 12,
        duration: (cfg.motion === "rise" ? 14 : 10) + Math.random() * 16,
        size: rand(cfg.sizeMin, cfg.sizeMax),
        opacity: rand(cfg.opacityMin, cfg.opacityMax),
        color: cfg.colors[Math.floor(Math.random() * cfg.colors.length)],
      })),
    // regenerate only when the season changes
    [active], // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (!ready) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className={cfg.motion === "rise" ? "absolute animate-seasonal-rise" : "absolute animate-seasonal-fall"}
          style={{
            left: `${p.left}%`,
            [cfg.motion === "rise" ? "bottom" : "top"]: "-16px",
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            backgroundColor: p.color,
            borderRadius: borderRadiusFor(cfg.shape),
            boxShadow: cfg.glow ? `0 0 ${p.size * 2}px ${p.size / 2}px ${p.color}` : undefined,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
};

export default SeasonalEffect;
