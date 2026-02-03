import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onDateChange: (start: Date, end: Date) => void;
}

export const DateRangePicker = ({ startDate, endDate, onDateChange }: DateRangePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date>(startDate);
  const [tempEndDate, setTempEndDate] = useState<Date>(endDate);

  const handleApply = () => {
    onDateChange(tempStartDate, tempEndDate);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {format(startDate, "MMM dd, yyyy")} - {format(endDate, "MMM dd, yyyy")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Start Date</label>
            <Calendar
              mode="single"
              selected={tempStartDate}
              onSelect={(date) => date && setTempStartDate(date)}
              disabled={(date) => date > new Date() || date > tempEndDate}
              initialFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">End Date</label>
            <Calendar
              mode="single"
              selected={tempEndDate}
              onSelect={(date) => date && setTempEndDate(date)}
              disabled={(date) => date > new Date() || date < tempStartDate}
            />
          </div>
          <Button onClick={handleApply} className="w-full">
            Apply Date Range
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
