// app/components/reusable-calendar/CalendarDay.tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CalendarDayProps } from './types';

// Extended props interface
interface ExtendedCalendarDayProps extends CalendarDayProps {
  cellSize?: { width: number; height: number };
  fontSize?: number;
  compact?: boolean; // Add compact property
}

const CalendarDay: React.FC<ExtendedCalendarDayProps> = ({
  date,
  isCurrentMonth,
  isToday,
  isSelected,
  eventsCount,
  onPress,
  disabled = false,
  cellSize = { width: 40, height: 60 },
  fontSize = 16,
  compact = false,
}) => {
  const dayNumber = date.getDate();
  
  return (
    <TouchableOpacity
      style={[
        styles.dayContainer,
        {
          width: cellSize.width,
          height: cellSize.height,
          borderRadius: cellSize.width / 2, // Circular
        },
        isToday && styles.todayContainer,
        isSelected && styles.selectedContainer,
        !isCurrentMonth && styles.otherMonthContainer,
        disabled && styles.disabledContainer,
        compact && styles.compactContainer, // Compact mode style
      ]}
      onPress={() => !disabled && onPress(date)}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.dayText,
        { fontSize: fontSize },
        !isCurrentMonth && styles.otherMonthText,
        isToday && styles.todayText,
        isSelected && styles.selectedText,
        disabled && styles.disabledText,
        compact && styles.compactDayText, // Compact mode text style
      ]}>
        {dayNumber}
      </Text>
      
      {eventsCount > 0 && (
        <View style={[
          styles.eventsIndicator,
          compact && styles.compactEventsIndicator // Compact mode event indicator
        ]}>
          <View style={[
            styles.eventDot,
            { backgroundColor: isSelected ? '#ffffff' : '#007AFF' },
            compact && styles.compactEventDot // Compact mode event dot
          ]} />
          {eventsCount > 1 && !compact && ( // Compact mode doesn't show numbers
            <Text style={[
              styles.eventCount,
              { 
                color: isSelected ? '#ffffff' : '#007AFF',
                fontSize: fontSize * 0.6
              }
            ]}>
              {eventsCount > 9 ? '9+' : eventsCount}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  dayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  compactContainer: {
    marginVertical: 1,
  },
  todayContainer: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  selectedContainer: {
    backgroundColor: '#007AFF',
  },
  otherMonthContainer: {
    opacity: 0.4,
  },
  disabledContainer: {
    opacity: 0.3,
  },
  dayText: {
    fontWeight: '500',
    color: '#000000',
  },
  compactDayText: {
    fontWeight: '400',
  },
  todayText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  selectedText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  otherMonthText: {
    color: '#8E8E93',
  },
  disabledText: {
    color: '#C7C7CC',
  },
  eventsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  compactEventsIndicator: {
    marginTop: 1,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  compactEventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  eventCount: {
    fontWeight: '600',
    marginLeft: 1,
  },
});

export default CalendarDay;