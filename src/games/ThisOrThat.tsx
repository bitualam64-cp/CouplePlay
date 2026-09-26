import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Shuffle, Trophy, RotateCcw, ArrowLeft } from "lucide-react";
import { NameGate, TurnPass, WaitingNote, RoundHeader } from "../ui/common";
import { HeartBurst } from "../ui/bits";
import { seededShuffle, seedOf } from "../lib/util";
import { THISORTHAT_PAIRS, THISORTHAT_ROUNDS, type TotPair } from "../lib/content";
import { fetchRoom, updateRoomState } from "../lib/rtc";
import type { OnlineGameProps } from "../pages/Room";

export type GameProps = { mode: "local"; onExit: () => void } | OnlineGameProps;

const CARD_A = "linear-gradient(135deg, #FFE8DE, #FBE4DB)";
const CARD_B = "linear-gradient(135deg, #F0E4FB, #E7DEFB)";

export default function ThisOrThat(props: GameProps) {
  return props.mode === "local" ? <TotLocal {...props} /> : <TotOnline {...props} />;
}

function verdict(matches: number, total: number): string {
  if (matches >= total * 0.7) return "You're basically the same soul.";
  if (matches >= total * 0.4) return "A lovely balance of same and different.";
  return "Opposites, and that's adorable.";
}

/* ================= local ================= */

function TotLocal({ onExit }: { onExit: () => void }) {
  const [names, setNames] = useState({ a: "", b: "" });
  const [setup, setSetup] = useState(true);
  const [round, setRound] = useState(0);
  const [pairs] = useState(() => seededShuffle(THISORTHAT_PAIRS, THISORTHAT_ROUNDS));
  const [stage, setStage] = useState<"a" | "pass" | "b" | "reveal">("a");
  const [picks, setPicks] = useState<{ a?: "a" | "b"; b?: "a" | "b" }>({});
  const [matches, setMatches] = useState(0);

  if (setup)
    return (
      <NameGate
        pill="This or That"
        title="Names for the scoreboard."
        names={names}
        setNames={setNames}
        onBack={onExit}
        onStart={() => setSetup(false)}
      />
    );

  if (round >= pairs.length) return <TotEnd matches={matches} total={pairs.length} onAgain={() => { setRound(0); setMatches(0); setStage("a"); setPicks({}); }} onExit={onExit} />;

  const pair = pairs[round];
  const A = names.a || "Player 1";
  const B = names.b || "Player 2";

  const pick = (who: "a" | "b", choice: "a" | "b") => {
    const next = { ...picks, [who]: choice };
    setPicks(next);
    if (who === "a") setStage("pass");
    else {
      if (next.a === next.b) setMatches((m) => m + 1);
      setStage("reveal");
    }
  };

  const next = () => {
    setPicks({});
    setStage("a");
    setRound((r) => r + 1);
  };

  return (
    <div className="card p-6 md:p-8 shadow-warm relative">
      {stage === "reveal" && picks.a === picks.b && <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[28px]"><HeartBurst count={10} seed={round + 3} /></div>}
      <RoundHeader
        pill="This or That"
        icon={<Shuffle className="w-3 h-3" />}
        right={
          <>
            Round {round + 1} of {pairs.length} · {matches} matches
          </>
        }
      />
      {stage === "pass" && (
        <TurnPass to={B} note={`${A} picked in secret — no peeking at their choice.`} action="My turn" onDone={() => setStage("b")} />
      )}
      {(stage === "a" || stage === "b") && (
        <>
          <div className="text-center text-sm text-plum-soft mb-4">
            <b className="text-plum">{stage === "a" ? A : B}</b>, pick honestly — tap secretly.
          </div>
          <TotChoices
            pair={pair}
            picked={stage === "a" ? picks.a : picks.b}
            onPick={(c) => pick(stage === "a" ? "a" : "b", c)}
          />
        </>
      )}
      {stage === "reveal" && picks.a && picks.b && (
        <TotReveal
          pair={pair}
          aChoice={picks.a}
          bChoice={picks.b}
          aName={A}
          bName={B}
          onNext={next}
          isLast={round + 1 >= pairs.length}
        />
      )}
    </div>
  );
}

function TotChoices({ pair, picked, onPick }: { pair: TotPair; picked?: "a" | "b"; onPick: (c: "a" | "b") => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(["a", "b"] as const).map((side) => (
        <motion.button
          key={side}
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onPick(side)}
          className={`rounded-3xl p-8 md:p-10 text-center border transition min-h-[150px] flex flex-col items-center justify-center ${
            picked === side ? "border-coral shadow-warm" : "border-coral/15 hover:border-coral/40 shadow-sm"
          }`}
          style={{ background: side === "a" ? CARD_A : CARD_B }}
        >
          <span className="pill bg-white/70 text-coral-deep mb-3">{pair.category}</span>
          <span className="heading-serif text-2xl md:text-3xl text-plum leading-tight">{side === "a" ? pair.a : pair.b}</span>
        </motion.button>
      ))}
    </div>
  );
}

