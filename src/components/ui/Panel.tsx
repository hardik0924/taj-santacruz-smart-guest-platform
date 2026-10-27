import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/utils/format";

/** Primary content surface — quiet borders, restrained radius, soft elevation. */
export function Panel({
  children,
  className,
  dark = false,
  padded = true,
  interactive = false,
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  dark?: boolean;
  padded?: boolean;
  interactive?: boolean;
}) {
  return (
    <div
      className={cx(
        "rounded-[24px] border",
        dark
          ? "border-white/10 bg-ink-850 text-cream-200"
          : "border-cream-300 bg-white shadow-hairline",
        padded && "p-5 sm:p-6",
        interactive &&
          "transition-[border-color,box-shadow,transform] duration-200 hover:border-warm-300 hover:shadow-lift",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Editorial section heading: micro-label, serif title, optional gold rule. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  dark = false,
  align = "start",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  dark?: boolean;
  align?: "start" | "between";
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-wrap gap-4",
        align === "between" && "items-end justify-between",
        className,
      )}
    >
      <div className={cx("min-w-0", align === "start" && "flex-1")}>
        {eyebrow ? (
          <p
            className={cx(
              "eyebrow mb-3",
              dark ? "text-gold-400" : "text-gold-600",
            )}
          >
            {eyebrow}
          </p>
        ) : null}
        <h2
          className={cx(
            "display text-[clamp(1.55rem,2.4vw,2.1rem)]",
            dark ? "text-ivory-100" : "text-ink-900",
          )}
        >
          {title}
        </h2>
        {description ? (
          <p
            className={cx(
              "mt-2.5 max-w-2xl text-[14.5px] leading-relaxed",
              dark ? "text-warm-300" : "text-warm-600",
            )}
          >
            {description}
          </p>
        ) : null}
        {eyebrow ? <div className="gold-hairline mt-4 max-w-[120px]" /> : null}
      </div>
      {action ? (
        <div className="flex shrink-0 items-center gap-2">{action}</div>
      ) : null}
    </div>
  );
}

/** Compact KPI tile. Value, supporting label, and an optional qualifier. */
export function StatTile({
  label,
  value,
  hint,
  tone = "default",
  dark = false,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "gold" | "sage" | "clay";
  dark?: boolean;
  className?: string;
}) {
  const valueTone =
    tone === "gold"
      ? dark
        ? "text-gold-400"
        : "text-gold-500"
      : tone === "sage"
        ? dark
          ? "text-sage-300"
          : "text-sage-600"
        : tone === "clay"
          ? dark
            ? "text-clay-400"
            : "text-clay-600"
          : dark
            ? "text-ivory-50"
            : "text-ink-900";

  return (
    <div
      className={cx(
        "rounded-[24px] border p-4 sm:p-5",
        dark
          ? "border-white/10 bg-white/[0.04]"
          : "border-cream-300 bg-white shadow-hairline",
        className,
      )}
    >
      <p className={cx("eyebrow-sm", dark ? "text-warm-300" : "text-warm-500")}>
        {label}
      </p>
      <p
        className={cx(
          "mt-3 text-[clamp(1.5rem,2.6vw,2rem)] font-semibold tabular-nums leading-none",
          valueTone,
        )}
      >
        {value}
      </p>
      {hint ? (
        <p
          className={cx(
            "mt-2 text-[12.5px] leading-snug",
            dark ? "text-warm-300" : "text-warm-600",
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Definition list row used in request detail panels. */
export function KeyValue({
  label,
  children,
  dark = false,
}: {
  label: string;
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
      <dt
        className={cx(
          "eyebrow-sm w-32 shrink-0",
          dark ? "text-warm-400" : "text-warm-600",
        )}
      >
        {label}
      </dt>
      <dd
        className={cx(
          "min-w-0 flex-1 text-[14px] break-words",
          dark ? "text-cream-200" : "text-ink-800",
        )}
      >
        {children}
      </dd>
    </div>
  );
}
