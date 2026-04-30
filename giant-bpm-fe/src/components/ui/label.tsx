import * as React from "react";
import { cn } from "@/utils/cn";
import { cva, type VariantProps } from "class-variance-authority";

const labelVariants = cva(
  "text-sm font-medium peer-disabled:cursor-not-allowed break-words peer-disabled:opacity-70 w-full text-left block",
);

const Label = React.forwardRef<
  React.ElementRef<"label">,
  React.ComponentPropsWithoutRef<"label"> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "pb-1.5 text-dark font-medium text-sm max-w-4/5 truncate",
      labelVariants(),
      {
        "[word-break:break-word] after:pl-1 after:text-red-500 after:content-['*']":
          props["aria-required"],
      },
      className,
    )}
    {...props}
  />
));

Label.displayName = "Label";

export { Label };
