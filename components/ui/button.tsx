import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative inline-flex items-center justify-center whitespace-nowrap rounded-full font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-yellow focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 overflow-hidden group",
  {
    variants: {
      variant: {
        default: "bg-cyber-yellow text-cyber-gray-900 hover:bg-cyber-yellow-dark hover:shadow-lg hover:shadow-cyber-yellow/25 hover:scale-105",
        outline: "border-2 border-cyber-yellow text-cyber-yellow bg-transparent hover:bg-cyber-yellow hover:text-cyber-gray-900 hover:shadow-lg hover:shadow-cyber-yellow/25",
        ghost: "text-cyber-gray-700 hover:bg-cyber-gray-100 hover:text-cyber-gray-900",
        neon: "bg-transparent border-2 border-cyber-yellow text-cyber-yellow shadow-lg shadow-cyber-yellow/20 hover:shadow-cyber-yellow/40 hover:bg-cyber-yellow hover:text-cyber-gray-900",
        gradient: "bg-gradient-to-r from-cyber-yellow to-cyber-yellow-dark text-cyber-gray-900 hover:shadow-lg hover:shadow-cyber-yellow/25 hover:scale-105",
      },
      size: {
        default: "h-11 px-6 py-3 text-sm",
        sm: "h-9 px-4 py-2 text-xs",
        lg: "h-13 px-8 py-4 text-base",
        icon: "h-11 w-11 p-0",
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
  glow?: boolean
  pulse?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, glow, pulse, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      >
        {/* Glow Effect */}
        {glow && (
          <div className="absolute inset-0 bg-cyber-yellow/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        )}

        {/* Pulse Effect */}
        {pulse && (
          <div className="absolute inset-0 bg-cyber-yellow/30 rounded-full animate-ping opacity-0 group-hover:opacity-100" />
        )}

        {/* Shimmer Effect */}
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 ease-out" />

        {/* Content */}
        <span className="relative z-10 flex items-center gap-2">
          {props.children}
        </span>
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }