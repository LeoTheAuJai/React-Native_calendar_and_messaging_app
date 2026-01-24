// app/components/reusable-calendar/index.tsx
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import CalendarDay from './CalendarDay';
import { CalendarProps } from './types';

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Extended props interface to support compact mode
interface ExtendedCalendarProps extends CalendarProps {
  compact?: boolean;
}

const ReusableCalendar: React.FC<ExtendedCalendarProps> = ({
  selectedDate,
  onDateSelect,
  eventsByDate = {},
  month: controlledMonth,
  onMonthChange,
  showWeekdays = true,
  theme = {},
  compact = false, // Default not compact
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const [internalMonth, setInternalMonth] = useState<Date>(new Date());
  const currentMonth = controlledMonth || internalMonth;

  // 🚨 Responsive calculation: adjust calendar cell size based on screen width, compact mode has smaller dimensions
  const calendarCellSize = useMemo(() => {
    if (compact) {
      // Compact mode dimensions
      if (screenWidth >= 768) {
        return { width: 35, height: 45 }; // Tablet
      } else if (screenWidth >= 414) {
        return { width: 30, height: 40 }; // Large phone
      } else {
        return { width: 28, height: 38 }; // Small phone
      }
    } else {
      // Normal mode dimensions
      if (screenWidth >= 768) {
        return { width: 60, height: 80 }; // Tablet
      } else if (screenWidth >= 414) {
        return { width: 50, height: 70 }; // Large phone
      } else if (screenWidth >= 375) {
        return { width: 45, height: 65 }; // Medium phone
      } else {
        return { width: 40, height: 60 }; // Small phone
      }
    }
  }, [screenWidth, compact]);
  
  // Responsive font size, compact mode has smaller fonts
  const fontSize = useMemo(() => {
    if (compact) {
      if (screenWidth >= 768) return { day: 14, weekday: 12 };
      if (screenWidth >= 414) return { day: 12, weekday: 10 };
      return { day: 11, weekday: 9 };
    } else {
      if (screenWidth >= 768) return { day: 18, weekday: 16 };
      if (screenWidth >= 414) return { day: 16, weekday: 14 };
      return { day: 14, weekday: 12 };
    }
  }, [screenWidth, compact]);
  
  // Get days in month grid
  const daysGrid = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days: Date[] = [];
    const firstDayOfWeek = firstDay.getDay();
    
    // Add days from previous month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push(date);
    }
    
    // Add days of current month
    const daysInMonth = lastDay.getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    // Compact mode shows only 5 weeks, normal mode shows 6 weeks
    const totalCells = compact ? 35 : 42; // 5 weeks * 7 days or 6 weeks * 7 days
    const daysToAdd = totalCells - days.length;
    for (let i = 1; i <= daysToAdd; i++) {
      const date = new Date(year, month + 1, i);
      days.push(date);
    }
    
    return days;
  }, [currentMonth, compact]);
  
  // Format month/year for display
  const monthYearLabel = useMemo(() => {
    return currentMonth.toLocaleDateString('en-US', {
      month: compact ? 'short' : 'long',
      year: 'numeric',
    });
  }, [currentMonth, compact]);
  
  // Navigate to previous month
  const goToPreviousMonth = useCallback(() => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    if (controlledMonth && onMonthChange) {
      onMonthChange(newMonth);
    } else {
      setInternalMonth(newMonth);
    }
  }, [currentMonth, controlledMonth, onMonthChange]);
  
  // Navigate to next month
  const goToNextMonth = useCallback(() => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    if (controlledMonth && onMonthChange) {
      onMonthChange(newMonth);
    } else {
      setInternalMonth(newMonth);
    }
  }, [currentMonth, controlledMonth, onMonthChange]);
  
  // Check if a date is today
  const isToday = useCallback((date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }, []);
  
  // Check if a date is selected
  const isSelected = useCallback((date: Date) => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  }, [selectedDate]);
  
  // Check if date is in current month
  const isCurrentMonth = useCallback((date: Date) => {
    return (
      date.getMonth() === currentMonth.getMonth() &&
      date.getFullYear() === currentMonth.getFullYear()
    );
  }, [currentMonth]);
  
  // Format date key for events lookup
  const formatDateKey = useCallback((date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }, []);
  
  return (
    <View style={[
      styles.container,
      compact && styles.compactContainer // Compact mode container style
    ]}>
      {/* Month/Year Header - compact mode has smaller padding */}
      <View style={[
        styles.header,
        compact && styles.compactHeader
      ]}>
        <TouchableOpacity onPress={goToPreviousMonth} style={[
          styles.navButton,
          compact && styles.compactNavButton
        ]}>
          <Text style={[
            styles.navButtonText, 
            { fontSize: fontSize.day },
            compact && styles.compactNavButtonText
          ]}>‹</Text>
        </TouchableOpacity>
        
        <Text style={[
          styles.monthYearText, 
          { fontSize: fontSize.day + (compact ? 1 : 2) },
          compact && styles.compactMonthYearText
        ]}>
          {monthYearLabel}
        </Text>
        
        <TouchableOpacity onPress={goToNextMonth} style={[
          styles.navButton,
          compact && styles.compactNavButton
        ]}>
          <Text style={[
            styles.navButtonText, 
            { fontSize: fontSize.day },
            compact && styles.compactNavButtonText
          ]}>›</Text>
        </TouchableOpacity>
      </View>
      
      {/* Weekday Headers - compact mode shows shorter weekday names */}
      {showWeekdays && (
        <View style={[
          styles.weekdaysContainer,
          compact && styles.compactWeekdaysContainer
        ]}>
          {weekdays.map((day) => (
            <View 
              key={day} 
              style={[
                styles.weekdayCell, 
                { width: calendarCellSize.width },
                compact && styles.compactWeekdayCell
              ]}
            >
              <Text style={[
                styles.weekdayText, 
                { fontSize: fontSize.weekday },
                compact && styles.compactWeekdayText
              ]}>
                {compact ? day.charAt(0) : day}
              </Text>
            </View>
          ))}
        </View>
      )}
      
      {/* Days Grid */}
      <View style={[
        styles.daysGrid, 
        { maxWidth: calendarCellSize.width * 7 },
        compact && styles.compactDaysGrid
      ]}>
        {daysGrid.map((date, index) => {
          const dateKey = formatDateKey(date);
          const eventsCount = eventsByDate[dateKey] || 0;
          
          return (
            <View 
              key={`day-${dateKey}-${index}`}
              style={{ width: calendarCellSize.width }}
            >
              <CalendarDay
                date={date}
                isCurrentMonth={isCurrentMonth(date)}
                isToday={isToday(date)}
                isSelected={isSelected(date)}
                eventsCount={eventsCount}
                onPress={onDateSelect}
                // Pass dimensions to CalendarDay component
                cellSize={calendarCellSize}
                fontSize={fontSize.day}
                compact={compact} // Pass compact property
              />
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactContainer: {
    padding: 8,
    borderRadius: 8,
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  compactHeader: {
    marginBottom: 8,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f2f2f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactNavButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  navButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  compactNavButtonText: {
    fontSize: 16,
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  compactMonthYearText: {
    fontSize: 14,
    fontWeight: '600',
  },
  weekdaysContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    margin: "auto"
  },
  compactWeekdaysContainer: {
    marginBottom: 4,
  },
  weekdayCell: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  compactWeekdayCell: {
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    textTransform: 'uppercase',
  },
  compactWeekdayText: {
    fontSize: 10,
    textTransform: 'none',
  },
  daysGrid: {
    margin: "auto",
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  compactDaysGrid: {
    // Compact mode doesn't need additional styling
  },
});

export default ReusableCalendar;