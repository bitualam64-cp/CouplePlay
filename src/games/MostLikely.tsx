import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Heart, Users, Trophy, RotateCcw, ArrowLeft, ArrowRight } from "lucide-react";
import { NameGate, TurnPass, WaitingNote, RoundHeader } from "../ui/common";
import { HeartBurst } from "../ui/bits";
import { seededShuffle, seedOf } from "../lib/util";
import { MOSTLIKELY_PROMPTS, MOSTLIKELY_ROUNDS } from "../lib/content";
import { fetchRoom, updateRoomState } from "../lib/rtc";
import type { OnlineGameProps } from "../pages/Room";

export type GameProps = { mode: "local"; onExit: () => void } | OnlineGameProps;

type Pick = "me" | "partner";

export default function MostLikely(props: GameProps) {
  return props.mode === "local" ? <MlLocal {...props} /> : <MlOnline {...props} />;
}

function verdict(agreed: number, total: number): string {
  if (agreed >= total * 0.7) return "Twin brains.";
  if (agreed >= total * 0.4) return "A healthy sprinkle of chaos.";
  return "Delightfully opposite.";
}

/** Resolve a picker's relative choice to a concrete name. */
function resolvePick(picker: "a" | "b", pick: Pick, names: { a: string; b: string }): string {
  return pick === "me" ? (picker === "a" ? names.a : names.b) : picker === "a" ? names.b : names.a;
}

/* ================= local ================= */

function MlLocal({ onExit }: { onExit: () => void }) {
  const [names, setNames] = useState({ a: "", b: "" });
  const [setup, setSetup] = useState(true);
  const [round, setRound] = useState(0);
  const [prompts] = useState(() => seededShuffle(MOSTLIKELY_PROMPTS, MOSTLIKELY_ROUNDS));
  const [stage, setStage] = useState<"a" | "pass" | "b" | "reveal">("a");
  const [picks, setPicks] = useState<{ a?: Pick; b?: Pick }>({});
  const [agreed, setAgreed] = useState(0);

  if (setup)
    return (
      <NameGate
        pill="Most Likely To…"
        title="Names for the scoreboard."
        names={names}
        setNames={setNames}
        onBack={onExit}
        onStart={() => setSetup(false)}
      />
    );

  if (round >= prompts.length)
    return (
      <MlEnd
        agreed={agreed}
        total={prompts.length}
        onAgain={() => {
          setRound(0);
          setAgreed(0);
          setStage("a");
          setPicks({});
        }}
        onExit={onExit}
      />
    );

  const prompt = prompts[round];
  const nm = { a: names.a || "Player 1", b: names.b || "Player 2" };

  const pick = (who: "a" | "b", choice: Pick) => {
    const next = { ...picks, [who]: choice };
    setPicks(next);
    if (who === "a") setStage("pass");
    else {
      if (resolvePick("a", next.a!, nm) === resolvePick("b", next.b!, nm)) setAgreed((v) => v + 1);
      setStage("reveal");
    }
  };

  return (
    <div className="card p-6 md:p-8 shadow-warm relative">
      {stage === "reveal" && picks.a && picks.b && resolvePick("a", picks.a, nm) === resolvePick("b", picks.b, nm) && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[28px]">
          <HeartBurst count={10} seed={round + 5} />
        </div>
      )}
      <RoundHeader
        pill="Most Likely To…"
        icon={<Users className="w-3 h-3" />}
        right={
          <>
            Round {round + 1} of {prompts.length} · {agreed} agreed
          </>
        }
      />
      <div className="text-plum-soft text-sm uppercase tracking-widest">Who is more likely to</div>
      <div className="heading-serif text-3xl md:text-4xl text-plum mt-2 mb-5 leading-tight">{prompt}?</div>
      {stage === "pass" && <TurnPass to={nm.b} note="Your verdict, in secret. Tap Me or Partner." action="My verdict" onDone={() => setStage("b")} />}
      {(stage === "a" || stage === "b") && (
        <PickButtons
          me={stage === "a" ? nm.a : nm.b}
          partner={stage === "a" ? nm.b : nm.a}
          onPick={(p) => pick(stage === "a" ? "a" : "b", p)}
        />
      )}
      {stage === "reveal" && picks.a && picks.b && (
        <MlReveal
          aPick={resolvePick("a", picks.a, nm)}
          bPick={resolvePick("b", picks.b, nm)}
          aName={nm.a}
          bName={nm.b}
          onNext={() => {
            const agreeSame = resolvePick("a", picks.a!, nm) === resolvePick("b", picks.b!, nm);
            void agreeSame;
            setPicks({});
            setStage("a");
            setRound((r) => r + 1);
          }}
          isLast={round + 1 >= prompts.length}
        />
      )}
    </div>
  );
}

