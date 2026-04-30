"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/en"; // Ensure locale is loaded
import { cn } from "@/utils/cn";
import { Button } from "./button";

export interface CalendarProps {
  value?: Date;
  onChange?: (date: Date) => void;
  className?: string;
}

export function Calendar({ value, onChange, className }: CalendarProps) {
  const [currentDate, setCurrentDate] = React.useState(
    dayjs(value || new Date()),
  );

  const startOfMonth = currentDate.startOf("month");
  const endOfMonth = currentDate.endOf("month");
  const daysInMonth = endOfMonth.date();
  const startDayOfWeek = startOfMonth.day(); // 0 (Sun) - 6 (Sat)

  const weekdays = Array.from({ length: 7 }, (_, i) =>
    dayjs().day(i).format("dd"),
  );

  const handlePrevMonth = () => {
    setCurrentDate(currentDate.subtract(1, "month"));
  };

  const handleNextMonth = () => {
    setCurrentDate(currentDate.add(1, "month"));
  };

  const handleDayClick = (day: number) => {
    const newDate = startOfMonth.date(day).toDate();
    if (onChange) {
      onChange(newDate);
    }
  };

  const renderDays = () => {
    const days = [];
    // Add blank days for the start of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(<div key={`blank-${i}`} className="w-9 h-9" />);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = startOfMonth.date(day);
      const isSelected = value && dayjs(value).isSame(date, "day");
      const isToday = dayjs().isSame(date, "day");

      days.push(
        <button
          key={day}
          onClick={() => handleDayClick(day)}
          className={cn("h-9 w-9 p-0 font-normal rounded-md", {
            "bg-lighten-blue text-white": isSelected,
            "bg-stroke rounded-full": isToday && !isSelected,
            "text-dark": date.month() !== currentDate.month(),
            "hover:bg-gray-2 hover:text-dark": !isSelected && !isToday,
          })}
        >
          {day}
        </button>,
      );
    }
    return days;
  };

  return (
    <div className={cn("p-3 rounded-md border border-lighten-blue", className)}>
      <div className="flex justify-between items-center mb-4">
        <Button
          onClick={handlePrevMonth}
          variant={"icon"}
          className={cn(
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium">
          {currentDate.format("MMMM YYYY")}
        </div>
        <Button
          onClick={handleNextMonth}
          variant={"icon"}
          className={cn(
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {weekdays.map((day) => (
          <div
            key={day}
            className="text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 mt-2">{renderDays()}</div>
    </div>
  );
}

Calendar.displayName = "Calendar";
