import { useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { findLocation } from '@/data/property';
import { useRequests } from '@/store/RequestsProvider';
import { cx } from '@/utils/format';

/** Static table context for this demonstration. */
export function LocationControl({ dark = false, size = 'md', className }: {
  dark?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const { location, setLocation } = useRequests();
  useEffect(() => {
    if (location.id !== 'table-08') setLocation('table-08');
  }, [location.id, setLocation]);
  return <span className={cx(
    'inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border px-3',
    size === 'sm' ? 'h-8 text-[12.5px]' : 'h-10 text-[13.5px]',
    dark ? 'border-white/20 bg-white/[0.07] text-cream-200' : 'border-warm-300 bg-white text-ink-800',
    className,
  )}>
    <MapPin aria-hidden="true" className={cx('shrink-0 text-gold-600', size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')} strokeWidth={1.7}/>
    <span className="min-w-0 truncate font-medium">Table 08</span>
  </span>;
}

/** Read-only contextual label used in request confirmations. */
export function LocationLabel({ locationId, className }: { locationId: string; className?: string }) {
  const entry = findLocation(locationId);
  return <span className={className}>{entry.label}</span>;
}
