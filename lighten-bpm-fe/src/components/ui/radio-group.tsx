"use client";

import * as React from "react";
import { cn } from "@/utils/cn";

export interface RadioOption {
  label: React.ReactNode;
  value: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  value?: string;
  defaultValue?: string;
  name: string;
  options: RadioOption[];
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  (
    {
      className,
      value,
      defaultValue,
      name,
      options,
      onChange,
      disabled,
      ...props
    },
    ref,
  ) => {
    const [selectedValue, setSelectedValue] = React.useState(
      value || defaultValue || "",
    );

    React.useEffect(() => {
      if (value !== undefined) {
        setSelectedValue(value);
      }
    }, [value]);

    const handleChange = (optionValue: string) => {
      if (!disabled) {
        setSelectedValue(optionValue);
        onChange?.(optionValue);
      }
    };

    return (
      <div
        ref={ref}
        className={cn("flex flex-col gap-4", className)}
        {...props}
      >
        {options.map((option) => {
          const isChecked = selectedValue === option.value;
          const isDisabled = disabled || option.disabled;
          const id = `${name}-${option.value}`;

          return (
            <div
              key={id}
              className={cn("inline-flex", isDisabled && "cursor-not-allowed")}
            >
              <label
                className={cn(
                  "relative flex",
                  isDisabled ? "cursor-not-allowed" : "cursor-pointer",
                )}
                htmlFor={id}
              >
                <input
                  id={id}
                  name={name}
                  type="radio"
                  value={option.value}
                  checked={isChecked}
                  disabled={isDisabled}
                  onChange={() => handleChange(option.value)}
                  className={cn(
                    "peer h-5 w-5 appearance-none rounded-full border border-stroke transition-all checked:border-lighten-blue checked:bg-lighten-blue/10 bg-white",
                    "disabled:bg-gray-2 disabled:border-gray-2 disabled:cursor-not-allowed",
                    isDisabled &&
                      isChecked &&
                      "disabled:border-lighten-blue disabled:bg-lighten-blue/10",
                    isDisabled ? "cursor-not-allowed" : "cursor-pointer",
                  )}
                />
                <span className="absolute top-1 left-1 h-3 w-3 transform rounded-full bg-lighten-blue opacity-0 transition-opacity duration-200 peer-checked:opacity-100"></span>
              </label>
              <label
                className={cn(
                  "ml-2 text-sm text-dark",
                  isDisabled ? "cursor-not-allowed" : "cursor-pointer",
                )}
                htmlFor={id}
              >
                {option.label}
              </label>
            </div>
          );
        })}
      </div>
    );
  },
);

RadioGroup.displayName = "RadioGroup";

export { RadioGroup };
