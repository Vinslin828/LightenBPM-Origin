import * as React from "react";
import { cn } from "@/utils/cn";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

const buttonVariants = cva(
  "inline-flex items-center justify-center relative gap-2 rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:border-gray-3 disabled:bg-gray-3 disabled:text-dark-5",
  {
    variants: {
      variant: {
        default: "bg-dark-3 text-white hover:bg-[#2C3441]",
        secondary:
          "border border-dark-3 text-dark-3 hover:bg-dark-3/10 disabled:border-gray-3",
        tertiary:
          "border border-stroke text-primary-text hover:bg-gray-2 hover:disabled",
        destructive: "bg-red text-white hover:bg-red-700",
        "destructive-outline":
          "border border-red-600 text-red-600 hover:bg-red-600/10",
        success: "bg-green-600 text-white hover:bg-green-700",
        "success-outline":
          "border border-green-600 text-green-600 hover:bg-green-600/10",
        ghost: "hover:bg-cool-gray-200 hover:text-dark bg-transparent",
        link: "text-primary underline-offset-4 hover:underline",
        icon: "hover:bg-gray-2 radius-sm p-0 bg-transparent",
      },
      size: {
        default: "py-3 px-4",
        sm: "py-2 px-3",
        lg: "py-4 px-6",
        icon: "p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  icon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, loading = false, children, icon, ...props },
    ref,
  ) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={loading || props.disabled}
        {...props}
      >
        {icon}
        {loading && <Loader2 className="absolute h-5 w-5 animate-spin" />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
