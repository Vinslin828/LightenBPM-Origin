"use client";

import * as React from "react";
import dayjs from "dayjs";

import { cn } from "@/utils/cn";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "../icons";
import { Input } from "./input";

const pad = (value: number) => value.toString().padStart(2, "0");

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
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);

    const selectedDate = value ? new Date(value) : undefined;

    const handleSelect = (date: Date | undefined) => {
      if (onChange) {
        if (!date) {
          onChange(undefined);
        } else if (selectedDate) {
          const existing = new Date(selectedDate);
          existing.setFullYear(date.getFullYear());
          existing.setMonth(date.getMonth());
          existing.setDate(date.getDate());
          onChange(existing.getTime());
        } else {
          onChange(date.getTime());
        }
      }
      setOpen(false);
    };

    return (
      <div className="max-h-12 w-full text-left">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            disabled={disabled || readonly}
            className={cn("w-full text-left max-h-[48px]", className)}
            asChild
          >
            <button disabled={disabled || readonly}>
              <Input
                type="text"
                disabled={disabled}
                readOnly={true}
                ref={ref}
                id={id}
                name={name}
                value={
                  selectedDate ? dayjs(selectedDate).format("YYYY-MM-DD") : ""
                }
                placeholder={placeholder ?? "yyyy-mm-dd"}
                error={error}
                required={required}
                className={cn(
                  className,
                  error && "border-[1.5px] border-red focus:border-red",
                )}
                pattern="\d{4}-\d{2}-\d{2}"
                {...props}
              />
              <div className="relative inset-y-0 right-0 -top-8.5 flex flex-row-reverse items-center pr-4 pointer-events-none">
                <CalendarIcon className="h-5 w-5 text-secondary-text bg-white" />
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              // mode="single"
              value={selectedDate}
              onChange={handleSelect}
            />
          </PopoverContent>
        </Popover>
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
      ...props
    },
    ref,
  ) => {
    const selectedDate = value ? new Date(value) : undefined;
    const displayValue = selectedDate
      ? `${pad(selectedDate.getHours())}:${pad(selectedDate.getMinutes())}`
      : "";

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const [hours, minutes] = e.target.value.split(":").map(Number);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        onChange?.(undefined);
        return;
      }
      const base = selectedDate ? new Date(selectedDate) : new Date();
      base.setHours(hours, minutes, 0, 0);
      onChange?.(base.getTime());
    };

    return (
      <Input
        type="time"
        disabled={disabled}
        readOnly={readonly}
        ref={ref}
        id={id}
        name={name}
        value={displayValue}
        placeholder={placeholder ?? "hh:mm"}
        error={error}
        required={required}
        className={cn(
          className,
          error && "border-[1.5px] border-red focus:border-red",
        )}
        onChange={handleChange}
        {...props}
      />
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
      ...props
    },
    ref,
  ) => {
    const handleDateChange = (newDate?: number) => {
      if (!onChange) return;
      if (!newDate) {
        onChange(undefined);
        return;
      }
      const existing = value ? new Date(value) : new Date(newDate);
      const updated = new Date(newDate);
      updated.setHours(existing.getHours(), existing.getMinutes(), 0, 0);
      onChange(updated.getTime());
    };

    const handleTimeChange = (newTime?: number) => {
      if (!onChange) return;
      if (!newTime) {
        onChange(undefined);
        return;
      }
      const existing = value ? new Date(value) : new Date(newTime);
      const updated = new Date(existing);
      const timeDate = new Date(newTime);
      updated.setHours(timeDate.getHours(), timeDate.getMinutes(), 0, 0);
      onChange(updated.getTime());
    };

    return (
      <div className={cn("flex flex-row gap-2 flex-wrap", className)}>
        <div className="flex-1">
          <DatePicker
            ref={ref}
            value={value}
            disabled={disabled}
            readonly={readonly}
            onChange={handleDateChange}
            name={name}
            id={id}
            required={required}
            error={error}
            placeholder={placeholder}
            {...props}
          />
        </div>
        <div className="flex-1">
          <TimePicker
            value={value}
            disabled={disabled}
            readonly={readonly}
            onChange={handleTimeChange}
            name={`${name}-time`}
            error={error}
            required={required}
          />
        </div>
      </div>
    );
  },
);
