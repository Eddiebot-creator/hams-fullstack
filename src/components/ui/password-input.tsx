import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/src/lib/utils";

export interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false);

    return (
      <div className="relative">
        <input
          type={isVisible ? "text" : "password"}
          className={cn(
            "flex h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 pr-12 text-sm font-medium text-neutral-950 shadow-sm shadow-neutral-200/60 ring-offset-background transition-all duration-200 placeholder:text-neutral-400 hover:border-neutral-300 hover:bg-neutral-50/60 focus-visible:border-indigo-500 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/15 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:opacity-70 file:border-0 file:bg-transparent file:text-sm file:font-semibold",
            className
          )}
          ref={ref}
          {...props}
        />
        <button
          type="button"
          onClick={() => setIsVisible((value) => !value)}
          className="absolute inset-y-1.5 right-1.5 flex w-9 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label={isVisible ? "Hide password" : "Show password"}
        >
          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
