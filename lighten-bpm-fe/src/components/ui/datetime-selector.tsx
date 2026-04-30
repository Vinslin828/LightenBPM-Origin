"use client";

import * as React from "react";
import dayjs from "dayjs";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { createPortal } from "react-dom";

import { cn } from "@/utils/cn";
import { CalendarIcon, ClearIcon } from "../icons";
import { Input } from "./input";

const assignInputRef = (
  target: React.ForwardedRef<HTMLInputElement>,
  node: HTMLInputElement | null,
) => {
  if (typeof target === "function") {
    target(node);
    return;
  }
  if (target) {
    target.current = node;
  }
};

const hasTimestampValue = (value?: number) =>
  typeof value === "number" && !Number.isNaN(value);

export interface DatePickerProps {
  disabled?: boolean;
  value?: number;
  onChange?: (date?: number) => void;
  className?: string;
  placeholder?: string;
  readonly?: boolean;
  name: string;
  error?: boolean;
  id?: string;
  required?: boolean;
  calendarIcon?: React.ReactNode;
  clearIcon?: React.ReactNode;
  usePortal?: boolean;
}

export interface TimePickerProps {
  disabled?: boolean;
  value?: number;
  onChange?: (date?: number) => void;
  className?: string;
  placeholder?: string;
  readonly?: boolean;
  name: string;
  error?: boolean;
  id?: string;
  required?: boolean;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  calendarIcon?: React.ReactNode;
  clearIcon?: React.ReactNode;
  usePortal?: boolean;
}

export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      value,
      disabled = false,
      readonly = false,
      onChange,
      className,
      placeholder,
      name,
      error = false,
      id,
      required = false,
      calendarIcon,
      clearIcon,
      usePortal = false,
    },
    ref,
  ) => {
    const selectedDate = hasTimestampValue(value)
      ? new Date(value as number)
      : null;
    const showClearButton = hasTimestampValue(value) && !(disabled || readonly);
    const renderedCalendarIcon = calendarIcon ?? (
      <CalendarIcon className="h-5 w-5 text-secondary-text" />
    );
    const renderedClearIcon = clearIcon ?? (
      <ClearIcon className="h-4 w-4 text-secondary-text" />
    );

    const handleDateChange = (nextDate: Date | null) => {
      if (!nextDate) {
        onChange?.(undefined);
        return;
      }

      const baseDate = selectedDate
        ? new Date(selectedDate)
        : new Date(nextDate);
      const updated = new Date(baseDate);
      updated.setFullYear(
        nextDate.getFullYear(),
        nextDate.getMonth(),
        nextDate.getDate(),
      );
      onChange?.(updated.getTime());
    };

    const handleClear: React.MouseEventHandler<HTMLButtonElement> = (event) => {
      event.preventDefault();
      event.stopPropagation();
      onChange?.(undefined);
    };

    const DateInput = React.forwardRef<
      HTMLInputElement,
      React.ComponentProps<typeof Input>
    >((inputProps, inputRef) => (
      <Input
        {...inputProps}
        ref={(node) => {
          assignInputRef(inputRef, node);
          assignInputRef(ref, node);
        }}
        readOnly
        disabled={disabled}
        placeholder={placeholder ?? "yyyy-mm-dd"}
        error={error}
        required={required}
        className={cn(
          inputProps.className,
          className,
          "pr-16",
          error && "border-[1.5px] border-red focus:border-red",
        )}
        hasClearIcon={false}
      />
    ));
    DateInput.displayName = "DateTimeSelectorDateInput";

    const popperContainer = usePortal
      ? ({ children }: { children?: React.ReactNode }) =>
          createPortal(children ?? null, document.body)
      : undefined;

    return (
      <div className="relative w-full">
        <ReactDatePicker
          id={id}
          selected={selectedDate}
          onChange={handleDateChange}
          disabled={disabled || readonly}
          dateFormat="yyyy-MM-dd"
          placeholderText={placeholder}
          customInput={<DateInput id={id} name={name} />}
          popperPlacement="bottom-start"
          popperProps={{ strategy: "fixed" }}
          wrapperClassName="w-full"
          popperContainer={popperContainer}
        />
        {showClearButton && (
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={handleClear}
            aria-label="Clear date"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10"
          >
            {renderedClearIcon}
          </button>
        )}
        {!showClearButton && (
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 z-10">
            {renderedCalendarIcon}
          </div>
        )}
      </div>
    );
  },
);
export const TimePicker = React.forwardRef<HTMLInputElement, TimePickerProps>(
  (
    {
      value,
      disabled = false,
      readonly = false,
      onChange,
      className,
      placeholder,
      name,
      error = false,
      id,
      required = false,
      onFocus,
      onBlur,
      calendarIcon,
      clearIcon,
      usePortal = false,
    },
    ref,
  ) => {
    const selectedDate = hasTimestampValue(value)
      ? new Date(value as number)
      : undefined;
    const selectedTime = selectedDate ?? null;
    const displayValue = selectedDate
      ? dayjs(selectedDate).format("HH:mm")
      : "";
    const showClearButton = hasTimestampValue(value) && !(disabled || readonly);
    const renderedCalendarIcon = calendarIcon ?? (
      <CalendarIcon className="h-5 w-5 text-secondary-text" />
    );
    const renderedClearIcon = clearIcon ?? (
      <ClearIcon className="h-4 w-4 text-secondary-text" />
    );

    const handleChange = (nextDate: Date | null) => {
      if (!nextDate) {
        onChange?.(undefined);
        return;
      }
      const base = selectedDate ? new Date(selectedDate) : new Date();
      base.setHours(nextDate.getHours(), nextDate.getMinutes(), 0, 0);
      onChange?.(base.getTime());
    };

    const handleClear: React.MouseEventHandler<HTMLButtonElement> = (event) => {
      event.preventDefault();
      event.stopPropagation();
      onChange?.(undefined);
    };

    const TimeInput = React.forwardRef<
      HTMLInputElement,
      React.ComponentProps<typeof Input>
    >((inputProps, inputRef) => (
      <Input
        {...inputProps}
        ref={inputRef}
        readOnly
        disabled={disabled}
        placeholder={placeholder}
        error={error}
        required={required}
        className={cn(
          inputProps.className,
          className,
          "pr-10",
          error && "border-[1.5px] border-red focus:border-red",
        )}
        hasClearIcon={false}
      />
    ));
    TimeInput.displayName = "DateTimeSelectorTimeInput";

    const popperContainer = usePortal
      ? ({ children }: { children?: React.ReactNode }) =>
          createPortal(children ?? null, document.body)
      : undefined;

    return (
      <div className={cn("w-full relative", className)}>
        <ReactDatePicker
          id={id}
          selected={selectedTime}
          onChange={handleChange}
          onFocus={onFocus}
          onBlur={onBlur}
          disabled={disabled || readonly}
          showTimeSelect
          showTimeSelectOnly
          timeIntervals={5}
          timeCaption="Time"
          dateFormat="HH:mm"
          placeholderText={placeholder ?? "hh:mm"}
          customInput={<TimeInput name={name} value={displayValue} />}
          popperPlacement="bottom-start"
          popperProps={{ strategy: "fixed" }}
          wrapperClassName="w-full"
          popperContainer={popperContainer}
        />
        {showClearButton && (
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={handleClear}
            aria-label="Clear time"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10"
          >
            {renderedClearIcon}
          </button>
        )}
        {!showClearButton && (
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 z-10">
            {renderedCalendarIcon}
          </div>
        )}
      </div>
    );
  },
);
export const DateTimePicker = React.forwardRef<
  HTMLInputElement,
  DatePickerProps
