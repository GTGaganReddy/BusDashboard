import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface WeeklyNavigationProps {
  selectedWeek: Date;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

export default function WeeklyNavigation({ 
  selectedWeek, 
  selectedDate, 
  onDateSelect 
}: WeeklyNavigationProps) {
  const weekDays = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(selectedWeek);
    date.setDate(selectedWeek.getDate() + i);
    weekDays.push(date);
  }

  const formatDay = (date: Date) => {
    return date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric" 
    });
  };

  return (
    <Card className="mb-6">
      <div className="flex overflow-x-auto">
        {weekDays.map((day, index) => {
          const isSelected = day.toDateString() === selectedDate.toDateString();
          
          return (
            <Button
              key={index}
              variant="ghost"
              onClick={() => onDateSelect(day)}
              className={`flex-1 min-w-0 px-4 py-3 text-center border-b-2 transition-colors ${
                isSelected
                  ? "border-primary bg-primary/5 text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <div className="text-sm font-semibold">{formatDay(day)}</div>
              <div className="text-xs opacity-75">{formatDate(day)}</div>
            </Button>
          );
        })}
      </div>
    </Card>
  );
}
