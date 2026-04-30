import * as React from "react";
import { cn } from "@/utils/cn";
import { cva, type VariantProps } from "class-variance-authority";

const toggleVariants = cva(
  "inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-gray-200",
        outline: "bg-gray-200",
      },
      size: {
        default: "h-6 w-11",
        sm: "h-5 w-9",
        lg: "h-7 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const toggleThumbVariants = cva(
  "pointer-events-none block rounded-full bg-white shadow-lg ring-0 transition-transform duration-200",
  {
    variants: {
      size: {
        default: "h-5 w-5",
        sm: "h-4 w-4",
        lg: "h-6 w-6",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

interface ToggleProps extends VariantProps<typeof toggleVariants> {
  pressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  disabled?: boolean;
  readonly?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  (
    {
      className,
      variant,
      size,
      pressed = false,
      onPressedChange,
      disabled,
      readonly,
      children,
      ...props
    },
    ref,
  ) => {
    const handleClick = () => {
      if (!disabled && !readonly && onPressedChange) {
        onPressedChange(!pressed);
      }
    };

    const getThumbTransform = () => {
      if (!pressed) return "translate-x-0";

      switch (size) {
        case "sm":
          return "translate-x-4";
        case "lg":
          return "translate-x-5";
        default:
          return "translate-x-5";
      }
    };

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={pressed}
        aria-readonly={readonly}
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          toggleVariants({ variant, size }),
          pressed && "bg-giant-blue",
          readonly && "cursor-default",
          className,
        )}
        {...props}
      >
        <span
          className={cn(toggleThumbVariants({ size }), getThumbTransform())}
        />
      </button>
    );
  },
);

Toggle.displayName = "Toggle";

export { Toggle, toggleVariants };