function TotReveal({
  pair,
  aChoice,
  bChoice,
  aName,
  bName,
  onNext,
  isLast,
}: {
  pair: TotPair;
  aChoice: "a" | "b";
  bChoice: "a" | "b";
  aName: string;
  bName: string;
  onNext: () => void;
  isLast: boolean;
}) {
  const match = aChoice === bChoice;
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        <RevealOption label={pair.a} category={pair.category} bg={CARD_A} choosers={[aChoice === "a" ? aName : null, bChoice === "a" ? bName : null]} />
        <RevealOption label={pair.b} category={pair.category} bg={CARD_B} choosers={[aChoice === "b" ? aName : null, bChoice === "b" ? bName : null]} />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`mt-4 rounded-2xl p-5 text-center ${match ? "bg-mint/25 text-plum" : "bg-blush text-coral-deep"}`}
      >
        <div className="heading-serif text-2xl flex items-center justify-center gap-2">
          {match ? (
            <>
              <Heart className="w-5 h-5 fill-coral text-coral" /> Match
            </>
          ) : (
            "Complete opposites"
          )}
        </div>
      </motion.div>
      <button className="btn-primary mt-5 w-full" onClick={onNext}>
        {isLast ? "See final" : "Next round"} <ArrowRightIcon />
      </button>
    </div>
  );
}

