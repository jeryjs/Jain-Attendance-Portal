import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const cardVariants = cva(
  "relative overflow-hidden rounded-2xl border bg-white/80 backdrop-blur-sm shadow-lg transition-all duration-300 hover:shadow-2xl group",
  {
    variants: {
      variant: {
        default: "border-cyber-gray-200 hover:border-cyber-yellow/50",
        cyber: "border-cyber-yellow/30 bg-gradient-to-br from-white to-cyber-gray-50 hover:border-cyber-yellow",
        glass: "border-white/20 bg-white/10 backdrop-blur-md",
        neon: "border-cyber-yellow shadow-cyber-yellow/20 hover:shadow-cyber-yellow/40",
      },
      size: {
        default: "p-3 md:p-6",
        sm: "p-2 md:p-4",
        lg: "p-4 md:p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  glow?: boolean
  animated?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, glow, animated, onClick, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, size }), className)}
      onClick={onClick}
    >
      {/* Cyber Background Effects */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-cyber-yellow/10 to-transparent rounded-full blur-3xl transform -translate-x-16 -translate-y-16" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-cyber-yellow/10 to-transparent rounded-full blur-3xl transform translate-x-16 translate-y-16" />
      </div>

      {/* Animated Border */}
      {animated && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyber-yellow via-transparent to-cyber-yellow opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      )}

      {/* Glow Effect */}
      {glow && (
        <div className="absolute inset-0 rounded-2xl bg-cyber-yellow/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
      )}

      {/* Content */}
      <div className="relative z-10">
        {props.children}
      </div>
    </div>
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-3 md:p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg md:text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs md:text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-3 md:p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-3 md:p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants }