import { useState } from "react";
import { Clock3, FlaskConical, CalendarDays } from "lucide-react";
import { useMusicProgram } from "./MusicProgramProvider";
import {
  MUSIC_MODES,
  localDate,
  nextSession,
  modeWindow,
  type MusicMode,
} from "./musicProgram";
export interface BookingTarget {
  mode: MusicMode;
  date: string;
}
export function GuestProgramControls({
  booking,
  onBooking,
}: {
  booking: BookingTarget | null;
  onBooking: (b: BookingTarget | null) => void;
}) {
  const { program, now, mode, preview, setPreview } = useMusicProgram();
  const available = MUSIC_MODES.filter(
    (m) =>
      program.experiences[m].advanceEnabled &&
      program.experiences[m].requestsEnabled,
  );
  const [futureMode, setFutureMode] = useState<MusicMode>("singer");
  const target = available.includes(futureMode) ? futureMode : available[0];
  const [date, setDate] = useState("");
  const minimum = target ? localDate(nextSession(target, now, program)) : "";
  return (
    <div className="program-controls">
      <p className="program-session-label">
        <Clock3 size={15} />
        {program.experiences[mode].title} · {modeWindow(mode, program)}
        <span>
          {preview !== "auto"
            ? "Preview mode"
            : program.override !== "auto"
              ? "Manager override"
              : "Automatic schedule"}
        </span>
      </p>
      <details className="program-preview">
        <summary>
          <FlaskConical size={14} />
          Preview experiences <span>Demo testing</span>
        </summary>
        <div
          className="program-choice-group"
          aria-label="Preview music experience"
        >
          {(["auto", ...MUSIC_MODES] as const).map((m) => (
            <button
              key={m}
              aria-pressed={preview === m}
              onClick={() => {
                setPreview(m);
                onBooking(null);
              }}
            >
              {m === "auto" ? "Automatic" : program.experiences[m].title}
            </button>
          ))}
        </div>
        <p>
          {preview === "auto"
            ? "Uses this device’s local clock. The page switches when the next session begins."
            : "Preview only. Return to Automatic to follow the live schedule."}
        </p>
      </details>
      {booking ? (
        <div className="program-booking-banner">
          <CalendarDays size={17} />
          <span>
            Advance request · {program.experiences[booking.mode].title}
            <small>
              {booking.date} · {modeWindow(booking.mode, program)}
            </small>
          </span>
          <button className="music-text-button" onClick={() => onBooking(null)}>
            Back to current music
          </button>
        </div>
      ) : available.length ? (
        <details className="program-advance">
          <summary>
            <CalendarDays size={15} />
            Request music for a later session
          </summary>
          <p>
            Advance requests are open for selected experiences. Times remain
            subject to approval.
          </p>
          <div className="program-form-grid">
            <label>
              Experience
              <select
                value={target}
                onChange={(e) => {
                  setFutureMode(e.target.value as MusicMode);
                  setDate("");
                }}
              >
                {available.map((m) => (
                  <option value={m} key={m}>
                    {program.experiences[m].title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Session date
              <input
                type="date"
                min={minimum}
                value={date && date >= minimum ? date : minimum}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          </div>
          <button
            className="music-secondary"
            disabled={!target || Boolean(date && date < minimum)}
            onClick={() => onBooking({ mode: target, date: date || minimum })}
          >
            Choose a song for this session
          </button>
        </details>
      ) : null}
    </div>
  );
}
