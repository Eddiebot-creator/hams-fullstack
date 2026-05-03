import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/src/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/25",
        destructive:
          "bg-red-600 text-white shadow-sm shadow-red-600/20 hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/25",
        outline:
          "border border-neutral-200 bg-white text-neutral-800 shadow-sm hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-md",
        secondary:
          "bg-neutral-100 text-neutral-950 shadow-sm hover:bg-neutral-200 hover:shadow-md",
        ghost: "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950 hover:shadow-sm",
        link: "text-indigo-700 underline-offset-4 hover:text-indigo-900 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-12 rounded-xl px-8",
        icon: "h-11 w-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
