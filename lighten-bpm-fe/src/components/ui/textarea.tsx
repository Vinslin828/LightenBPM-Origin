import * as React from "react";
import { cn } from "@/utils/cn";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[100px] w-full resize-vertical rounded-[6px] border border-stroke bg-white px-5 py-3",
          "text-base font-normal text-dark placeholder:text-secondary-text",
          "focus:border-[1.5px] focus:border-lighten-blue focus:outline-none",
          "disabled:border-gray-2 disabled:bg-gray-2 disabled:text-primary-text",
          error && "border-[1.5px] border-red",
          className,
        )}
        placeholder="Type here..."
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
