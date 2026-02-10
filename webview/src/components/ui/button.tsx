import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rig-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--rig-panel)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--rig-accent)] text-[var(--rig-accent-contrast)] hover:bg-[var(--rig-accent-hover)]",
        outline:
          "border border-[var(--rig-panel-border)] text-[var(--rig-text)] hover:bg-[var(--rig-hover)]",
        ghost: "text-[var(--rig-text)] hover:bg-[var(--rig-hover)]"
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
