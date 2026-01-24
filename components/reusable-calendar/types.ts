// app/components/reusable-calendar/types.ts
export interface CalendarDayProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  eventsCount: number;
  onPress: (date: Date) => void;
  disabled?: boolean;
  compact?: boolean; //  compact 
}

export interface CalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  eventsByDate?: Record<string, number>; // { '2025-12-05': 3 }
  month?: Date; // Optional: control which month to show
  onMonthChange?: (date: Date) => void;
  showWeekdays?: boolean;
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    todayColor?: string;
    selectedColor?: string;
    textColor?: string;
    disabledColor?: string;
  };
  compact?: boolean; // compact
}