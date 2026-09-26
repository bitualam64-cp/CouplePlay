import type { ReactNode } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

/** Local-play name gate shared by the pass-and-play games. */
export function NameGate({
  pill,
  title,
  names,
  setNames,
  onBack,
  onStart,
  startLabel = "Start",
}: {
  pill: string;
  title: string;
  names: { a: string; b: string };
  setNames: (n: { a: string; b: string }) => void;
  onBack: () => void;
  onStart: () => void;
  startLabel?: string;
}) {
  return (
    <div className="card p-6 md:p-8 shadow-warm">
      <span className="pill bg-blush text-coral-deep">{pill}</span>
      <h2 className="heading-serif text-3xl text-plum mt-3">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2 mt-5">
        <input
          className="input"
          value={names.a}
          onChange={(e) => setNames({ ...names, a: e.target.value.slice(0, 20) })}
          placeholder="Player 1 name"
          maxLength={20}
        />
        <input
          className="input"
          value={names.b}
          onChange={(e) => setNames({ ...names, b: e.target.value.slice(0, 20) })}
          placeholder="Player 2 name"
          maxLength={20}
        />
      </div>
      <div className="flex justify-between mt-5">
        <button className="btn-ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button className="btn-primary" disabled={!names.a.trim() || !names.b.trim()} onClick={onStart}>
          {startLabel}
        </button>
      </div>
    </div>
  );
}

/** "Pass the device to X" interstitial for secret-action rounds. */
export function TurnPass({ to, note, action, onDone }: { to: string; note?: string; action?: string; onDone: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-8 text-center shadow-warm">
      <div className="text-plum-soft text-sm uppercase tracking-widest">Pass the device</div>
      <div className="heading-serif text-4xl text-plum mt-2">
        <span className="text-coral">{to}</span>, you're up
      </div>
      {note && <div className="text-plum-soft mt-2">{note}</div>}
      <button className="btn-primary mt-6" onClick={onDone}>
        {action ?? "Ready"} <ChevronRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

/** Shared "waiting on your partner" note used by online games. */
export function WaitingNote({ children }: { children: ReactNode }) {
  return <div className="text-plum-soft mt-4 italic text-center">{children}</div>;
}

/** Round header pill row used across online games. */
export function RoundHeader({ pill, icon, right }: { pill: string; icon: ReactNode; right: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
      <span className="pill bg-blush text-coral-deep">
        {icon} {pill}
      </span>
      <span className="text-xs text-plum-soft">{right}</span>
    </div>
  );
}

/** End-of-game hero card. */
export function EndCard({
  title,
  scoreLine,
  subLine,
  onAgain,
  onExit,
  againLabel = "Play again",
  celebrate,
}: {
  title: string;
  scoreLine?: string;
  subLine?: string;
  onAgain?: () => void;
  onExit: () => void;
  againLabel?: string;
  celebrate?: boolean;
}) {
  return (
    <div className="card p-8 text-center shadow-warm relative">
      {celebrate && (
        <div className="absolute inset-0 overflow-hidden rounded-[28px] pointer-events-none">
          <BurstInner />
        </div>
      )}
      <div className="relative">
        <TrophyIcon />
        <h2 className="heading-serif text-4xl text-plum mt-3">{title}</h2>
        {scoreLine && <div className="heading-serif text-5xl text-coral mt-4">{scoreLine}</div>}
        {subLine && <div className="text-sm text-plum-soft mt-1">{subLine}</div>}
        <div className="flex justify-center gap-3 mt-6 flex-wrap">
          {onAgain && (
            <button className="btn-primary" onClick={onAgain}>
              <ReloadIcon /> {againLabel}
            </button>
          )}
          <button className="btn-ghost" onClick={onExit}>
            <ArrowLeft className="w-4 h-4" /> Games
          </button>
        </div>
      </div>
    </div>
  );
}

import { Trophy, RotateCcw } from "lucide-react";
import { HeartBurst } from "./bits";

function TrophyIcon() {
  return <Trophy className="w-14 h-14 text-coral mx-auto" />;
}
function ReloadIcon() {
  return <RotateCcw className="w-4 h-4" />;
}
function BurstInner() {
  return <HeartBurst count={14} seed={7} />;
}
