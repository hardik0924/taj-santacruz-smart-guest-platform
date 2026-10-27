import { useState } from "react";
import { useRequests } from "@/store/RequestsProvider";
import { SONG_CATALOGUE } from "@/data/music";
import { useMusicProgram } from "./MusicProgramProvider";
import {
  MUSIC_MODES,
  localDate,
  sessionStart,
  nextSession,
  validProgram,
  sessionDateTime,
  modeWindow,
  type MusicMode,
} from "./musicProgram";
export function MusicProgramSettings() {
  const { program, now, liveMode, saveProgram } = useMusicProgram();
  const { createRequest } = useRequests();
  const activeDate =
    program.override === "auto"
      ? localDate(sessionStart(liveMode, now, program))
      : localDate(now);
  const [draft, setDraft] = useState(() => structuredClone(program));
  const [feedback, setFeedback] = useState("");
  const [requestMode, setRequestMode] = useState<MusicMode>(liveMode);
  const [requestDate, setRequestDate] = useState(activeDate);
  const [songId, setSongId] = useState(SONG_CATALOGUE[0].id);
  const [guest, setGuest] = useState("Table 08");
  const [note, setNote] = useState("");
  const [requestFeedback, setRequestFeedback] = useState("");
  function addRequest(event: React.FormEvent) {
    event.preventDefault();
    const song = SONG_CATALOGUE.find((s) => s.id === songId);
    const start = sessionDateTime(requestMode, requestDate, program);
    const currentDate =
      requestMode === liveMode
        ? activeDate
        : localDate(sessionStart(requestMode, now, program));
    if (!song || !requestDate || Number.isNaN(start.getTime())) return;
    if (!program.experiences[requestMode].requestsEnabled) {
      setRequestFeedback(
        "Requests are closed for this experience. Enable requests and save settings first.",
      );
      return;
    }
    const current = requestMode === liveMode && requestDate === currentDate;
    const future = !current && start > now;
    if (!future && !current) {
      setRequestFeedback("Choose the active session or a future session date.");
      return;
    }
    if (future && !program.experiences[requestMode].advanceEnabled) {
      setRequestFeedback(
        "Enable advance requests for this experience and save settings first.",
      );
      return;
    }
    createRequest(
      {
        service: "music",
        title: `Song request — ${song.title}`,
        description: `Added by staff for ${guest.trim() || "Table 08"}.`,
        guestNote: note.trim() || undefined,
        votes: 0,
        meta: {
          Track: song.title,
          Artist: song.artist,
          Genre: song.genre,
          "Music mode": requestMode,
          "Session date": requestDate,
          Experience: program.experiences[requestMode].title,
          "Requested by": `Staff for ${guest.trim() || "Table 08"}`,
          "Preferred play time": "Any time",
          "Advance request": future ? "Yes" : "No",
        },
      },
      { silent: true },
    );
    setRequestFeedback(
      `${song.title} added to ${program.experiences[requestMode].title} for ${requestDate}.`,
    );
    setNote("");
  }
  return (
    <div className="program-management">
      <header>
        <p className="music-kicker">MUSIC PROGRAMMING</p>
        <h2>The right music. At the right time.</h2>
        <p>
          Automatic scheduling follows this device’s local clock. Midnight is
          12:00 AM. Save changes to apply them across the demo.
        </p>
      </header>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setFeedback(
            saveProgram(draft)
              ? "Music program saved."
              : "Start times must be different and follow Lobby → Singer → DJ around the clock.",
          );
        }}
      >
        <section className="program-settings-card">
          <h3>Daily schedule</h3>
          <div className="program-form-grid">
            {MUSIC_MODES.map((m) => (
              <label key={m}>
                {m === "singer" ? "Singer" : m === "dj" ? "DJ" : "Lobby"} starts
                <input
                  required
                  type="time"
                  value={draft.starts[m]}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      starts: { ...draft.starts, [m]: e.target.value },
                    })
                  }
                />
              </label>
            ))}
          </div>
          <p className="program-helper">
            Each experience runs until the next begins. The schedule repeats
            daily, including across midnight.
          </p>
          <label className="program-override-label">
            Live experience override
            <select
              value={draft.override}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  override: e.target.value as typeof draft.override,
                })
              }
            >
              <option value="auto">Automatic · use the system clock</option>
              {MUSIC_MODES.map((m) => (
                <option key={m} value={m}>
                  {draft.experiences[m].title}
                </option>
              ))}
            </select>
          </label>
          <p className="program-helper">
            An override changes the live guest experience. Guest preview
            controls do not.
          </p>
        </section>
        {MUSIC_MODES.map((m) => (
          <section className="program-settings-card" key={m}>
            <div className="music-section-heading">
              <h3>
                {m === "singer"
                  ? "Singer experience"
                  : m === "dj"
                    ? "DJ experience"
                    : "Lobby experience"}
              </h3>
              <span className="music-pill">
                {modeWindow(m, validProgram(draft) ? draft : program)}
              </span>
            </div>
            <div className="program-form-grid">
              <label>
                Display title
                <input
                  required
                  maxLength={60}
                  value={draft.experiences[m].title}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      experiences: {
                        ...draft.experiences,
                        [m]: { ...draft.experiences[m], title: e.target.value },
                      },
                    })
                  }
                />
              </label>
              <label>
                Performer / collection
                <input
                  required
                  maxLength={80}
                  value={draft.experiences[m].performer}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      experiences: {
                        ...draft.experiences,
                        [m]: {
                          ...draft.experiences[m],
                          performer: e.target.value,
                        },
                      },
                    })
                  }
                />
              </label>
              <label>
                Venue
                <input
                  required
                  maxLength={60}
                  value={draft.experiences[m].venue}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      experiences: {
                        ...draft.experiences,
                        [m]: { ...draft.experiences[m], venue: e.target.value },
                      },
                    })
                  }
                />
              </label>
              <label>
                Guest introduction
                <input
                  required
                  maxLength={160}
                  value={draft.experiences[m].description}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      experiences: {
                        ...draft.experiences,
                        [m]: {
                          ...draft.experiences[m],
                          description: e.target.value,
                        },
                      },
                    })
                  }
                />
              </label>
            </div>
            {(["requestsEnabled", "advanceEnabled"] as const).map((field) => (
              <div className="music-setting-row" key={field}>
                <div>
                  <strong>
                    {field === "requestsEnabled"
                      ? "Accept song requests"
                      : "Allow advance requests"}
                  </strong>
                  <small>
                    {field === "requestsEnabled"
                      ? "Close requests without switching to another experience."
                      : "Let guests and staff request songs for a future session."}
                  </small>
                </div>
                <button
                  type="button"
                  role="switch"
                  className="music-switch"
                  aria-label={`${m} ${field === "requestsEnabled" ? "requests" : "advance requests"}`}
                  aria-checked={draft.experiences[m][field]}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      experiences: {
                        ...draft.experiences,
                        [m]: {
                          ...draft.experiences[m],
                          [field]: !draft.experiences[m][field],
                        },
                      },
                    })
                  }
                >
                  <span />
                </button>
              </div>
            ))}
          </section>
        ))}
        <div className="program-save-row">
          <button className="music-primary" type="submit">
            Save music program
          </button>
          <button
            type="button"
            className="music-secondary"
            onClick={() => {
              setDraft(structuredClone(program));
              setFeedback("Unsaved changes discarded.");
            }}
          >
            Discard changes
          </button>
          <p role="status">{feedback}</p>
        </div>
      </form>
      <section className="program-settings-card">
        <p className="music-kicker">CONCIERGE REQUEST</p>
        <h3>Add a song for a guest</h3>
        <p className="program-helper">
          Choose the current session or an enabled future session. The request
          arrives in the matching performer queue for review.
        </p>
        <form onSubmit={addRequest}>
          <div className="program-form-grid">
            <label>
              Experience
              <select
                value={requestMode}
                onChange={(e) => {
                  const m = e.target.value as MusicMode;
                  setRequestMode(m);
                  setRequestDate(
                    m === liveMode
                      ? activeDate
                      : localDate(nextSession(m, now, program)),
                  );
                }}
              >
                {MUSIC_MODES.map((m) => (
                  <option key={m} value={m}>
                    {program.experiences[m].title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Session date
              <input
                type="date"
                required
                value={requestDate}
                min={localDate(sessionStart(requestMode, now, program))}
                onChange={(e) => setRequestDate(e.target.value)}
              />
            </label>
            <label>
              Song
              <select
                value={songId}
                onChange={(e) => setSongId(e.target.value)}
              >
                {SONG_CATALOGUE.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.title} · {s.artist}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Guest / table
              <input
                value={guest}
                maxLength={80}
                onChange={(e) => setGuest(e.target.value)}
              />
            </label>
            <label className="program-full-field">
              Dedication (optional)
              <input
                value={note}
                maxLength={180}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          </div>
          <button className="music-primary" type="submit">
            Add guest request
          </button>
          <p role="status" className="program-helper">
            {requestFeedback}
          </p>
        </form>
      </section>
    </div>
  );
}
