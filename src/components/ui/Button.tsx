import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/utils/format";

export type ButtonVariant =
  "ink" | "gold" | "outline" | "outlineDark" | "ghost" | "quiet" | "danger";

export type ButtonSize = "sm" | "md" | "lg" | "icon";

const BASE =
  "relative inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-[0.01em] " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-600 " +
  "disabled:cursor-not-allowed disabled:opacity-40 active:translate-y-[0.5px] select-none";

const VARIANTS: Record<ButtonVariant, string> = {
  ink: "bg-ink-900 text-ivory-50 shadow-lift hover:bg-ink-800",
  gold: "bg-gold-500 text-ink-950 shadow-lift hover:bg-gold-400",
  outline:
    "border border-warm-300 bg-white/75 text-ink-900 hover:border-warm-400 hover:bg-white",
  outlineDark:
    "border border-white/20 bg-white/[0.06] text-cream-200 hover:border-white/35 hover:bg-white/[0.12]",
  ghost: "text-warm-700 hover:bg-warm-100 hover:text-ink-900",
  quiet: "text-ink-700 hover:text-ink-950 hover:bg-cream-200",
  danger: "border border-clay-500/45 text-clay-600 hover:bg-clay-500/10",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-11 px-5 text-sm",
  lg: "h-[52px] px-7 text-[15px]",
  icon: "h-10 w-10",
};

export function buttonClass(options: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  fullWidth?: boolean;
}): string {
  const { variant = "ink", size = "md", className, fullWidth } = options;
  return cx(
    BASE,
    VARIANTS[variant],
    SIZES[size],
    fullWidth && "w-full",
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = "ink",
  size = "md",
  fullWidth,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, fullWidth, className })}
      {...rest}
    >
      {children}
    </button>
  );
}
