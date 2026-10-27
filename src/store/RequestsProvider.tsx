import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react';
import type {
  AppNotification,
  CelebrationEnquiry,
  EnquiryStatus,
  GuestSession,
  HotelLocation,
  MusicRules,
  Musician,
  NotificationAudience,
  RequestSource,
  RequestStage,
  RequestStatus,
  ServiceRequest,
} from '@/types';
import { DEFAULT_LOCATION_ID, GUEST_LOCATIONS, findLocation, locationFromSearch } from '@/data/property';
import { buildSeed, DEMO_GUEST_NAME, DEMO_GUEST_REF } from '@/data/requests';
import { buildEnquirySeed } from '@/data/celebrations';
import { DEFAULT_MUSIC_RULES } from '@/data/music';
import { MUSICIAN_SEED, uniqueUsername, usernameFromName } from '@/data/musicians';
import {
  applyTransition,
  buildRequest,
  canTransition,
  isTerminal,
  statusLabel,
  type NewRequestInput,
  type TransitionOptions,
} from '@/services/requestEngine';
import {
  buildEnquiry,
  canEnquiryTransition,
  enquiryNextHint,
  enquiryStatusLabel,
  type NewEnquiryInput,
} from '@/services/enquiryEngine';

/* -------------------------------------------------------------------------- */
/* Persistence                                                                */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = 'smart-guest-platform:v1';
/** Bumped to 4 for musicians + role log-ins — older stored demos reseed. */
const STATE_VERSION = 4;
/** Re-anchor seeded timestamps if the prototype has been left idle this long. */
const REANCHOR_AFTER_MS = 14 * 60 * 60 * 1000;

interface PersistedState {
  version: number;
  seededAt: number;
  sequence: number;
  enquirySequence: number;
  session: GuestSession;
  requests: ServiceRequest[];
  enquiries: CelebrationEnquiry[];
  musicians: Musician[];
  musicRules: MusicRules;
  notifications: AppNotification[];
  ribbonCollapsed: boolean;
}

function shiftTimestamps(state: PersistedState, delta: number): PersistedState {
  return {
    ...state,
    seededAt: state.seededAt + delta,
    requests: state.requests.map((request) => ({
      ...request,
      submittedAt: request.submittedAt + delta,
      updatedAt: request.updatedAt + delta,
      history: request.history.map((event) => ({ ...event, at: event.at + delta })),
    })),
    enquiries: state.enquiries.map((enquiry) => ({
      ...enquiry,
      submittedAt: enquiry.submittedAt + delta,
      updatedAt: enquiry.updatedAt + delta,
      history: enquiry.history.map((event) => ({ ...event, at: event.at + delta })),
      internalNotes: enquiry.internalNotes.map((note) => ({ ...note, at: note.at + delta })),
    })),
    notifications: state.notifications.map((notification) => ({
      ...notification,
      at: notification.at + delta,
    })),
  };
}

function createInitialState(now: number): PersistedState {
  const seed = buildSeed(now);
  return {
    version: STATE_VERSION,
    seededAt: now,
    sequence: seed.sequence,
    enquirySequence: 3300,
    session: {
      guestRef: DEMO_GUEST_REF,
      guestName: DEMO_GUEST_NAME,
      locationId: DEFAULT_LOCATION_ID,
      entry: 'qr',
    },
    requests: seed.requests,
    enquiries: buildEnquirySeed(now),
    musicians: [...MUSICIAN_SEED],
    musicRules: { ...DEFAULT_MUSIC_RULES },
    notifications: seed.notifications,
    ribbonCollapsed: false,
  };
}

function loadState(now: number): PersistedState {
  return applyScannedLocation(readPersisted(now));
}

/**
 * A table-tent QR code carries `?loc=<table-id>`. When present it decides the
 * session location — the guest "arrived" by scanning their table — and the
 * parameter is stripped so later navigation keeps the chosen table.
 */
