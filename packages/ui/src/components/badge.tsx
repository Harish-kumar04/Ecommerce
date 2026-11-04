import * as React from "react";
import { cn } from "../lib/utils";

export type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning";

const badgeVariants = {
  base: "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  variants: {
    default: "bg-slate-900 text-slate-50",
    secondary: "bg-slate-100 text-slate-900",
    destructive: "bg-red-500 text-slate-50",
    outline: "border border-slate-200 bg-transparent text-slate-900",
    success: "bg-green-500 text-white",
    warning: "bg-amber-500 text-white",
  },
};

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      className={cn(badgeVariants.base, badgeVariants.variants[variant], className)}
      ref={ref}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