>(
  (
    {
      value,
      disabled = false,
      readonly = false,
      onChange,
      className,
      placeholder,
      name,
      error = false,
      id,
      required = false,
      calendarIcon,
      clearIcon,
      usePortal = false,
    },
    ref,
  ) => {
    const selectedDate = hasTimestampValue(value)
      ? new Date(value as number)
      : null;
    const showClearButton = hasTimestampValue(value) && !(disabled || readonly);
    const renderedCalendarIcon = calendarIcon ?? (
      <CalendarIcon className="h-5 w-5 text-secondary-text" />
    );
    const renderedClearIcon = clearIcon ?? (
      <ClearIcon className="h-4 w-4 text-secondary-text" />
    );

    const handleDateTimeChange = (nextDate: Date | null) => {
      if (!nextDate) {
        onChange?.(undefined);
        return;
      }

      onChange?.(nextDate.getTime());
    };

    const handleClear: React.MouseEventHandler<HTMLButtonElement> = (event) => {
      event.preventDefault();
      event.stopPropagation();
      onChange?.(undefined);
    };

    const DateTimeInput = React.forwardRef<
      HTMLInputElement,
      React.ComponentProps<typeof Input>
    >((inputProps, inputRef) => (
      <Input
        {...inputProps}
        ref={(node) => {
          assignInputRef(inputRef, node);
          assignInputRef(ref, node);
        }}
        readOnly
        disabled={disabled}
        placeholder={placeholder}
        error={error}
        required={required}
        className={cn(
          inputProps.className,
          className,
          "pr-16",
          error && "border-[1.5px] border-red focus:border-red",
        )}
        hasClearIcon={false}
      />
    ));
    DateTimeInput.displayName = "DateTimeSelectorDateTimeInput";

    const popperContainer = usePortal
      ? ({ children }: { children?: React.ReactNode }) =>
          createPortal(children ?? null, document.body)
      : undefined;

    return (
      <div className="w-full relative">
        <ReactDatePicker
          id={id}
          selected={selectedDate}
          onChange={handleDateTimeChange}
          disabled={disabled || readonly}
          showTimeSelect
          timeIntervals={5}
          dateFormat="yyyy-MM-dd HH:mm"
          placeholderText={placeholder ?? "yyyy-mm-dd hh:mm"}
          customInput={<DateTimeInput id={id} name={name} />}
          popperPlacement="bottom-start"
          popperProps={{ strategy: "fixed" }}
          wrapperClassName="w-full"
          popperContainer={popperContainer}
        />
        {showClearButton && (
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={handleClear}
            aria-label="Clear date time"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10"
          >
            {renderedClearIcon}
          </button>
        )}
        {!showClearButton && (
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 z-10">
            {renderedCalendarIcon}
          </div>
        )}
      </div>
    );
  },
);
