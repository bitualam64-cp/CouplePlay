/**
 * CouplePlay realtime layer.
 *
 * Persistence: Supabase PostgREST `rooms` table (rooms survive closed tabs).
 * Live sync:   Supabase Realtime channel `room:{code}` — presence for
 *              online status, broadcast for instant state-change pings and
 *              live doodle strokes.
 * Resilience:  light polling + refetch on window focus/back-online, so a
 *              dropped connection quietly heals itself.
 */
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";

export const SUPABASE_URL = "https://wgksfacfdlhmidpykqtc.supabase.co";
export const SUPABASE_KEY = "sb_publishable_8gWKKQA7uDVmFJpCHL2u8A_uf46WFdw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { params: { eventsPerSecond: 40 } },
});

/* ---------------- identity ---------------- */

const PID_KEY = "coupleplay:pid";
const NAME_KEY = "coupleplay:lastName";

export function getPlayerId(): string {
  try {
    let id = localStorage.getItem(PID_KEY);
    if (!id) {
      id = "p_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
      localStorage.setItem(PID_KEY, id);
    }
    return id;
  } catch {
    return "p_anon_" + Math.random().toString(36).slice(2, 8);
  }
}

export function getSavedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) || "";
  } catch {
    return "";
  }
}

export function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* private mode — fine */
  }
}

/* ---------------- room model ---------------- */

export type Role = "host" | "guest" | "observer";

export interface Room {
  code: string;
  hostId: string | null;
  hostName: string | null;
  guestId: string | null;
  guestName: string | null;
  game: string | null;
  phase: string; // "lobby" | "playing"
  state: Record<string, any>;
  role: Role;
}

interface RoomRow {
  code: string;
  host_id: string | null;
  host_name: string | null;
  guest_id: string | null;
  guest_name: string | null;
  game: string | null;
  phase: string;
  state: Record<string, any> | null;
  private_state: Record<string, any> | null;
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function genCode(len = 5): string {
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return out;
}

function toRoom(row: RoomRow, pid: string): Room {
  const role: Role = pid === row.host_id ? "host" : pid === row.guest_id ? "guest" : "observer";
  return {
    code: row.code,
    hostId: row.host_id,
    hostName: row.host_name,
    guestId: row.guest_id,
    guestName: row.guest_name,
    game: row.game,
    phase: row.phase,
    state: row.state ?? {},
    role,
  };
}

/** Create a room, retrying on a (rare) code collision. */
export async function createRoom(hostName: string): Promise<string> {
  const pid = getPlayerId();
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = genCode();
    const { error } = await supabase.from("rooms").insert({
      code,
      host_id: pid,
      host_name: hostName,
      guest_id: null,
      guest_name: null,
      game: null,
      phase: "lobby",
      state: {},
      private_state: {},
    });
    if (!error) return code;
    if ((error as { code?: string }).code !== "23505") throw new Error(error.message || "Could not create room");
  }
  throw new Error("Could not create room — try again");
}

/** Fetch the public room view (never leaks private_state). */
export async function fetchRoom(code: string): Promise<Room | null> {
  const { data, error } = await supabase
    .from("rooms")
    .select("code,host_id,host_name,guest_id,guest_name,game,phase,state")
    .eq("code", code)
    .maybeSingle();
  if (error) throw new Error(error.message || "Failed to load room");
  if (!data) return null;
  return toRoom(data as RoomRow, getPlayerId());
}

/** Artist-only: fetch the hidden payload (secret word etc.) for the current round. */
export async function fetchRoomPrivate(code: string): Promise<Record<string, any>> {
  const { data, error } = await supabase.from("rooms").select("private_state").eq("code", code).maybeSingle();
  if (error) throw new Error(error.message);
  return ((data as { private_state?: Record<string, any> } | null)?.private_state) ?? {};
}

/** Join as the guest — race-safe: only claims the seat if it is still empty. */
export async function joinRoom(code: string, name: string): Promise<Room> {
  const pid = getPlayerId();
  const existing = await fetchRoom(code);
  if (!existing) throw new Error("We couldn't find that room — check the code.");
  if (existing.role !== "observer") {
    // already seated (e.g. a reconnection); refresh display name if given
    if (name && name !== (existing.role === "host" ? existing.hostName : existing.guestName)) {
      const field = existing.role === "host" ? "host_name" : "guest_name";
      await supabase.from("rooms").update({ [field]: name }).eq("code", code);
    }
    return { ...existing, hostName: existing.role === "host" ? name || existing.hostName : existing.hostName, guestName: existing.role === "guest" ? name || existing.guestName : existing.guestName };
  }
  if (existing.guestId) throw new Error("This room is full");
  const { data, error } = await supabase
    .from("rooms")
    .update({ guest_id: pid, guest_name: name })
    .eq("code", code)
    .is("guest_id", null)
    .select("code");
  if (error) throw new Error(error.message || "Could not join room");
  if (!data || data.length === 0) {
    // someone else grabbed the seat, or we were seated concurrently
    const after = await fetchRoom(code);
    if (after && after.role !== "observer") return after;
    throw new Error("This room is full");
  }
  const fresh = await fetchRoom(code);
  if (!fresh) throw new Error("We couldn't find that room — check the code.");
  return fresh;
}