function applyScannedLocation(state: PersistedState): PersistedState {
  if (typeof window === 'undefined') return state;
  const params = new URLSearchParams(window.location.search);
  if (!params.has('loc')) return state;

  const locationId = locationFromSearch(window.location.search);
  params.delete('loc');
  const query = params.toString();
  try {
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`,
    );
  } catch {
    // History may be unavailable in embedded previews — the location still applies.
  }
  return { ...state, session: { ...state.session, locationId, entry: 'qr' } };
}

function readPersisted(now: number): PersistedState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState(now);

    const parsed = JSON.parse(raw) as PersistedState;
    if (
      !parsed ||
      parsed.version !== STATE_VERSION ||
      !Array.isArray(parsed.requests) ||
      parsed.requests.length === 0 ||
      !Array.isArray(parsed.enquiries)
    ) {
      return createInitialState(now);
    }

    const idleFor = now - parsed.seededAt;
    const withDefaults: PersistedState = {
      ...parsed,
      musicRules: { ...DEFAULT_MUSIC_RULES, ...parsed.musicRules },
      musicians: Array.isArray(parsed.musicians) && parsed.musicians.length > 0
        ? parsed.musicians
        : [...MUSICIAN_SEED],
    };
    if (idleFor > REANCHOR_AFTER_MS) return shiftTimestamps(withDefaults, idleFor);
    return withDefaults;
  } catch {
    // Corrupt storage must never break the demo — fall back to a fresh seed.
    return createInitialState(now);
  }
}

function saveState(state: PersistedState): void {
  try {
    const serialized = JSON.stringify(state);
    if (window.localStorage.getItem(STORAGE_KEY) !== serialized) window.localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Storage may be unavailable (private mode). The prototype still works in memory.
  }
}

/* -------------------------------------------------------------------------- */
/* Reducer                                                                    */
/* -------------------------------------------------------------------------- */

interface AssignOptions {
  staff: string;
  by: string;
  note?: string;
}

type Action =
  | { type: 'hydrate'; state: PersistedState }
  | { type: 'create'; request: ServiceRequest; now: number }
  | { type: 'transition'; id: string; status: RequestStatus; options: TransitionOptions; now: number }
  /** Stage-only update within an open request (e.g. queued → playing). */
  | { type: 'stage'; id: string; stage: RequestStage; options: { by: string; note?: string }; now: number }
  | { type: 'assign'; id: string; options: AssignOptions; now: number }
  | { type: 'dedication'; id: string; hidden: boolean; by: string; note?: string; now: number }
  | { type: 'vote'; id: string }
  | { type: 'createEnquiry'; enquiry: CelebrationEnquiry; now: number }
  | {
      type: 'enquiryStatus';
      id: string;
      status: EnquiryStatus;
      by: string;
      note?: string;
      now: number;
    }
  | { type: 'enquiryNote'; id: string; note: { id: string; at: number; by: string; body: string }; now: number }
  | { type: 'enquiryAssign'; id: string; staff: string; by: string; now: number }
  | {
      type: 'enquiryMusicianAssign';
      id: string;
      musicianId: string | null;
      musicianName: string | null;
      by: string;
      now: number;
    }
  | { type: 'createMusician'; musician: Musician }
  | { type: 'deleteMusician'; id: string }
  | { type: 'enquiryProposal'; id: string; packageLabel: string; by: string; note?: string; now: number }
  | { type: 'setMusicRules'; rules: Partial<MusicRules> }
  | { type: 'setLocation'; locationId: string }
  | { type: 'setEntry'; entry: RequestSource }
  | { type: 'markRead'; all?: boolean; department?: string }
  | { type: 'setRibbon'; collapsed: boolean }
  | { type: 'reset'; now: number };

function notify(
  existing: AppNotification[],
  entries: AppNotification[],
): AppNotification[] {
  return [...entries, ...existing].slice(0, 60);
}

function staffNotification(
  request: ServiceRequest,
  title: string,
  body: string,
  now: number,
): AppNotification {
  return {
    id: `n_${now}_${request.ref}_s`,
    title,
    body,
    at: now,
    read: false,
    audience: 'staff',
    department: request.department,
    ref: request.ref,
  };
}

function guestNotification(
  request: ServiceRequest,
  title: string,
  body: string,
  now: number,
): AppNotification {
  return {
    id: `n_${now}_${request.ref}_g`,
    title,
    body,
    at: now,
    read: false,
    audience: 'guest',
    guestRef: request.guestRef,
    ref: request.ref,
  };
}

const ENQUIRY_DEPARTMENT = 'events';

function enquiryStaffNotification(
  enquiry: CelebrationEnquiry,
  title: string,
  body: string,
  now: number,
): AppNotification {
  return {
    id: `n_${now}_${enquiry.ref}_s`,
    title,
    body,
    at: now,
    read: false,
    audience: 'staff',
    department: ENQUIRY_DEPARTMENT,
    ref: enquiry.ref,
  };
}

function enquiryGuestNotification(
  enquiry: CelebrationEnquiry,
  title: string,
  body: string,
  now: number,
): AppNotification {
  return {
    id: `n_${now}_${enquiry.ref}_g`,
    title,
    body,
    at: now,
    read: false,
    audience: 'guest',
    guestRef: enquiry.guestRef,
    ref: enquiry.ref,
  };
}

function reducer(state: PersistedState, action: Action): PersistedState {
  switch (action.type) {
    case 'hydrate': return action.state;
    case 'create': {
      const request = action.request;
      const body = `${request.title} · ${request.location}`;
      return {
        ...state,
        sequence: state.sequence + 1,
        requests: [request, ...state.requests],
        notifications: notify(state.notifications, [
          staffNotification(request, `New ${request.type}`, body, action.now),
          guestNotification(
            request,
            `Request ${request.ref} submitted`,
            'Your request has been routed and is awaiting acceptance.',
            action.now,
          ),
        ]),
      };
    }

    case 'transition': {
      const target = state.requests.find((request) => request.id === action.id);
      if (!target || !canTransition(target.status, action.status)) return state;

      const updated = applyTransition(target, action.status, action.options, action.now);
      const label = statusLabel(updated);

      const guestBody =
        action.status === 'completed'
          ? action.options.note ?? `${updated.title} has been completed.`
          : action.options.note ?? `Status updated to ${label}.`;

      const entries: AppNotification[] = [
        staffNotification(
          updated,
          `${updated.ref} · ${label}`,
          `${updated.title} · ${updated.location}`,
          action.now,
        ),
      ];

      if (updated.guestRef === state.session.guestRef) {
        entries.push(
          guestNotification(updated, `${updated.ref} · ${label}`, guestBody, action.now),
        );
      }

      return {
        ...state,
        requests: state.requests.map((request) => (request.id === action.id ? updated : request)),
        notifications: notify(state.notifications, entries),
      };
    }

    case 'stage': {
      const target = state.requests.find((request) => request.id === action.id);
      if (!target || target.status !== 'in_progress' || isTerminal(target.status)) return state;

      const updated: ServiceRequest = {
        ...target,
        stage: action.stage,
        updatedAt: action.now,
        history: [
          ...target.history,
          {
            status: target.status,
            at: action.now,
            by: action.options.by,
            stage: action.stage,
            note: action.options.note,
          },
        ],
      };
      const label = statusLabel({ status: updated.status, stage: updated.stage });

      const entries: AppNotification[] = [
        staffNotification(updated, `${updated.ref} · ${label}`, updated.title, action.now),
      ];
      if (updated.guestRef === state.session.guestRef) {
        entries.push(
          guestNotification(
            updated,
            `${updated.ref} · ${label}`,
            action.options.note ?? `Status updated to ${label}.`,
            action.now,
          ),
        );
      }

      return {
        ...state,
        requests: state.requests.map((request) => (request.id === action.id ? updated : request)),
        notifications: notify(state.notifications, entries),
      };
    }

    case 'assign': {
      const target = state.requests.find((request) => request.id === action.id);
      if (!target) return state;

      const updated: ServiceRequest = {
        ...target,
        assignedTo: action.options.staff,
        updatedAt: action.now,
        history: [
          ...target.history,
          {
            status: target.status,
            at: action.now,
            by: action.options.by,
            note: action.options.note ?? `Assigned to ${action.options.staff}`,
          },
        ],
      };

      return {
        ...state,
        requests: state.requests.map((request) => (request.id === action.id ? updated : request)),
        notifications: notify(state.notifications, [
          staffNotification(
            updated,
            `${updated.ref} assigned to ${action.options.staff}`,
            updated.title,
            action.now,
          ),
        ]),
      };
    }

    case 'dedication': {
      const target = state.requests.find((request) => request.id === action.id);
      if (!target) return state;
      const updated: ServiceRequest = {
        ...target,
        dedicationHidden: action.hidden,
        updatedAt: action.now,
        history: [
          ...target.history,
          {
            status: target.status,
            at: action.now,
            by: action.by,
            note: action.note,
          },
        ],
      };
      return {
        ...state,
        requests: state.requests.map((request) => (request.id === action.id ? updated : request)),
      };
    }

    case 'vote': {
      return {
        ...state,
        requests: state.requests.map((request) =>
          request.id === action.id
            ? {
                ...request,
                guestVoted: !request.guestVoted,
                votes: Math.max(0, (request.votes ?? 0) + (request.guestVoted ? -1 : 1)),
              }
            : request,
        ),
      };
    }

    case 'createEnquiry': {
      const enquiry = action.enquiry;
      return {
        ...state,
        enquirySequence: state.enquirySequence + 1,
        enquiries: [enquiry, ...state.enquiries],
        notifications: notify(state.notifications, [
          enquiryStaffNotification(
            enquiry,
            `New celebration enquiry ${enquiry.ref}`,
            `${enquiry.occasion} · ${enquiry.venue} · ${enquiry.entertainment}`,
            action.now,
          ),
          enquiryGuestNotification(
            enquiry,
            `Enquiry ${enquiry.ref} received`,
            'The events team has your celebration enquiry. This is an enquiry, not a booking.',
            action.now,
          ),
        ]),
      };
    }

    case 'enquiryStatus': {
      const target = state.enquiries.find((enquiry) => enquiry.id === action.id);
      if (!target || !canEnquiryTransition(target.status, action.status)) return state;

      const label = enquiryStatusLabel(action.status);
      const updated: CelebrationEnquiry = {
        ...target,
        status: action.status,
        updatedAt: action.now,
        history: [
          ...target.history,
          { status: action.status, at: action.now, by: action.by, note: action.note },
        ],
      };

      const entries: AppNotification[] = [
        enquiryStaffNotification(
          updated,
          `${updated.ref} · ${label}`,
          `${updated.occasion} · ${updated.venue}`,
          action.now,
        ),
      ];
      if (updated.guestRef === state.session.guestRef) {
        entries.push(
          enquiryGuestNotification(updated, `${updated.ref} · ${label}`, enquiryNextHint(updated), action.now),
        );
      }

      return {
        ...state,
        enquiries: state.enquiries.map((enquiry) => (enquiry.id === action.id ? updated : enquiry)),
        notifications: notify(state.notifications, entries),
      };
    }

    case 'enquiryNote': {
      const target = state.enquiries.find((enquiry) => enquiry.id === action.id);
      if (!target) return state;
      const updated: CelebrationEnquiry = {
        ...target,
        updatedAt: action.now,
        internalNotes: [...target.internalNotes, action.note],
      };
      return {
        ...state,
        enquiries: state.enquiries.map((enquiry) => (enquiry.id === action.id ? updated : enquiry)),
        notifications: notify(state.notifications, [
          enquiryStaffNotification(
            updated,
            `Internal note · ${updated.ref}`,
            action.note.body.slice(0, 90),
            action.now,
          ),
        ]),
      };
    }

    case 'enquiryAssign': {
      const target = state.enquiries.find((enquiry) => enquiry.id === action.id);
      if (!target) return state;
      const updated: CelebrationEnquiry = {
        ...target,
        assignedTo: action.staff,
        updatedAt: action.now,
        history: [
          ...target.history,
          {
            status: target.status,
            at: action.now,
            by: action.by,
            note: `Assigned to ${action.staff}`,
          },
        ],
      };
      return {
        ...state,
        enquiries: state.enquiries.map((enquiry) => (enquiry.id === action.id ? updated : enquiry)),
        notifications: notify(state.notifications, [
          enquiryStaffNotification(
            updated,
            `${updated.ref} assigned to ${action.staff}`,
            `${updated.occasion} · ${updated.venue}`,
            action.now,
          ),
        ]),
      };
    }

    case 'enquiryProposal': {
      const target = state.enquiries.find((enquiry) => enquiry.id === action.id);
      if (!target) return state;
      const updated: CelebrationEnquiry = {
        ...target,
        proposedPackage: action.packageLabel,
        updatedAt: action.now,
        history: [
          ...target.history,
          {
            status: target.status,
            at: action.now,
            by: action.by,
            note: action.note ?? `Proposed sample package: ${action.packageLabel}`,
          },
        ],
      };
      return {
        ...state,
        enquiries: state.enquiries.map((enquiry) => (enquiry.id === action.id ? updated : enquiry)),
        notifications: notify(state.notifications, [
          enquiryGuestNotification(
            updated,
            `Proposal recorded · ${updated.ref}`,
            'A sample package has been attached to your enquiry — an enquiry is not a booking.',
            action.now,
          ),
        ]),
      };
    }

    case 'enquiryMusicianAssign': {
      const target = state.enquiries.find((enquiry) => enquiry.id === action.id);
      if (!target) return state;
      const updated: CelebrationEnquiry = {
        ...target,
        assignedMusicianId: action.musicianId,
        assignedMusician: action.musicianName,
        updatedAt: action.now,
        history: [
          ...target.history,
          {
            status: target.status,
            at: action.now,
            by: action.by,
            note: action.musicianName
              ? `Performer assigned: ${action.musicianName}`
              : 'Performer assignment cleared',
          },
        ],
      };
      return {
        ...state,
        enquiries: state.enquiries.map((enquiry) => (enquiry.id === action.id ? updated : enquiry)),
        notifications: notify(state.notifications, [
          enquiryStaffNotification(
            updated,
            action.musicianName
              ? `${updated.ref} assigned to ${action.musicianName}`
              : `${updated.ref} performer cleared`,
            `${updated.occasion} · ${updated.venue}`,
            action.now,
          ),
        ]),
      };
    }

    case 'createMusician': {
      if (state.musicians.some((musician) => musician.id === action.musician.id)) return state;
      return { ...state, musicians: [...state.musicians, action.musician] };
    }

    case 'deleteMusician':
      return { ...state, musicians: state.musicians.filter((musician) => musician.id !== action.id) };

    case 'setMusicRules':
      return { ...state, musicRules: { ...state.musicRules, ...action.rules } };

    case 'setLocation': {
      if (!GUEST_LOCATIONS.some((location) => location.id === action.locationId)) return state;
      return { ...state, session: { ...state.session, locationId: action.locationId } };
    }

    case 'setEntry':
      return { ...state, session: { ...state.session, entry: action.entry } };

    case 'markRead': {
      return {
        ...state,
        notifications: state.notifications.map((notification) => {
          if (notification.read) return notification;
          if (action.all) return { ...notification, read: true };
          if (action.department && notification.department === action.department) {
            return { ...notification, read: true };
          }
          if (!action.department && notification.audience === 'guest') {
            return { ...notification, read: true };
          }
          return notification;
        }),
      };
    }

    case 'setRibbon':
      return { ...state, ribbonCollapsed: action.collapsed };

    case 'reset':
      return createInitialState(action.now);

    default:
      return state;
  }
}

/* -------------------------------------------------------------------------- */
/* Toasts                                                                     */
/* -------------------------------------------------------------------------- */

export type ToastTone = 'success' | 'info' | 'warn' | 'error';

export interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  body?: string;
}

/* -------------------------------------------------------------------------- */
/* Context API                                                                */
/* -------------------------------------------------------------------------- */

export interface RequestsApi {
  requests: ServiceRequest[];
  session: GuestSession;
  location: HotelLocation;
  notifications: AppNotification[];
  toasts: Toast[];
  ribbonCollapsed: boolean;
  createRequest: (input: NewRequestInput, options?: { silent?: boolean }) => ServiceRequest;
  transition: (
    id: string,
    status: RequestStatus,
    options?: Partial<TransitionOptions>,
  ) => boolean;
  /** Stage-only progression inside an open request (queued → playing). */
  setStage: (id: string, stage: RequestStage, options?: { by?: string; note?: string }) => void;
  assign: (id: string, options: AssignOptions) => void;
  /** Hide or reveal a dedication on the public queue view. */
  setDedicationHidden: (id: string, hidden: boolean, note?: string) => void;
  toggleVote: (id: string) => void;
  setLocation: (locationId: string) => void;
  setEntry: (entry: RequestSource) => void;
  markNotificationsRead: (scope?: { all?: boolean; department?: string }) => void;
  dismissToast: (id: string) => void;
  resetDemo: () => void;
  setRibbonCollapsed: (collapsed: boolean) => void;
  getByRef: (ref: string) => ServiceRequest | undefined;

  /* ---------------------------- Celebration enquiries ---------------------- */
  enquiries: CelebrationEnquiry[];
  musicRules: MusicRules;
  createEnquiry: (input: NewEnquiryInput) => CelebrationEnquiry;
  setEnquiryStatus: (
    id: string,
    status: EnquiryStatus,
    options?: { note?: string; by?: string },
  ) => boolean;
  addEnquiryNote: (id: string, body: string, by?: string) => void;
  assignEnquiry: (id: string, staff: string, by?: string) => void;
  proposeEnquiryPackage: (id: string, packageLabel: string, by?: string, note?: string) => void;

  /** Performer accounts — managed by staff from the Musicians desk. */
  musicians: Musician[];
  createMusician: (input: { name: string; role: string; username?: string }) => Musician;
  deleteMusician: (id: string) => void;
  /** Assign (or clear, with null) the performer who shows the enquiry in their console. */
  assignMusician: (enquiryId: string, musicianId: string | null) => void;

  updateMusicRules: (rules: Partial<MusicRules>) => void;
  getEnquiryByRef: (ref: string) => CelebrationEnquiry | undefined;

  /** Re-renders the elapsed-time column without touching persisted state. */
  tick: number;
}

const RequestsContext = createContext<RequestsApi | null>(null);

const STAFF_ACTOR = 'Operations · Duty desk';
const EVENTS_ACTOR = 'Events desk';
const STAGE_ACTOR = 'Entertainment · stage desk';

export function RequestsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState(Date.now()));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    saveState(state);
  }, [state]);

  // Share requests between same-origin demo tabs without echoing identical writes.
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const incoming = JSON.parse(event.newValue) as PersistedState;
        if (incoming.version === STATE_VERSION && Array.isArray(incoming.requests) && Array.isArray(incoming.enquiries) && Array.isArray(incoming.musicians)) dispatch({ type: 'hydrate', state: incoming });
      } catch { /* Ignore corrupt external storage updates. */ }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  /* Gentle pulse so elapsed times and relative stamps stay honest. */
  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const pushToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts((current) => [...current, { ...toast, id }].slice(-4));
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 5200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const createRequest = useCallback(
    (input: NewRequestInput, options: { silent?: boolean } = {}): ServiceRequest => {
      const now = Date.now();
      const location = findLocation(state.session.locationId);
      const request = buildRequest(input, {
        sequence: state.sequence,
        session: state.session,
        location,
        now,
      });
      dispatch({ type: 'create', request, now });
      if (!options.silent) pushToast({
        tone: 'success',
        title: `Reference ${request.ref} created`,
        body: `Routed to ${request.type}.`,
      });
      return request;
    },
    [state.sequence, state.session, pushToast],
  );

  const transition = useCallback(
    (id: string, status: RequestStatus, options: Partial<TransitionOptions> = {}) => {
      const target = state.requests.find((request) => request.id === id);
      if (!target) return false;
      if (!canTransition(target.status, status)) {
        pushToast({
          tone: 'warn',
          title: 'Status not allowed',
          body: `${target.ref} is already ${statusLabel(target)}.`,
        });
        return false;
      }

      const now = Date.now();
      dispatch({
        type: 'transition',
        id,
        status,
        options: { by: STAFF_ACTOR, ...options },
        now,
      });
      pushToast({
        tone: 'success',
        title: `${target.ref} · ${statusLabel({ status, stage: options.stage ?? target.stage })}`,
        body: options.note ?? target.title,
      });
      return true;
    },
    [state.requests, pushToast],
  );

  const setStage = useCallback(
    (id: string, stage: RequestStage, options: { by?: string; note?: string } = {}) => {
      const target = state.requests.find((request) => request.id === id);
      if (!target || target.status !== 'in_progress' || isTerminal(target.status)) return;

      dispatch({
        type: 'stage',
        id,
        stage,
        options: { by: options.by ?? STAGE_ACTOR, note: options.note },
        now: Date.now(),
      });
      pushToast({
        tone: 'success',
        title: `${target.ref} · ${statusLabel({ status: 'in_progress', stage })}`,
        body: options.note ?? target.title,
      });
    },
    [state.requests, pushToast],
  );

  const setDedicationHidden = useCallback(
    (id: string, hidden: boolean, note?: string) => {
      const target = state.requests.find((request) => request.id === id);
      if (!target) return;
      dispatch({
        type: 'dedication',
        id,
        hidden,
        by: STAGE_ACTOR,
        note: note ?? (hidden ? 'Dedication held back from the queue view' : 'Dedication approved for the queue view'),
        now: Date.now(),
      });
      pushToast({
        tone: 'info',
        title: hidden ? 'Dedication hidden' : 'Dedication approved',
        body: target.ref,
      });
    },
    [state.requests, pushToast],
  );

  const assign = useCallback(
    (id: string, options: AssignOptions) => {
      dispatch({ type: 'assign', id, options, now: Date.now() });
      pushToast({
        tone: 'info',
        title: 'Assignment updated',
        body: `${options.staff} has been assigned.`,
      });
    },
    [pushToast],
  );

  const toggleVote = useCallback(
    (id: string) => {
      dispatch({ type: 'vote', id });
    },
    [],
  );

  /* ---------------------------- Celebration enquiries ---------------------- */

  const createEnquiry = useCallback(
    (input: NewEnquiryInput): CelebrationEnquiry => {
      const now = Date.now();
      const location = findLocation(state.session.locationId);
      const enquiry = buildEnquiry(input, {
        sequence: state.enquirySequence,
        session: state.session,
        location,
        now,
      });
      dispatch({ type: 'createEnquiry', enquiry, now });
      pushToast({
        tone: 'success',
        title: `Enquiry ${enquiry.ref} received`,
        body: 'This is an enquiry, not a booking — the events team will follow up.',
      });
      return enquiry;
    },
    [state.enquirySequence, state.session, pushToast],
  );

  const setEnquiryStatus = useCallback(
    (
      id: string,
      status: EnquiryStatus,
      options: { note?: string; by?: string } = {},
    ) => {
      const target = state.enquiries.find((enquiry) => enquiry.id === id);
      if (!target) return false;
      if (!canEnquiryTransition(target.status, status)) {
        pushToast({
          tone: 'warn',
          title: 'Status not allowed',
          body: `${target.ref} is already ${enquiryStatusLabel(target.status)}.`,
        });
        return false;
      }

      dispatch({
        type: 'enquiryStatus',
        id,
        status,
        by: options.by ?? EVENTS_ACTOR,
        note: options.note,
        now: Date.now(),
      });
      pushToast({
        tone: 'success',
        title: `${target.ref} · ${enquiryStatusLabel(status)}`,
        body: options.note ?? `${target.occasion} · ${target.venue}`,
      });
      return true;
    },
    [state.enquiries, pushToast],
  );

  const addEnquiryNote = useCallback(
    (id: string, body: string, by: string = EVENTS_ACTOR) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      dispatch({
        type: 'enquiryNote',
        id,
        note: { id: `n_${Date.now()}`, at: Date.now(), by, body: trimmed },
        now: Date.now(),
      });
      pushToast({ tone: 'info', title: 'Internal note saved', body: 'Visible to events staff only.' });
    },
    [pushToast],
  );

  const assignEnquiry = useCallback(
    (id: string, staff: string, by: string = EVENTS_ACTOR) => {
      dispatch({ type: 'enquiryAssign', id, staff, by, now: Date.now() });
      pushToast({
        tone: 'info',
        title: 'Assignment updated',
        body: `${staff} is now handling this enquiry.`,
      });
    },
    [pushToast],
  );

  const proposeEnquiryPackage = useCallback(
    (id: string, packageLabel: string, by: string = EVENTS_ACTOR, note?: string) => {
      dispatch({ type: 'enquiryProposal', id, packageLabel, by, note, now: Date.now() });
      pushToast({
        tone: 'success',
        title: 'Sample package recorded',
        body: 'Guests are reminded that a proposal is not a confirmed booking.',
      });
    },
    [pushToast],
  );

  const createMusician = useCallback(
    (input: { name: string; role: string; username?: string }): Musician => {
      const now = Date.now();
      const base = (input.username ?? usernameFromName(input.name)).toLowerCase().trim();
      const musician: Musician = {
        id: `mnc_${now}`,
        name: input.name.trim(),
        role: input.role,
        username: uniqueUsername(base, state.musicians),
        active: true,
      };
      dispatch({ type: 'createMusician', musician });
      pushToast({
        tone: 'success',
        title: `${musician.name} added`,
        body: `Sign-in username: ${musician.username}`,
      });
      return musician;
    },
    [state.musicians, pushToast],
  );

  const deleteMusician = useCallback(
    (id: string) => {
      const target = state.musicians.find((musician) => musician.id === id);
      if (!target) return;
      dispatch({ type: 'deleteMusician', id });
      pushToast({
        tone: 'info',
        title: `${target.name} removed`,
        body: 'Any assigned events keep their performer name for the record.',
      });
    },
    [state.musicians, pushToast],
  );

  const assignMusician = useCallback(
    (enquiryId: string, musicianId: string | null) => {
      const target = state.enquiries.find((enquiry) => enquiry.id === enquiryId);
      if (!target) return;
      const musician = state.musicians.find((entry) => entry.id === musicianId);
      dispatch({
        type: 'enquiryMusicianAssign',
        id: enquiryId,
        musicianId: musician ? musician.id : null,
        musicianName: musician ? musician.name : null,
        by: EVENTS_ACTOR,
        now: Date.now(),
      });
      pushToast({
        tone: musician ? 'success' : 'info',
        title: musician ? `Assigned to ${musician.name}` : 'Performer cleared',
        body: `${target.ref} · ${target.occasion} · ${target.venue}`,
      });
    },
    [state.enquiries, state.musicians, pushToast],
  );

  const updateMusicRules = useCallback(
    (rules: Partial<MusicRules>) => {
      dispatch({ type: 'setMusicRules', rules });
      pushToast({
        tone: 'info',
        title: 'Demo rules updated',
        body: 'The guest music screen now reflects the new rules.',
      });
    },
    [pushToast],
  );

  const resetDemo = useCallback(() => {
    dispatch({ type: 'reset', now: Date.now() });
    setToasts([]);
    pushToast({
      tone: 'info',
      title: 'Demo data restored',
      body: 'All requests have returned to their seeded state.',
    });
  }, [pushToast]);

  const markNotificationsRead = useCallback(
    (scope?: { all?: boolean; department?: string }) => {
      dispatch({ type: 'markRead', ...scope });
    },
    [],
  );

  const value = useMemo<RequestsApi>(() => {
    const location = findLocation(state.session.locationId);
    return {
      requests: state.requests,
      session: state.session,
      location,
      notifications: state.notifications,
      toasts,
      ribbonCollapsed: state.ribbonCollapsed,
      createRequest,
      transition,
      setStage,
      assign,
      setDedicationHidden,
      toggleVote,
      setLocation: (locationId: string) => dispatch({ type: 'setLocation', locationId }),
      setEntry: (entry: RequestSource) => dispatch({ type: 'setEntry', entry }),
      markNotificationsRead,
      dismissToast,
      resetDemo,
      setRibbonCollapsed: (collapsed: boolean) => dispatch({ type: 'setRibbon', collapsed }),
      getByRef: (ref: string) => state.requests.find((request) => request.ref === ref),

      enquiries: state.enquiries,
      musicRules: state.musicRules,
      createEnquiry,
      setEnquiryStatus,
      addEnquiryNote,
      assignEnquiry,
      proposeEnquiryPackage,
      musicians: state.musicians,
      createMusician,
      deleteMusician,
      assignMusician,
      updateMusicRules,
      getEnquiryByRef: (ref: string) => state.enquiries.find((enquiry) => enquiry.ref === ref),

      tick,
    };
  }, [
    state,
    toasts,
    createRequest,
    transition,
    setStage,
    assign,
    setDedicationHidden,
    toggleVote,
    markNotificationsRead,
    dismissToast,
    resetDemo,
    createEnquiry,
    setEnquiryStatus,
    addEnquiryNote,
    assignEnquiry,
    proposeEnquiryPackage,
    createMusician,
    deleteMusician,
    assignMusician,
    updateMusicRules,
    tick,
  ]);

  return <RequestsContext.Provider value={value}>{children}</RequestsContext.Provider>;
}

export function useRequests(): RequestsApi {
  const context = useContext(RequestsContext);
  if (!context) throw new Error('useRequests must be used inside <RequestsProvider>');
  return context;
}

/** Notifications scoped to whichever experience is currently rendered. */
export function useScopedNotifications(
  audience: NotificationAudience,
  department?: string,
): AppNotification[] {
  const { notifications } = useRequests();
  return useMemo(
    () =>
      notifications.filter((notification) => {
        if (notification.audience !== audience) return false;
        if (audience === 'staff') return !department || notification.department === department;
        return true;
      }),
    [notifications, audience, department],
  );
}
