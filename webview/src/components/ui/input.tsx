import * as React from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-md border border-[var(--rig-input-border)] bg-[var(--rig-input-bg)] px-3 text-sm text-[var(--rig-input-text)] placeholder:text-[var(--rig-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rig-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--rig-panel)]",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
