import { useEffect, useRef } from "react";
import { Check, X } from "lucide-react";

/** Native modal supplies focus trapping, background inertness, and Escape dismissal. */
export function SongRequestConfirmation({
  song,
  onClose,
}: {
  song: {
    title: string;
    artist: string;
    preferredTime?: string;
    experience?: string;
    sessionDate?: string;
  };
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      className="song-confirmation"
      aria-labelledby="song-confirmation-title"
      aria-describedby="song-confirmation-description"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <button
        type="button"
        className="song-confirmation-close"
        aria-label="Close confirmation"
        onClick={onClose}
      >
        <X size={18} />
      </button>
      <div className="song-confirmation-icon" aria-hidden="true">
        <Check size={44} strokeWidth={1.5} />
      </div>
      <p className="song-confirmation-eyebrow">SENT TO THE MUSIC TEAM</p>
      <h2 id="song-confirmation-title">Request submitted</h2>
      <div className="song-confirmation-track">
        <h3>{song.title}</h3>
        <p>{song.artist}</p>
        {song.experience ? (
          <p className="program-receipt-context">
            {song.experience}
            {song.sessionDate ? ` · ${song.sessionDate}` : ""}
          </p>
        ) : null}
        {song.preferredTime && song.preferredTime !== "Any time" ? (
          <div className="song-confirmation-time">
            Preferred play time · {song.preferredTime}
            <small>Subject to approval</small>
          </div>
        ) : null}
      </div>
      <p id="song-confirmation-description">
        Your song request is with the music team.
        <br />
        Follow its progress in My requests.
      </p>
      <button
        type="button"
        className="music-primary song-confirmation-done"
        autoFocus
        onClick={onClose}
      >
        Done
      </button>
    </dialog>
  );
}
