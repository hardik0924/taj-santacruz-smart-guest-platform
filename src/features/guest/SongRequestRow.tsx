import type { ServiceRequest } from "@/types";

export function SongRequestStatus({ request }: { request: ServiceRequest }) {
  const label =
    request.status === "submitted"
      ? "Waiting"
      : request.status === "rejected"
        ? "Declined"
        : request.status === "cancelled"
          ? "Cancelled"
          : request.status === "completed"
            ? "Played"
            : request.stage === "deferred"
              ? "On hold"
              : request.stage === "playing"
                ? "Playing"
                : request.stage === "queued"
                  ? "Queued"
                  : "Accepted";
  return (
    <span
      className={`song-inline-status song-status-${request.status}`}
      aria-live="polite"
    >
      <span aria-hidden="true" />
      {label}
    </span>
  );
}

/** A status card, deliberately without a detail-page link or operational metadata. */
export function SongRequestRow({ request }: { request: ServiceRequest }) {
  const preferred = request.meta["Preferred play time"];
  return (
    <div className="music-my-row song-request-summary">
      <div>
        <strong>{request.meta.Track ?? request.title}</strong>
        <small>
          {request.meta.Artist}
          {request.meta["Advance request"] === "Yes"
            ? ` · ${request.meta["Experience"]} · ${request.meta["Session date"]}`
            : ""}
          {preferred && preferred !== "Any time"
            ? ` · Preferred: ${preferred}`
            : ""}
        </small>
      </div>
      <SongRequestStatus request={request} />
    </div>
  );
}
