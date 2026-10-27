# Daily music program

The Requests page at `/` automatically displays one active experience, using the device's **local system clock**. The schedule repeats daily. Midnight means **12:00 AM**, not noon.

| Experience | Default window |
| --- | --- |
| Lobby music | 4:00 AM–8:00 PM |
| Live singer | 8:00 PM–midnight |
| DJ | Midnight–4:00 AM |

The 4:00 AM DJ cutoff is an editable demo assumption. Change all three start times in **Staff desk → Music program**, then save. Each experience ends when the next starts, leaving no gaps. Start times must follow Lobby → Singer → DJ around the clock.

## Preview versus live control

- **Requests → Preview experiences** offers Automatic, Lobby, Singer, and DJ buttons for presentation/testing. Preview only changes the experience in that browser tab. It is clearly labeled, does not change the saved schedule, and resets to Automatic on reload.
- **Automatic** uses the live schedule or a saved manager override. It refreshes at session boundaries and when returning to the browser tab.
- **Staff desk → Live experience override** changes the actual live experience in the demo. Choose Automatic to restore the clock-based schedule.
- Closing requests never displays a different experience as a fallback.

## Advance requests and concierge entry

Advance requests are **off by default for every experience**. Staff can enable them independently and save. Guests then see a separate, optional “Request music for a later session” control for enabled experiences. They choose an experience and session date before selecting a song.

The session date is the **date its scheduled window starts**. A DJ session starting at 11 PM on Tuesday and continuing until 4 AM Wednesday belongs to Tuesday. A session starting at midnight Wednesday belongs to Wednesday.

Staff can also use **Add a song for a guest** to submit to the active session or an enabled future session. Future requests remain subject to review; neither a request nor a preferred time is a confirmed performance or paid reservation.

## Queue separation

Each request records its music mode and session date. Lobby, singer, and DJ queues are separate, including distinct dates for future sessions. Existing untagged demonstration songs are treated as legacy singer requests without resetting stored data.

**Music console** follows the current/preview experience by default. Operators can explicitly select a mode and date, or use the advance-request shortcut. They can accept future requests, but playback remains unavailable until the selected session is active. One-click acceptance, the stable running order, and inline guest statuses remain unchanged.

## Persistence and verification

The program is stored under `vsph:music-program:v1`. Existing request storage is retained. Program changes and requests synchronize across tabs on the same browser origin; separate devices require a shared backend. Concurrent writes use demo-level, last-write-wins storage rather than production transaction handling.

Run:

```sh
npm run test:program
npm run build
```

Tests cover exact boundaries, overnight dates, schedule validation, preferred-time windows, legacy request compatibility, and isolation between modes/dates.
