import GameCard from "./GameCard";
import { GAMES } from "../lib/content";

export default function GameGrid({
  basePath,
  code,
  onPick,
}: {
  basePath: "/local" | "room";
  code?: string;
  onPick?: (slug: string) => void;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {GAMES.map((g, i) => {
        if (onPick) {
          return (
            <div key={g.slug} onClick={() => onPick(g.slug)} className="cursor-pointer">
              <GameCard
                to="#"
                title={g.title}
                description={g.description}
                icon={g.icon}
                accent={g.accent}
                rounds={g.rounds}
                supports={{ local: g.local, online: g.online }}
                index={i}
              />
            </div>
          );
        }
        const to = basePath === "/local" ? `/local/${g.slug}` : `/room/${code}/${g.slug}`;
        return (
          <GameCard
            key={g.slug}
            to={to}
            title={g.title}
            description={g.description}
            icon={g.icon}
            accent={g.accent}
            rounds={g.rounds}
            supports={{ local: g.local, online: g.online }}
            index={i}
          />
        );
      })}
    </div>
  );
}
