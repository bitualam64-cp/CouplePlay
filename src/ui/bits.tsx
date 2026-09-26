import { useMemo } from "react";
import { Heart } from "lucide-react";

/** Little player chip used in lobbies and scoreboards. */
export function PlayerChip({
  name,
  online,
  you,
  muted,
}: {
  name: string;
  online?: boolean;
  you?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`px-3 py-2 rounded-2xl border ${
        muted ? "border-dashed border-plum-soft/30 text-plum-soft" : "border-coral/20 bg-white/70"
      } flex items-center gap-2`}
    >
      <div className={`w-2 h-2 rounded-full ${online ? "bg-mint" : "bg-rose/60"}`} />
      <span className="font-semibold text-plum">{name}</span>
      {you && <span className="pill bg-coral text-white !text-[10px] !px-2 !py-0.5">you</span>}
    </div>
  );
}

/** A soft burst of hearts when something adorable happens. */
export function HeartBurst({ seed = 0, count = 12 }: { seed?: number; count?: number }) {
  const hearts = useMemo(() => {
    let s = seed * 2654435761 + 97;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + rnd() * 0.6;
      const dist = 60 + rnd() * 110;
      return {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist * 0.8 - 30,
        rot: rnd() * 220 - 110,
        size: 12 + rnd() * 14,
        delay: rnd() * 0.12,
        color: ["#E85F73", "#C8425A", "#F4A6B0", "#E8A87C"][i % 4],
      };
    });
  }, [seed, count]);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-visible z-20">
      {hearts.map((h, i) => (
        <span
          key={i}
          className="burst-heart"
          style={
            {
              "--bx": `${h.x}px`,
              "--by": `${h.y}px`,
              "--br": `${h.rot}deg`,
              animationDelay: `${h.delay}s`,
            } as React.CSSProperties
          }
        >
          <Heart style={{ width: h.size, height: h.size, color: h.color, fill: h.color }} />
        </span>
      ))}
    </div>
  );
}
