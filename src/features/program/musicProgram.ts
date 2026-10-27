import type { ServiceRequest } from "@/types";
export const MUSIC_MODES = ["lobby", "singer", "dj"] as const;
export type MusicMode = (typeof MUSIC_MODES)[number];
export type ModeChoice = "auto" | MusicMode;
export interface MusicExperience {
  title: string;
  performer: string;
  description: string;
  venue: string;
  requestsEnabled: boolean;
  advanceEnabled: boolean;
}
export interface MusicProgram {
  starts: Record<MusicMode, string>;
  override: ModeChoice;
  experiences: Record<MusicMode, MusicExperience>;
}
export const DEFAULT_PROGRAM: MusicProgram = {
  starts: { lobby: "04:00", singer: "20:00", dj: "00:00" },
  override: "auto",
  experiences: {
    lobby: {
      title: "Lobby music",
      performer: "The Lobby Collection",
      description:
        "Easy listening, timeless favourites, and a little atmosphere.",
      venue: "Lobby Lounge",
      requestsEnabled: true,
      advanceEnabled: false,
    },
    singer: {
      title: "Live with the band",
      performer: "Aarav & The Marina Collective",
      description: "Your favourite songs, performed live.",
      venue: "Lobby Lounge",
      requestsEnabled: true,
      advanceEnabled: false,
    },
    dj: {
      title: "After-hours DJ",
      performer: "Resident DJ",
      description: "Late-night favourites. A soundtrack for the after-hours.",
      venue: "Lobby Lounge",
      requestsEnabled: true,
      advanceEnabled: false,
    },
  },
};
export function localDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function minutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}
export function validTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
export function clockLabel(value: string) {
  const n = minutes(value);
  return `${Math.floor(n / 60) % 12 || 12}:${String(n % 60).padStart(2, "0")} ${n < 720 ? "AM" : "PM"}`;
}
export function validProgram(p: MusicProgram) {
  if (!MUSIC_MODES.every((m) => validTime(p.starts[m]))) return false;
  const a = minutes(p.starts.lobby),
    b = minutes(p.starts.singer),
    c = minutes(p.starts.dj);
  return (
    (b - a + 1440) % 1440 > 0 &&
    (c - b + 1440) % 1440 > 0 &&
    (a - c + 1440) % 1440 > 0 &&
    ((b - a + 1440) % 1440) +
      ((c - b + 1440) % 1440) +
      ((a - c + 1440) % 1440) ===
      1440
  );
}
export function modeAt(now: Date, p: MusicProgram): MusicMode {
  const n = now.getHours() * 60 + now.getMinutes();
  return [...MUSIC_MODES].sort(
    (a, b) =>
      ((n - minutes(p.starts[a]) + 1440) % 1440) -
      ((n - minutes(p.starts[b]) + 1440) % 1440),
  )[0];
}
export function modeWindow(mode: MusicMode, p: MusicProgram) {
  const next = MUSIC_MODES[(MUSIC_MODES.indexOf(mode) + 1) % 3];
  return `${clockLabel(p.starts[mode])} – ${clockLabel(p.starts[next])}`;
}
export function sessionStart(mode: MusicMode, now: Date, p: MusicProgram) {
  const d = new Date(now);
  const n = minutes(p.starts[mode]);
  d.setHours(Math.floor(n / 60), n % 60, 0, 0);
  if (d > now) d.setDate(d.getDate() - 1);
  return d;
}
export function nextSession(mode: MusicMode, now: Date, p: MusicProgram) {
  const d = sessionStart(mode, now, p);
  d.setDate(d.getDate() + 1);
  return d;
}
export function sessionDateTime(
  mode: MusicMode,
  date: string,
  p: MusicProgram,
) {
  return new Date(`${date}T${p.starts[mode]}:00`);
}
export function sessionMatches(
  r: ServiceRequest,
  mode: MusicMode,
  date: string,
  legacyDate = date,
) {
  return (
    r.service === "music" &&
    (r.meta["Music mode"] ?? "singer") === mode &&
    (r.meta["Session date"]
      ? r.meta["Session date"] === date
      : date === legacyDate)
  );
}
export function readProgram(raw: string | null): MusicProgram {
  try {
    const stored = JSON.parse(raw ?? "null");
    if (!stored) return structuredClone(DEFAULT_PROGRAM);
    const p: MusicProgram = {
      starts: { ...DEFAULT_PROGRAM.starts, ...stored.starts },
      override: ["auto", ...MUSIC_MODES].includes(stored.override)
        ? stored.override
        : "auto",
      experiences: { ...DEFAULT_PROGRAM.experiences },
    };
    for (const mode of MUSIC_MODES)
      p.experiences[mode] = {
        ...DEFAULT_PROGRAM.experiences[mode],
        ...stored.experiences?.[mode],
      };
    return validProgram(p) ? p : structuredClone(DEFAULT_PROGRAM);
  } catch {
    return structuredClone(DEFAULT_PROGRAM);
  }
}
export function timeInSession(value: string, mode: MusicMode, p: MusicProgram) {
  if (!validTime(value)) return false;
  const start = minutes(p.starts[mode]),
    end = minutes(p.starts[MUSIC_MODES[(MUSIC_MODES.indexOf(mode) + 1) % 3]]);
  return (minutes(value) - start + 1440) % 1440 < (end - start + 1440) % 1440;
}
export function quickTimes(
  mode: MusicMode,
  date: string,
  now: Date,
  p: MusicProgram,
  preview: boolean,
) {
  const start = sessionDateTime(mode, date, p);
  const next = MUSIC_MODES[(MUSIC_MODES.indexOf(mode) + 1) % 3];
  const length =
    (minutes(p.starts[next]) - minutes(p.starts[mode]) + 1440) % 1440;
  const end = new Date(start.getTime() + length * 60000);
  let first = new Date(start.getTime() + 90 * 60000);
  if (!preview && first < now)
    first = new Date(Math.ceil(now.getTime() / 1800000) * 1800000);
  return [
    first,
    new Date(first.getTime() + 30 * 60000),
    new Date(first.getTime() + 90 * 60000),
  ]
    .filter((d) => d < end)
    .map((d) => {
      const value = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      return { value, label: clockLabel(value) };
    });
}