function PickButtons({ me, partner, onPick }: { me: string; partner: string; onPick: (p: Pick) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <motion.button
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => onPick("me")}
        className="rounded-3xl p-8 text-center border border-coral/15 hover:border-coral/40 shadow-sm min-h-[110px] flex flex-col items-center justify-center"
        style={{ background: "linear-gradient(135deg, #FFE8DE, #FBE4DB)" }}
      >
        <span className="pill bg-white/70 text-coral-deep mb-2">Me</span>
        <span className="heading-serif text-2xl text-plum">{me}</span>
      </motion.button>
      <motion.button
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => onPick("partner")}
        className="rounded-3xl p-8 text-center border border-coral/15 hover:border-coral/40 shadow-sm min-h-[110px] flex flex-col items-center justify-center"
        style={{ background: "linear-gradient(135deg, #F0E4FB, #E7DEFB)" }}
      >
        <span className="pill bg-white/70 text-coral-deep mb-2">Partner</span>
        <span className="heading-serif text-2xl text-plum">{partner}</span>
      </motion.button>
    </div>
  );
}

function MlReveal({
  aPick,
  bPick,
  aName,
  bName,
  onNext,
  isLast,
}: {
  aPick: string;
  bPick: string;
  aName: string;
  bName: string;
  onNext: () => void;
  isLast: boolean;
}) {
  const agree = aPick === bPick;
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          { who: aName, picked: aPick, grad: "linear-gradient(135deg, #FFE8DE, #FBE4DB)" },
          { who: bName, picked: bPick, grad: "linear-gradient(135deg, #F0E4FB, #E7DEFB)" },
        ].map((r) => (
          <div key={r.who} className="rounded-3xl p-6 border border-coral/15 text-center" style={{ background: r.grad }}>
            <div className="text-xs uppercase tracking-widest text-plum-soft">{r.who} pointed at</div>
            <div className="heading-serif text-2xl text-plum mt-1 flex items-center justify-center gap-2">
              {r.picked}
              {agree && <Heart className="w-5 h-5 text-coral fill-coral" />}
            </div>
          </div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`mt-4 rounded-2xl p-5 text-center ${agree ? "bg-mint/25 text-plum" : "bg-blush text-coral-deep"}`}
      >
        <div className="heading-serif text-2xl">{agree ? "You agree — settled." : "Contested. Discuss!"}</div>
      </motion.div>
      <button className="btn-primary mt-5 w-full" onClick={onNext}>
        {isLast ? "See final" : "Next round"} <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function MlEnd({ agreed, total, onAgain, onExit }: { agreed: number; total: number; onAgain: () => void; onExit: () => void }) {
  return (
    <div className="card p-8 text-center shadow-warm relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[28px]">
        <HeartBurst count={14} seed={9} />
      </div>
      <div className="relative">
        <Trophy className="w-14 h-14 text-coral mx-auto" />
        <h2 className="heading-serif text-4xl text-plum mt-3">
          You agreed on {agreed} of {total}
        </h2>
        <p className="text-plum-soft mt-2">{verdict(agreed, total)}</p>
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

/* ================= online ================= */

interface MlState {
  round?: number;
  agreements?: number;
  submissions?: { host?: { choice: Pick }; guest?: { choice: Pick } };
  done?: boolean;
}

function MlOnline({ room, broadcast, refresh, onExit }: OnlineGameProps) {
  const role = room.role === "guest" ? "guest" : "host";
  const other = role === "host" ? "guest" : "host";
  const state = (room.state ?? {}) as MlState;
  const round = state.round ?? 0;
  const agreements = state.agreements ?? 0;
  const subs = state.submissions ?? {};
  const prompts = useMemo(() => seededShuffle(MOSTLIKELY_PROMPTS, MOSTLIKELY_ROUNDS, seedOf(room.code)), [room.code]);
  const done = !!state.done;

  const hostName = room.hostName ?? "Host";
  const guestName = room.guestName ?? "Guest";
  const myName = role === "host" ? hostName : guestName;
  const partnerName = role === "host" ? guestName : hostName;
  const names = { a: hostName, b: guestName };
  const prompt = prompts[Math.min(round, prompts.length - 1)];
  const bothIn = !!(subs.host && subs.guest);

  if (done) {
    return (
      <MlEnd
        agreed={agreements}
        total={prompts.length}
        onAgain={async () => {
          await updateRoomState(room.code, room.state, { round: 0, agreements: 0, submissions: {}, done: false });
          await broadcast("state-changed");
          await refresh();
        }}
        onExit={() => void onExit()}
      />
    );
  }

  const submit = async (choice: Pick) => {
    const nextSubs = { ...subs, [role]: { choice } };
    await updateRoomState(room.code, room.state, { submissions: nextSubs });
    await broadcast("state-changed");
    await refresh();
  };

  const next = async () => {
    const aResolved = resolvePick("a", subs.host!.choice, names);
    const bResolved = resolvePick("b", subs.guest!.choice, names);
    const agree = aResolved === bResolved;
    const fresh = await fetchRoom(room.code);
    const fs = (fresh?.state ?? {}) as MlState;
    if ((fs.round ?? 0) !== round || !(fs.submissions?.host && fs.submissions?.guest)) return;
    const isLast = round + 1 >= prompts.length;
    await updateRoomState(room.code, room.state, {
      round: round + 1,
      agreements: agreements + (agree ? 1 : 0),
      submissions: {},
      done: isLast,
    });
    await broadcast("state-changed");
    await refresh();
  };

  return (
    <div className="card p-5 md:p-6 shadow-warm">
      <RoundHeader
        pill="Most Likely To…"
        icon={<Users className="w-3 h-3" />}
        right={
          <>
            Round {round + 1} of {prompts.length} · {agreements} agreed
          </>
        }
      />
      <div className="text-plum-soft text-sm uppercase tracking-widest">Who is more likely to</div>
      <div className="heading-serif text-3xl md:text-4xl text-plum mt-2 mb-5 leading-tight">{prompt}?</div>
      {!bothIn ? (
        <>
          {subs[role] ? (
            <WaitingNote>
              Verdict locked. Waiting for <b className="text-plum not-italic">{partnerName}</b>…
            </WaitingNote>
          ) : (
            <>
              <div className="text-center text-sm text-plum-soft mb-4">
                {subs[other] ? (
                  <>
                    <b className="text-plum">{partnerName}</b> already voted — your turn, {myName}.
                  </>
                ) : (
                  "Tap secretly — revealed once you both vote. Roast responsibly."
                )}
              </div>
              <PickButtons me={myName} partner={partnerName} onPick={(p) => void submit(p)} />
            </>
          )}
        </>
      ) : (
        <MlReveal
          aPick={resolvePick("a", subs.host!.choice, names)}
          bPick={resolvePick("b", subs.guest!.choice, names)}
          aName={hostName}
          bName={guestName}
          onNext={() => void next()}
          isLast={round + 1 >= prompts.length}
        />
      )}
    </div>
  );
}