function RevealOption({ label, category, bg, choosers }: { label: string; category: string; bg: string; choosers: (string | null)[] }) {
  const names = choosers.filter(Boolean) as string[];
  return (
    <div className="rounded-3xl p-6 border border-coral/15 text-center min-h-[120px] flex flex-col items-center justify-center" style={{ background: bg }}>
      <span className="pill bg-white/70 text-coral-deep mb-2">{category}</span>
      <div className="heading-serif text-xl text-plum">{label}</div>
      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
        {names.length === 0 ? (
          <span className="text-xs text-plum-soft italic">no takers</span>
        ) : (
          names.map((n) => (
            <span key={n} className="pill bg-plum text-white !text-[11px]">
              {n}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function TotEnd({ matches, total, onAgain, onExit }: { matches: number; total: number; onAgain: () => void; onExit: () => void }) {
  return (
    <div className="card p-8 text-center shadow-warm relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[28px]">
        <HeartBurst count={14} seed={11} />
      </div>
      <div className="relative">
        <Trophy className="w-14 h-14 text-coral mx-auto" />
        <h2 className="heading-serif text-4xl text-plum mt-3">
          You matched on {matches} of {total}
        </h2>
        <p className="text-plum-soft mt-2">{verdict(matches, total)}</p>
        <div className="flex justify-center gap-3 mt-6 flex-wrap">
          <button className="btn-primary" onClick={onAgain}>
            <RotateCcw className="w-4 h-4" /> Play again
          </button>
          <button className="btn-ghost" onClick={onExit}>
            <ArrowLeft className="w-4 h-4" /> Games
          </button>
        </div>
      </div>
    </div>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

/* ================= online ================= */

interface TotState {
  round?: number;
  matches?: number;
  submissions?: { host?: { choice: "a" | "b" }; guest?: { choice: "a" | "b" } };
  done?: boolean;
}

function TotOnline({ room, broadcast, refresh, onExit }: OnlineGameProps) {
  const role = room.role === "guest" ? "guest" : "host";
  const other = role === "host" ? "guest" : "host";
  const state = (room.state ?? {}) as TotState;
  const round = state.round ?? 0;
  const matches = state.matches ?? 0;
  const subs = state.submissions ?? {};
  const done = !!state.done;
  const pairs = useMemo(() => seededShuffle(THISORTHAT_PAIRS, THISORTHAT_ROUNDS, seedOf(room.code)), [room.code]);

  const myName = role === "host" ? room.hostName ?? "You" : room.guestName ?? "You";
  const partnerName = role === "host" ? room.guestName ?? "partner" : room.hostName ?? "partner";
  const pair = pairs[Math.min(round, pairs.length - 1)];
  const bothIn = !!(subs.host && subs.guest);

  if (done) {
    return (
      <TotEnd
        matches={matches}
        total={pairs.length}
        onAgain={async () => {
          await updateRoomState(room.code, room.state, { round: 0, matches: 0, submissions: {}, done: false });
          await broadcast("state-changed");
          await refresh();
        }}
        onExit={() => void onExit()}
      />
    );
  }

  const submit = async (choice: "a" | "b") => {
    const nextSubs = { ...subs, [role]: { choice } };
    await updateRoomState(room.code, room.state, { submissions: nextSubs });
    await broadcast("state-changed");
    await refresh();
  };

  const next = async () => {
    const isMatch = subs.host?.choice && subs.host.choice === subs.guest?.choice;
    const fresh = await fetchRoom(room.code);
    const fs = (fresh?.state ?? {}) as TotState;
    // someone else already advanced — do nothing
    if ((fs.round ?? 0) !== round || !(fs.submissions?.host && fs.submissions?.guest)) return;
    const isLast = round + 1 >= pairs.length;
    await updateRoomState(room.code, room.state, {
      round: round + 1,
      matches: matches + (isMatch ? 1 : 0),
      submissions: {},
      done: isLast,
    });
    await broadcast("state-changed");
    await refresh();
  };

  return (
    <div className="card p-5 md:p-6 shadow-warm">
      <RoundHeader
        pill="This or That"
        icon={<Shuffle className="w-3 h-3" />}
        right={
          <>
            Round {round + 1} of {pairs.length} · {matches} matches
          </>
        }
      />
      {!bothIn ? (
        <>
          <div className="text-center text-sm text-plum-soft mb-4">
            {subs[role] ? (
              <>
                Locked in — waiting for <b className="text-plum">{partnerName}</b>…
              </>
            ) : subs[other] ? (
              <>
                <b className="text-plum">{partnerName}</b> has picked. Your turn, {myName}.
              </>
            ) : (
              "Tap secretly — revealed once you both submit."
            )}
          </div>
          <TotChoices pair={pair} picked={subs[role]?.choice} onPick={(c) => (subs[role] ? undefined : void submit(c))} />
          {subs[role] && <WaitingNote>Sit tight — the reveal happens the moment they choose.</WaitingNote>}
        </>
      ) : (
        <TotReveal
          pair={pair}
          aChoice={subs.host!.choice}
          bChoice={subs.guest!.choice}
          aName={room.hostName ?? "Host"}
          bName={room.guestName ?? "Guest"}
          onNext={() => void next()}
          isLast={round + 1 >= pairs.length}
        />
      )}
    </div>
  );
}
