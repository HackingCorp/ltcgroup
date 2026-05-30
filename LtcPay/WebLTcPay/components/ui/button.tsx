import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "ghost" | "danger" | "link" | "outline";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-ink text-bg hover:bg-black focus:ring-cobalt/30",
      secondary: "bg-cobalt text-white hover:bg-cobalt-dark focus:ring-cobalt/30",
      accent: "bg-lime text-ink hover:bg-lime-dark focus:ring-lime/30",
      ghost: "bg-surface border border-line text-ink hover:bg-bg-2 focus:ring-ink/10",
      danger: "bg-rose text-white hover:brightness-110 focus:ring-rose/30",
      link: "bg-transparent text-cobalt hover:text-cobalt-dark p-0 border-0 focus:ring-0",
      outline: "border border-line bg-transparent text-ink hover:bg-bg-2 focus:ring-ink/10",
    };

    const sizes = {
      sm: "px-2.5 py-1.5 text-xs",
      md: "px-3.5 py-2 text-sm",
      lg: "px-5 py-3 text-sm",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-r3 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-px whitespace-nowrap",
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="mr-1.5 h-3.5 w-3.5 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps };
