"use client";

import * as React from "react";
import { cn } from "@/utils/cn";
import { Input, type InputProps } from "./input";
import { ChevronDown } from "lucide-react";
import { useSubscribeField } from "@/hooks/useFormBuilder";

type CurrencyInputProps = Omit<InputProps, "type" | "value" | "onChange"> & {
  currencyCode: string;
  referencedCurrencyFieldName?: string;
  value?: number;
  decimalDigits?: number;
  onValueChange?: (value?: number) => void;
  allowCurrencyChange?: boolean;
  currencyOptions?: string[];
  onCurrencyChange?: (currency: string) => void;
  hideCurrencyPrefix?: boolean;
};

const clampDecimals = (decimals?: number) => {
  if (!Number.isFinite(decimals)) return 0;
  return Math.max(0, Math.min(20, Math.floor(decimals ?? 0)));
};

export function CurrencyInput({
  currencyCode,
  referencedCurrencyFieldName,
  value,
  decimalDigits,
  onValueChange,
  className,
  hasClearIcon = false,
  onBlur,
  allowCurrencyChange = false,
  currencyOptions = [],
  onCurrencyChange,
  hideCurrencyPrefix = false,
  readOnly,
  disabled,
  ...rest
}: CurrencyInputProps) {
  const subscribedCurrencyValue = useSubscribeField(
    referencedCurrencyFieldName,
  );
  const prevSubscribedValueRef = React.useRef(subscribedCurrencyValue);

  React.useEffect(() => {
    if (
      referencedCurrencyFieldName &&
      typeof subscribedCurrencyValue === "string" &&
      subscribedCurrencyValue.trim() !== ""
    ) {
      if (prevSubscribedValueRef.current !== subscribedCurrencyValue) {
        prevSubscribedValueRef.current = subscribedCurrencyValue;
        onCurrencyChange?.(subscribedCurrencyValue);
      }
    } else {
      prevSubscribedValueRef.current = subscribedCurrencyValue;
    }
  }, [subscribedCurrencyValue, referencedCurrencyFieldName, onCurrencyChange]);

  const isValidCurrency =
    currencyOptions.length === 0 || currencyOptions.includes(currencyCode);
  const displayCurrencyCode = isValidCurrency ? currencyCode : "USD";

  const isCurrencyMismatch =
    !!referencedCurrencyFieldName &&
    (typeof subscribedCurrencyValue !== "string" ||
      subscribedCurrencyValue.trim() === "" ||
      (currencyOptions.length > 0 && !currencyOptions.includes(subscribedCurrencyValue)));

  const decimals = clampDecimals(decimalDigits);
  const formatter = React.useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: "decimal",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
    [decimals],
  );

  const [inputValue, setInputValue] = React.useState<string>("");
  const [isFocused, setIsFocused] = React.useState(false);
  const lastValueRef = React.useRef<number | undefined>(value);
  const isFocusedRef = React.useRef(false);

  const normalizeAndParse = React.useCallback(
    (raw: string): number | undefined => {
      const normalized = raw.replace(/[^\d.-]/g, "");
      if (normalized === "" || normalized === "-" || normalized === ".") {
        return undefined;
      }
      const numeric = Number(normalized);
      if (!Number.isFinite(numeric)) return undefined;
      const fixed = Number(numeric.toFixed(decimals));
      return Number.isFinite(fixed) ? fixed : undefined;
    },
    [decimals],
  );

  React.useEffect(() => {
    if (typeof value === "number" && Number.isFinite(value)) {
      lastValueRef.current = value;
      if (!isFocusedRef.current) setInputValue(formatter.format(value));
    } else if (!isFocusedRef.current) {
      setInputValue("");
      lastValueRef.current = undefined;
    }
  }, [value, formatter, displayCurrencyCode]);

  const showCurrencySelector =
    (allowCurrencyChange || isCurrencyMismatch) && currencyOptions.length > 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);
    lastValueRef.current = normalizeAndParse(raw);
    onValueChange?.(lastValueRef.current);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = false;
    setIsFocused(false);
    const parsed = normalizeAndParse(inputValue);
    if (parsed === undefined) {
      if (inputValue !== "") setInputValue("");
      lastValueRef.current = undefined;
      onValueChange?.(undefined);
      onBlur?.(e);
      return;
    }
    lastValueRef.current = parsed;
    onValueChange?.(parsed);
    const formatted = formatter.format(parsed);
    if (formatted !== inputValue) setInputValue(formatted);
    onBlur?.(e);
  };

  const prefixContent = (
    <div
      className={cn(
        "flex items-center gap-1.5 px-5 py-3 text-base font-normal text-primary-text",
        showCurrencySelector && "border-r border-stroke",
      )}
    >
      <span>{displayCurrencyCode}</span>
      {showCurrencySelector && (
        <ChevronDown size={16} className="text-secondary-text" />
      )}
    </div>
  );

  const currencyPrefix = showCurrencySelector ? (
    <label className="relative shrink-0">
      <select
        value={displayCurrencyCode}
        onChange={(e) => {
          onCurrencyChange?.(e.target.value);
        }}
        disabled={
          (!allowCurrencyChange && !isCurrencyMismatch) || readOnly || disabled
        }
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label="Select currency"
      >
        {currencyOptions.map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
      {prefixContent}
    </label>
  ) : (
    <div className="pointer-events-none shrink-0">{prefixContent}</div>
  );

  return (
    <div
      className={cn(
        "flex w-full rounded-[6px] border bg-white",
        isFocused ? "border-[1.5px] border-giant-blue" : "border-stroke",
        (readOnly || disabled) && "opacity-60",
        className,
      )}
    >
      {!hideCurrencyPrefix && currencyPrefix}
      <Input
        {...rest}
        type="text"
        inputMode="decimal"
        hasClearIcon={hasClearIcon}
        readOnly={readOnly}
        disabled={disabled}
        className={cn(
          "flex-1 border-0 shadow-none outline-none focus:border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0",
          !hideCurrencyPrefix && "rounded-l-none",
        )}
        value={inputValue}
        onFocus={() => {
          isFocusedRef.current = true;
          setIsFocused(true);
        }}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    </div>
  );
}
