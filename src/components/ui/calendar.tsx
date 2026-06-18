"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

interface MonthPickerProps {
  currentDate: Date
  onChange: (date: Date) => void
  maxDate?: Date
}

function MonthPicker({ currentDate, onChange, maxDate }: MonthPickerProps) {
  const [viewDate, setViewDate] = React.useState(new Date(currentDate.getTime()))

  const months = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
  ]

  const handlePrevYear = () => {
    setViewDate(new Date(viewDate.getFullYear() - 1, viewDate.getMonth()))
  }

  const handleNextYear = () => {
    const nextYear = new Date(viewDate.getFullYear() + 1, viewDate.getMonth())
    if (maxDate && nextYear > maxDate) {
        // Optional: restriction logic
    }
    setViewDate(nextYear)
  }

  const handleMonthClick = (monthIndex: number) => {
    const newDate = new Date(viewDate.getFullYear(), monthIndex, 1)
    if (maxDate && newDate > maxDate) return
    onChange(newDate)
  }

  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-4">
        <button 
          onClick={handlePrevYear}
          className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }))}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="font-bold">{viewDate.getFullYear()}</div>
        <button 
          onClick={handleNextYear}
          className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }))}
          disabled={maxDate && viewDate.getFullYear() >= maxDate.getFullYear()}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {months.map((month, index) => {
          const isSelected = currentDate.getFullYear() === viewDate.getFullYear() && currentDate.getMonth() === index
          const isDisabled = maxDate && new Date(viewDate.getFullYear(), index, 1) > maxDate
          
          return (
            <button
              key={month}
              onClick={() => handleMonthClick(index)}
              disabled={isDisabled}
              className={cn(
                buttonVariants({ 
                  variant: isSelected ? "default" : "ghost",
                  size: "sm"
                }),
                "w-full",
                isDisabled && "opacity-30 cursor-not-allowed"
              )}
            >
              {month}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { Calendar, MonthPicker }
