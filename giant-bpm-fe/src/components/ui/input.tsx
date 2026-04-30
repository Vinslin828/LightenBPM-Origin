import * as React from "react";
import { cn } from "@/utils/cn";
import { ClearIcon } from "../icons";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  hasClearIcon?: boolean;
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const getStringValue = (value: unknown) => (value ?? "").toString();

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      error,
      hasClearIcon,
      icon,
      leftIcon,
      rightIcon,
      onChange,
      value,
      defaultValue,
      disabled,
      readOnly,
      ...props
    },
    ref,
  ) => {
    const enableClearIcon = hasClearIcon ?? true;
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [internalValue, setInternalValue] = React.useState(() =>
      getStringValue(value ?? defaultValue),
    );

    React.useEffect(() => {
      if (value !== undefined) {
        setInternalValue(getStringValue(value));
      }
    }, [value]);

    const handleChange: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      if (value === undefined) {
        setInternalValue(event.target.value);
      }
      onChange?.(event);
    };

    const handleClear = () => {
      const inputElement = inputRef.current;
      if (!inputElement) return;

      if (value === undefined) {
        inputElement.value = "";
        setInternalValue("");
      } else {
        const nativeSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )?.set;
        nativeSetter?.call(inputElement, "");
      }

      inputElement.dispatchEvent(new Event("input", { bubbles: true }));
      inputElement.focus();
    };

    const shouldShowClearIcon =
      enableClearIcon &&
      !disabled &&
      !readOnly &&
      Boolean(getStringValue(value ?? internalValue));

    const resolvedLeftIcon = leftIcon ?? icon;
    const shouldWrap = Boolean(
      enableClearIcon || resolvedLeftIcon || rightIcon,
    );

    const paddingClasses = cn(
      resolvedLeftIcon ? "pl-10" : "pl-5",
      rightIcon || enableClearIcon ? "pr-10" : "pr-5",
    );

    const setRefs = (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    const inputElement = (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-[6px] border border-stroke bg-white py-3",
          "text-base font-normal text-dark placeholder:text-secondary-text",
          "focus:border-[1.5px] focus:border-giant-blue focus:outline-none",
          "disabled:bg-gray-2 disabled:text-primary-text disabled:border-gray-2",
          error && "border-[1.5px] border-red",
          paddingClasses,
          className,
        )}
        ref={setRefs}
        onChange={handleChange}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        readOnly={readOnly}
        {...props}
      />
    );

    if (!shouldWrap) {
      return inputElement;
    }

    return (
      <div className="relative w-full">
        {inputElement}
        {resolvedLeftIcon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-6">
            {resolvedLeftIcon}
          </div>
        )}
        {rightIcon && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-6">
            {rightIcon}
          </div>
        )}
        {shouldShowClearIcon && (
          <button
            type="button"
            className={cn(
              "absolute top-1/2 -translate-y-1/2 cursor-pointer",
              rightIcon ? "right-12" : "right-4",
            )}
            onClick={handleClear}
            aria-label="Clear input"
          >
            <ClearIcon className="text-gray-6 h-4 w-4" />
          </button>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
