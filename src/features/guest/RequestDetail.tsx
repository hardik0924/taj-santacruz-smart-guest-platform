import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bell, Clock, MapPin } from 'lucide-react';
import { useRequests } from '@/store/RequestsProvider';
import { useHomePath } from '@/hooks/useHomePath';
import { Panel, SectionHeading, KeyValue } from '@/components/ui/Panel';
import { StatusBadge, PriorityBadge, Badge } from '@/components/ui/Badge';
import { RequestTimeline } from '@/components/ui/Timeline';
import { EmptyState, Notice } from '@/components/ui/Feedback';
import { departmentName } from '@/data/departments';
import { nextStepHint, statusLabel } from '@/services/requestEngine';
import { fullTimestamp, inr, relativeTime } from '@/utils/format';

/**
 * Full guest-facing request detail: live status and immutable timeline.
 * Guests view statuses but never change them — queue and status management
 * belong exclusively to the staff dashboards.
 */
export function RequestDetail() {
  const { ref } = useParams<{ ref: string }>();
  const { getByRef, tick } = useRequests();
  const homePath = useHomePath();

  const request = ref ? getByRef(ref) : undefined;

  if (!request) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <EmptyState
          icon={<Bell className="h-5 w-5" strokeWidth={1.5} />}
          title="Request not found"
          body="That reference is not part of this demo session — it may have been reset. Open My Requests to see everything currently tracked."
          action={
            <Link
              to={`${homePath}/my-requests`}
              className="inline-flex h-10 items-center gap-2 rounded-[3px] bg-ink-900 px-4 text-[13.5px] font-medium text-ivory-50 transition-colors hover:bg-ink-800"
            >
              Back to my requests
            </Link>
          }
        />
      </div>
    );
  }

  if (request.service === "music") return <Navigate to={`${homePath}/my-requests`} replace />;

  void tick;

  return (
    <div className="mx-auto max-w-[1160px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Link
        to={`${homePath}/my-requests`}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-warm-600 transition-colors hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.7} />
        My requests
      </Link>

      {/* Header */}
      <header className="mt-5 border-b border-cream-300 pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow text-gold-600">
              {request.ref} · {departmentName(request.department)}
            </p>
            <h1 className="display mt-3 text-[clamp(1.8rem,4vw,2.6rem)] text-ink-900">
              {request.title}
            </h1>
            <div className="gold-hairline mt-4 max-w-[92px]" />
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-warm-600">
              {request.description}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-2.5 sm:items-end">
            <div className="flex items-center gap-2">
              <PriorityBadge priority={request.priority} />
              <StatusBadge status={request.status} stage={request.stage} />
            </div>
            <p className="text-[13px] text-warm-500">
              {request.assignedTo ? `Assigned to ${request.assignedTo} · ` : ''}
              updated {relativeTime(request.updatedAt)}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-warm-600">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-gold-600" strokeWidth={1.7} />
            {request.location}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-gold-600" strokeWidth={1.7} />
            {fullTimestamp(request.submittedAt)}
          </span>
          <Badge tone="neutral">{request.source === 'qr' ? 'QR entry' : 'Tablet entry'}</Badge>
        </div>
      </header>

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* Timeline */}
        <div>
          <Panel>
            <SectionHeading
              eyebrow="Track your request"
              title="Live timeline"
              description={nextStepHint(request)}
              action={<StatusBadge status={request.status} stage={request.stage} />}
            />
            <div className="mt-5">
              <RequestTimeline history={request.history} />
            </div>
          </Panel>

          <Notice className="mt-5" tone="gold" title="Updates without refreshing">
            <p>
              This screen reads the shared prototype state — switch to{' '}
              {`${departmentName(request.department)} operations`}
              , advance the request, and the timeline above gains a new entry immediately.
            </p>
          </Notice>
        </div>

        {/* Detail rail */}
        <div className="space-y-5">
          <Panel>
            <p className="eyebrow-sm text-warm-500">Request detail</p>
            <dl className="mt-3 divide-y divide-cream-300 border-t border-cream-300">
              <KeyValue label="Reference">{request.ref}</KeyValue>
              <KeyValue label="Type">{request.type}</KeyValue>
              <KeyValue label="Status">
                {statusLabel({ status: request.status, stage: request.stage })}
              </KeyValue>
              <KeyValue label="Location">{request.location}</KeyValue>
              {request.assignedTo ? <KeyValue label="Assigned">{request.assignedTo}</KeyValue> : null}
              {request.value ? <KeyValue label="Indicative value">{inr(request.value)}</KeyValue> : null}
            </dl>

            {Object.keys(request.meta).length > 0 ? (
              <>
                <p className="eyebrow-sm mt-5 text-warm-500">Submitted details</p>
                <dl className="mt-3 divide-y divide-cream-300 border-t border-cream-300">
                  {Object.entries(request.meta).map(([key, value]) => (
                    <KeyValue key={key} label={key}>
                      {value}
                    </KeyValue>
                  ))}
                </dl>
              </>
            ) : null}
          </Panel>

          {request.lineItems.length > 0 ? (
            <Panel>
              <p className="eyebrow-sm text-warm-500">Line items</p>
              <ul className="mt-3 divide-y divide-cream-300 border-t border-cream-300">
                {request.lineItems.map((line) => (
                  <li key={`${line.label}-${line.qty}`} className="flex items-baseline gap-3 py-2.5">
                    <span className="tnum w-6 shrink-0 text-[13px] text-gold-700">
                      {line.qty ? `${line.qty}×` : '·'}
                    </span>
                    <span className="min-w-0 flex-1 text-[14px] text-ink-800">
                      {line.label}
                      {line.note ? (
                        <span className="mt-0.5 block text-[12.5px] text-warm-500">{line.note}</span>
                      ) : null}
                    </span>
                    {line.price ? (
                      <span className="tnum shrink-0 text-[14px] text-ink-900">
                        {inr(line.price * (line.qty ?? 1))}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          {request.guestNote ? (
            <Panel>
              <p className="eyebrow-sm text-warm-500">Your note</p>
              <p className="mt-3 border-l-2 border-gold-500/60 pl-3 text-[14px] leading-relaxed text-warm-700">
                {request.guestNote}
              </p>
            </Panel>
          ) : null}

          {request.resolutionNote ? (
            <div className="rounded-[4px] border border-sage-500/40 bg-sage-500/12 p-5">
              <p className="eyebrow-sm text-forest-700">Resolution note</p>
              <p className="mt-3 text-[14px] leading-relaxed text-forest-700">
                {request.resolutionNote}
              </p>
            </div>
          ) : null}

          <Notice tone="neutral" title="Statuses are managed by the team">
            <p>
              Guests can follow every step here, but statuses are changed only by the responsible
              team — on the stage desk or the events desk. To change or withdraw a request, simply
              speak to the team.
            </p>
          </Notice>
        </div>
      </div>
    </div>
  );
}
