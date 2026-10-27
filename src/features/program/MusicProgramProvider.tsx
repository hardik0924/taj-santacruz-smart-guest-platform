import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_PROGRAM,
  MUSIC_MODES,
  modeAt,
  localDate,
  sessionStart,
  readProgram,
  validProgram,
  type MusicMode,
  type MusicProgram,
  type ModeChoice,
} from "./musicProgram";
const KEY = "vsph:music-program:v1";
interface ProgramContext {
  program: MusicProgram;
  now: Date;
  preview: ModeChoice;
  setPreview: (m: ModeChoice) => void;
  liveMode: MusicMode;
  mode: MusicMode;
  date: string;
  saveProgram: (p: MusicProgram) => boolean;
  refreshClock: () => void;
}
const Context = createContext<ProgramContext | null>(null);
export function MusicProgramProvider({ children }: { children: ReactNode }) {
  const [program, setProgram] = useState(() => {
    try {
      return readProgram(localStorage.getItem(KEY));
    } catch {
      return structuredClone(DEFAULT_PROGRAM);
    }
  });
  const [preview, setPreview] = useState<ModeChoice>("auto");
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      const current = new Date();
      setNow(current);
      const boundaries = MUSIC_MODES.map((mode) => {
        const d = new Date(current);
        const [h, m] = program.starts[mode].split(":").map(Number);
        d.setHours(h, m, 0, 0);
        if (d <= current) d.setDate(d.getDate() + 1);
        return d.getTime() - current.getTime();
      });
      timer = setTimeout(
        refresh,
        Math.max(100, Math.min(30000, ...boundaries)),
      );
    };
    refresh();
    const focus = () => {
      clearTimeout(timer);
      refresh();
    };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [program.starts]);
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key === KEY) setProgram(readProgram(e.newValue));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const liveMode =
    program.override === "auto" ? modeAt(now, program) : program.override;
  const mode = preview === "auto" ? liveMode : preview;
  // Preview renders the selected experience for today; it never changes the live schedule.
  const date =
    preview === "auto" && program.override === "auto"
      ? localDate(sessionStart(mode, now, program))
      : localDate(now);
  function saveProgram(next: MusicProgram) {
    if (!validProgram(next)) return false;
    setProgram(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* In-memory controls still work without storage. */
    }
    return true;
  }
  return (
    <Context.Provider
      value={{
        program,
        now,
        preview,
        setPreview,
        liveMode,
        mode,
        date,
        saveProgram,
        refreshClock: () => setNow(new Date()),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useMusicProgram() {
  const c = useContext(Context);
  if (!c) throw new Error("MusicProgramProvider is required");
  return c;
}
