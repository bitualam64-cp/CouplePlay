import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Wifi, type LucideIcon } from "lucide-react";

export interface GameCardProps {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  rounds: string;
  supports: { local: boolean; online: boolean };
  disabled?: boolean;
  reason?: string;
  index?: number;
}

export default function GameCard({
  to,
  title,
  description,
  icon: Icon,
  accent,
  rounds,
  supports,
  disabled,
  reason,
  index = 0,
}: GameCardProps) {
  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: "easeOut" }}
      whileHover={disabled ? {} : { y: -4 }}
      className={`card p-6 h-full flex flex-col gap-4 relative overflow-hidden ${
        disabled ? "opacity-60" : "shadow-warm hover:shadow-warm-lg"
      }`}
      style={{ transition: "box-shadow 0.25s ease" }}
    >
      <div
        className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-40"
        style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 70%)` }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: accent, color: "#fff" }}
        >
          <Icon className="w-7 h-7" strokeWidth={1.8} />
        </div>
        <div className="flex flex-col gap-1 items-end">
          {supports.local && (
            <span className="pill bg-blush text-coral-deep">
              <Users className="w-3 h-3" /> Local
            </span>
          )}
          {supports.online && (
            <span className="pill bg-coral/15 text-coral-deep">
              <Wifi className="w-3 h-3" /> Online
            </span>
          )}
        </div>
      </div>
      <div className="relative">
        <h3 className="heading-serif text-2xl text-plum leading-tight">{title}</h3>
        <p className="text-sm text-plum-soft mt-1.5 leading-snug">{description}</p>
      </div>
      <div className="relative mt-auto flex items-center justify-between pt-2 border-t border-coral/10">
        <span className="text-xs text-plum-soft italic">{rounds}</span>
        <span className="text-sm font-semibold text-coral group-hover:text-coral-deep">
          {disabled ? reason : "Play \u2192"}
        </span>
      </div>
    </motion.div>
  );

  if (disabled) return <div className="group cursor-not-allowed">{inner}</div>;
  return (
    <Link to={to} className="group block h-full">
      {inner}
    </Link>
  );
}
