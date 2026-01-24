// app/(tabs)/calendar/event-modal.tsx
import { CalendarEvent, saveEvent } from '@/utils/storage';
import { checkEventConflicts, EventWithTime, isValidTime, validateTimeOrder } from '@/utils/time-utils';
import { FontAwesome } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface EventModalProps {
  visible: boolean;
  onClose: () => void;
  onDelete?: (eventId: string) => Promise<void> | void;
  date: Date;
  event?: CalendarEvent | null;
  // Add function to get events for same day
  getEventsForDate?: (dateString: string) => Promise<CalendarEvent[]>;
}
  
const EventModal: React.FC<EventModalProps> = ({  
  visible, 
  onClose, 
  onDelete,
  date, 
  event,
  getEventsForDate: getEventsFn
}) => {
  console.log('🎯 EventModal rendered, visible:', visible);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(date || new Date());
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [color, setColor] = useState('#007AFF');
  const [timeConflictError, setTimeConflictError] = useState<string>('');
  const [existingEvents, setExistingEvents] = useState<EventWithTime[]>([]);
  
  // Use Date objects to manage time, not strings
  const [startTimeDate, setStartTimeDate] = useState<Date>(new Date());
  const [endTimeDate, setEndTimeDate] = useState<Date>(new Date());
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  
  const colorOptions = [
    { name: 'Blue', value: '#007AFF', icon: 'water' },
    { name: 'Green', value: '#34C759', icon: 'leaf' },
    { name: 'Red', value: '#FF3B30', icon: 'flame' },
    { name: 'Orange', value: '#FF9500', icon: 'sunny' },
    { name: 'Purple', value: '#AF52DE', icon: 'flower' },
    { name: 'Teal', value: '#5AC8FA', icon: 'cloud' },
    { name: 'Yellow', value: '#FFCC00', icon: 'star' },
  ];
  
  // Initialize form when modal opens or event changes
  useEffect(() => {
    if (visible) {
      if (event) {
        setTitle(event.title || '');
        setDescription(event.description || '');
        
        // Set date
        const eventDate = event.date ? new Date(event.date) : (date || new Date());
        setSelectedDate(eventDate);
        
        // Set time (if available)
        if (event.startTime) {
          const [hours, minutes] = event.startTime.split(':').map(Number);
          const startDate = new Date();
          startDate.setHours(hours, minutes, 0, 0);
          setStartTimeDate(startDate);
          setStartTime(event.startTime);
        } else {
          // Default start time to current time
          const now = new Date();
          setStartTimeDate(now);
          setStartTime(formatTime(now));
        }
        
        if (event.endTime) {
          const [hours, minutes] = event.endTime.split(':').map(Number);
          const endDate = new Date();
          endDate.setHours(hours, minutes, 0, 0);
          setEndTimeDate(endDate);
          setEndTime(event.endTime);
        } else {
          // Default end time to start time + 1 hour
          const endTime = new Date(startTimeDate.getTime() + 60 * 60 * 1000);
          setEndTimeDate(endTime);
          setEndTime(formatTime(endTime));
        }
        
        setColor(event.color || '#007AFF');
      } else {
        resetForm();
      }
    }
  }, [event, visible, date]);
  
  // 🚨 Fix: Load same-day events for conflict checking
useEffect(() => {
  const loadExistingEvents = async () => {
    if (visible && getEventsFn) {
      try {
        const dateString = formatDateForStorage(selectedDate);
        const events = await getEventsFn(dateString);
        
        // Filter out current event being edited (if in edit mode)
        const filteredEvents = event?.id 
          ? events.filter(e => e.id !== event.id)
          : events;
        
        // Convert to EventWithTime format
        const formattedEvents: EventWithTime[] = filteredEvents.map(ev => ({
          id: ev.id,
          startTime: ev.startTime,
          endTime: ev.endTime,
          date: ev.date,
        }));
        
        setExistingEvents(formattedEvents);
        console.log('📋 Loaded existing events for conflict check:', formattedEvents.length);
        
        // Immediately check conflicts (if time is already set)
        if (startTime && endTime) {
          checkForTimeConflicts();
        }
      } catch (error) {
        console.error('Failed to load existing events:', error);
      }
    }
  };
  
  if (visible) {
    loadExistingEvents();
  }
  
  return () => {
    setExistingEvents([]);
    setTimeConflictError('');
  };
}, [visible, selectedDate, getEventsFn, event?.id]);
  
  // 🚨 Fix: Check for time conflicts
  const checkForTimeConflicts = useCallback(() => {
  console.log('🔍🔍🔍 CHECKING TIME CONFLICTS 🔍🔍🔍');
  console.log('New event time:', startTime, '-', endTime);
  console.log('Selected date:', formatDateForStorage(selectedDate));
  console.log('Existing events count:', existingEvents.length);
  
  // Print all existing events
  existingEvents.forEach((ev, i) => {
    console.log(`  Event ${i}: ${ev.startTime} - ${ev.endTime} (ID: ${ev.id})`);
  });
  
  if (!startTime || !endTime) {
    console.log('No time specified, skipping conflict check');
    setTimeConflictError('');
    return false;
  }
  
  // Validate time format
  if (!isValidTime(startTime) || !isValidTime(endTime)) {
    console.log('Invalid time format');
    setTimeConflictError('Invalid time format (use HH:MM)');
    return true;
  }
  
  // Validate time order
  if (!validateTimeOrder(startTime, endTime)) {
    console.log('End time is not after start time');
    setTimeConflictError('End time must be after start time');
    return true;
  }
    
const newEventData: EventWithTime = {
    id: event?.id,
    startTime,
    endTime,
    date: formatDateForStorage(selectedDate),
  };
    
    console.log('New event data for conflict check:', newEventData);
  
  const { hasConflict, message, conflictingEvents } = checkEventConflicts(
    newEventData,
    existingEvents,
    event?.id
  );
    
    console.log('Conflict check result:', {
    hasConflict,
    message,
    conflictingCount: conflictingEvents.length
  });
  
  if (conflictingEvents.length > 0) {
    console.log('Conflicting events found:');
    conflictingEvents.forEach((conflict, i) => {
      console.log(`  Conflict ${i}: ${conflict.startTime} - ${conflict.endTime}`);
    });
  }
  
  if (hasConflict) {
    console.log('🚨 CONFLICT DETECTED:', message);
    setTimeConflictError(message);
    return true;
  } else {
    console.log('✅ No conflicts detected');
    setTimeConflictError('');
    return false;
  }
}, [startTime, endTime, selectedDate, existingEvents, event?.id]);
  
  // Check conflicts when time changes
  useEffect(() => {
    if (startTime && endTime) {
      console.log('⏰ Time changed, checking conflicts...');
      const hasConflict = checkForTimeConflicts();
      console.log('Has conflict after time change:', hasConflict);
    }
  const timer = setTimeout(() => {
    if (startTime && endTime) {
      console.log('🔄 Auto-checking conflicts after time change...');
      const hasConflict = checkForTimeConflicts();
      
      if (hasConflict) {
        console.log('Auto-check: CONFLICT detected');
      } else {
        console.log('Auto-check: No conflicts');
      }
    }
  }, 500); // Delay 500ms check to avoid frequent calls
  
  return () => clearTimeout(timer);
}, [startTime, endTime, checkForTimeConflicts]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSelectedDate(date || new Date());
    
    // Set default time (current time and 1 hour later)
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    
    setStartTimeDate(now);
    setEndTimeDate(oneHourLater);
    setStartTime(formatTime(now));
    setEndTime(formatTime(oneHourLater));
    
    setColor('#007AFF');
    setTimeConflictError('');
  };
  const renderConflictWarning = () => {
  if (!timeConflictError) return null;
  
  return (
    <View style={styles.conflictWarningContainer}>
      <View style={styles.conflictHeader}>
        <FontAwesome name="exclamation-triangle" size={20} color="#FF9500" />
        <Text style={styles.conflictHeaderText}>Time Conflict Detected</Text>
      </View>
      <Text style={styles.conflictMessage}>{timeConflictError}</Text>
      <TouchableOpacity 
        style={styles.conflictHelpButton}
        onPress={() => {
          Alert.alert(
            'How to Resolve Time Conflicts',
            '1. Adjust your event start or end time\n' +
            '2. Choose a different date\n' +
            '3. Remove or modify conflicting events\n\n' +
            'Tip: Events cannot overlap in the same time slot on the same day.'
          );
        }}
      >
        <Text style={styles.conflictHelpText}>How to fix?</Text>
      </TouchableOpacity>
    </View>
  );
};
  
  // Format time to HH:MM string
  const formatTime = (date: Date): string => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return '';
    }
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  
  const formatDate = (date: Date | null | undefined): string => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return 'Select date';
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  
  const formatDateForStorage = (date: Date): string => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      const today = new Date();
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  
  const getValidDate = (input: any): Date => {
    try {
      if (input instanceof Date && !isNaN(input.getTime())) {
        return input;
      }
      if (typeof input === 'string') {
        const parsed = new Date(input);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
      return new Date();
    } catch {
      return new Date();
    }
  };
  
  // Handle date selection
  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      setSelectedDate(selectedDate);
      setTimeConflictError(''); // Reset conflict error when date changes
    }
  };
  
  // Handle start time selection
  const handleStartTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false);
    }
    
    if (selectedTime) {
      const timeString = formatTime(selectedTime);
      setStartTimeDate(selectedTime);
      setStartTime(timeString);
      
      // If end time is earlier than start time, automatically adjust end time
      if (endTimeDate.getTime() <= selectedTime.getTime()) {
        const newEndTime = new Date(selectedTime.getTime() + 60 * 60 * 1000); // +1 hour
        setEndTimeDate(newEndTime);
        setEndTime(formatTime(newEndTime));
      }
    }
  };
  
  // Handle end time selection
  const handleEndTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndTimePicker(false);
    }
    
    if (selectedTime) {
      const timeString = formatTime(selectedTime);
      
      // Ensure end time is not earlier than start time
      if (selectedTime.getTime() > startTimeDate.getTime()) {
        setEndTimeDate(selectedTime);
        setEndTime(timeString);
      } else {
        Alert.alert('Invalid Time', 'End time must be after start time');
      }
    }
  };
  
  // Show time picker
  const showTimePicker = (type: 'start' | 'end') => {
    if (type === 'start') {
      setShowStartTimePicker(true);
    } else {
      setShowEndTimePicker(true);
    }
  };
  
  const handleClose = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };
  
  // 🚨 Fix: Check time conflicts before saving
  const handleSave = async () => {
  console.log('💾 Attempting to save event...');
  
  if (!title.trim()) {
    Alert.alert('Error', 'Please enter a title for the event');
    return;
  }
  
  // Validate time if provided
  if (startTime && endTime) {
    // Validate time format
    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      Alert.alert('Invalid Time', 'Please enter valid time in HH:MM format (24-hour)');
      return;
    }
    
    // Validate time order
    if (!validateTimeOrder(startTime, endTime)) {
      Alert.alert('Invalid Time', 'End time must be after start time');
      return;
    }
    
    // Check for time conflicts
    console.log('🔍 Final conflict check before saving...');
    
    const conflictResult = checkEventConflicts(
      {
        id: event?.id,
        startTime,
        endTime,
        date: formatDateForStorage(selectedDate),
      },
      existingEvents,
      event?.id
    );
    
    if (conflictResult.hasConflict) {
      // Show detailed conflict alert with options
      Alert.alert(
        'Time Conflict',
        conflictResult.message + '\n\nWould you like to save anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Save Anyway', 
            style: 'destructive',
            onPress: () => saveEventWithRetry()
          },
          { 
            text: 'Adjust Time', 
            onPress: () => {
              // Focus on time fields
              setShowStartTimePicker(true);
            }
          }
        ]
      );
      return;
    }
  }
  
  // If no conflicts or times not provided, save normally
  await saveEventWithRetry();
};
// Separate save function for retry logic
const saveEventWithRetry = async () => {
  try {
    const validDate = getValidDate(selectedDate);
    
    const eventData = {
      id: event?.id,
      title: title.trim(),
      description: description.trim(),
      date: formatDateForStorage(validDate),
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      color,
    };
    
    await saveEvent(eventData);
    console.log('✅ Event saved successfully');
    handleClose();
  } catch (error) {
    console.error('Save error:', error);
    Alert.alert('Error', 'Failed to save event. Please try again.');
  }
};
  
  // Render time selection button
  const renderTimeButton = (type: 'start' | 'end') => {
    const time = type === 'start' ? startTime : endTime;
    const showPicker = type === 'start' ? showStartTimePicker : showEndTimePicker;
    const handleChange = type === 'start' ? handleStartTimeChange : handleEndTimeChange;
    const timeDate = type === 'start' ? startTimeDate : endTimeDate;
    
    return (
    <View>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => {
          console.log(`📱 ${type} time button pressed`);
          if (type === 'start') {
            setShowStartTimePicker(true);
          } else {
            setShowEndTimePicker(true);
          }
        }}
      >
        <FontAwesome name="clock-o" size={20} color="#007AFF" />
        <Text style={styles.pickerText}>
          {time || 'Not set'}
        </Text>
      </TouchableOpacity>
      
      {showPicker && (
        <DateTimePicker
          value={timeDate}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          minuteInterval={15}
          style={{ marginTop: 10 }} // Add some spacing
        />
      )}

      
    </View>
    
  );
};
  
  const displayDate = getValidDate(selectedDate);
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {event ? 'Edit Event' : 'New Event'}
          </Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.formContainer}>
          {/* Title */}
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.titleInput}
              placeholder="Event Title"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor="#8E8E93"
              maxLength={100}
            />
          </View>
          
          {/* Description */}
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Description (optional)"
              value={description}
              onChangeText={setDescription}
              placeholderTextColor="#8E8E93"
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>
          
          {/* Date Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <FontAwesome name="calendar" size={20} color="#007AFF" />
              <Text style={styles.pickerText}>{formatDate(displayDate)}</Text>
            </TouchableOpacity>
            
            {showDatePicker && (
              <DateTimePicker
                value={displayDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
              />
            )}
          </View>
          
          {/* 🚨 Time conflict error display */}
          {timeConflictError ? (
            <View style={styles.errorContainer}>
              <FontAwesome name="exclamation-triangle" size={16} color="#FF3B30" />
              <Text style={styles.errorText}>{timeConflictError}</Text>
            </View>
          ) : null}
          
          {/* Time Pickers */}
          <View style={styles.timeContainer}>
            {/* Start Time */}
            <View style={styles.timeGroup}>
              <Text style={styles.label}>Start Time</Text>
              {renderTimeButton('start')}
            </View>
            
            {/* End Time */}
            <View style={styles.timeGroup}>
              <Text style={styles.label}>End Time</Text>
              {renderTimeButton('end')}
            </View>
          </View>
          
          {/* Color Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Color</Text>
            <View style={styles.colorContainer}>
              {colorOptions.map((colorOption, index) => (
<TouchableOpacity
  key={`color-option-${colorOption.value}-${index}`}
  style={[
    styles.colorOption,
    { backgroundColor: colorOption.value },
    color === colorOption.value && styles.colorOptionSelected,
  ]}
  onPress={() => setColor(colorOption.value)}
>
  {color === colorOption.value && (
    <FontAwesome name="check" size={16} color="#ffffff" />
  )}
</TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 17,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  formContainer: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  titleInput: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
   conflictWarningContainer: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFB74D',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  conflictHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9800',
    marginLeft: 8,
  },
  conflictMessage: {
    fontSize: 14,
    color: '#FF9800',
    marginBottom: 12,
  },
  conflictHelpButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderRadius: 8,
  },
  conflictHelpText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF9800',
  },
  descriptionInput: {
    fontSize: 16,
    color: '#000000',
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  pickerText: {
    fontSize: 16,
    color: '#000000',
    marginLeft: 12,
    flex: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  timeGroup: {
    flex: 0.48,
  },
  colorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  // 🚨 Add error display styles
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
});

export default EventModal;