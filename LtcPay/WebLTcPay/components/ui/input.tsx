import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  mono?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, mono, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-xs font-medium mb-1.5"
            style={{ color: "var(--ink-2)" }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "block w-full rounded-r3 border px-3 py-2 text-sm outline-none transition-all",
            "bg-surface text-ink border-line",
            "placeholder:text-muted-2",
            "focus:border-cobalt focus:ring-2 focus:ring-cobalt-faint",
            "disabled:bg-bg-2 disabled:text-muted",
            mono && "font-mono text-xs",
            error && "border-rose focus:border-rose focus:ring-rose-soft",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-rose">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
export type { InputProps };