/* ---------------- room actions (all as whole-column merges) ---------------- */

async function patchRoom(code: string, patch: Record<string, any>): Promise<void> {
  const { error } = await supabase
    .from("rooms")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("code", code);
  if (error) throw new Error(error.message || "Could not update room");
}

/** Host picks a game for the room (or clears it back to the lobby). */
export async function setRoomGame(code: string, game: string | null): Promise<void> {
  if (game === null) {
    await patchRoom(code, { game: null, phase: "lobby", state: {}, private_state: {} });
  } else {
    await patchRoom(code, { game, phase: "playing", state: {}, private_state: {} });
  }
}

export async function exitRoomGame(code: string): Promise<void> {
  await setRoomGame(code, null);
}

/** Merge a patch into the room's public game state. */
export async function updateRoomState(code: string, current: Record<string, any>, patch: Record<string, any>): Promise<Record<string, any>> {
  const next = { ...current, ...patch };
  await patchRoom(code, { state: next });
  return next;
}

/** Replace the hidden state (secret roles payload such as the doodle word). */
export async function updateRoomPrivate(code: string, privateState: Record<string, any>): Promise<void> {
  await patchRoom(code, { private_state: privateState });
}

/* ---------------- realtime hook ---------------- */

export type BroadcastHandler = (payload: any) => void;

export interface RoomChannel {
  room: Room | null;
  error: string | null;
  loading: boolean;
  /** pids currently present in the channel */
  peers: string[];
  refresh: () => Promise<void>;
  broadcast: (event: string, payload?: any) => Promise<void>;
  /** subscribe to a custom broadcast event; returns unsubscribe */
  onBroadcast: (event: string, cb: BroadcastHandler) => () => void;
  connected: boolean;
}

export function useRoom(code: string | undefined): RoomChannel {
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [peers, setPeers] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const handlersRef = useRef(new Map<string, Set<BroadcastHandler>>());
  const codeRef = useRef(code);
  codeRef.current = code;

  const refresh = useCallback(async () => {
    const c = codeRef.current;
    if (!c) return;
    try {
      const fresh = await fetchRoom(c);
      setRoom((prev) => {
        // keep my known role even if a stale read races a join write
        return fresh;
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load room");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    void refresh();

    const pid = getPlayerId();
    const channel = supabase.channel(`room:${code}`, {
      config: { presence: { key: pid }, broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel.on("broadcast", { event: "cp-msg" }, (msg) => {
      const event: string = msg?.payload?.event;
      const payload = msg?.payload?.payload;
      if (event === "state-changed") void refresh();
      const set = handlersRef.current.get(event);
      if (set) set.forEach((cb) => cb(payload));
    });

    channel.on("presence", { event: "sync" }, () => {
      setPeers(Object.keys(channel.presenceState()));
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setConnected(true);
        await channel.track({ pid, at: Date.now() });
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        setConnected(false);
      }
    });

    // slow poll as a safety net — heals any missed broadcast (e.g. after sleep)
    const poll = window.setInterval(() => void refresh(), 6000);
    const onFocus = () => void refresh();
    const onOnline = () => void refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      window.clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onFocus);
      supabase.removeChannel(channel);
      channelRef.current = null;
      handlersRef.current.clear();
      setConnected(false);
    };
  }, [code, refresh]);

  const broadcast = useCallback(async (event: string, payload: any = {}) => {
    const channel = channelRef.current;
    if (!channel) return;
    try {
      await channel.send({ type: "broadcast", event: "cp-msg", payload: { event, payload } });
    } catch {
      /* offline — polling will heal */
    }
  }, []);

  const onBroadcast = useCallback((event: string, cb: BroadcastHandler) => {
    let set = handlersRef.current.get(event);
    if (!set) {
      set = new Set();
      handlersRef.current.set(event, set);
    }
    set.add(cb);
    return () => {
      set.delete(cb);
    };
  }, []);

  return { room, error, loading, peers, refresh, broadcast, onBroadcast, connected };
}
