// components/MediaAttachmentButton.tsx - UPDATED VERSION with Calendar Events
import { CalendarEvent, getEvents } from '@/utils/storage'; // Import calendar related functions
import { uploadToStreamCDN } from '@/utils/streamUploadService';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { useEffect, useState } from 'react';


interface MediaAttachmentButtonProps {
  onMediaSelected: (media: any) => void;
  disabled?: boolean;
  channel?: any;
  onCalendarEventsGenerated?: (calendarMessage: string) => void; // New callback function
}

export default function MediaAttachmentButton({ 
  onMediaSelected, 
  disabled = false,
  channel,
  onCalendarEventsGenerated
}: MediaAttachmentButtonProps) {
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  
  // Date range states
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(null);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(null);
  const [showTempStartPicker, setShowTempStartPicker] = useState(false);
  const [showTempEndPicker, setShowTempEndPicker] = useState(false);
  
  // ========== NEW FUNCTION ADDED: generateCalendarId ==========
const generateCalendarId = (): string => {
  return `cal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
  const [dateRange, setDateRange] = useState<{
    startDate: Date | null;
    endDate: Date | null;
  }>({
    startDate: null,
    endDate: null,
  });
  const [showDateRange, setShowDateRange] = useState(false);

  // Selected events state
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  // Predefined color options
  const colorOptions = [
    { name: 'Blue', value: '#007AFF', icon: 'water' },
    { name: 'Green', value: '#34C759', icon: 'leaf' },
    { name: 'Red', value: '#FF3B30', icon: 'flame' },
    { name: 'Orange', value: '#FF9500', icon: 'sunny' },
    { name: 'Purple', value: '#AF52DE', icon: 'flower' },
    { name: 'Teal', value: '#5AC8FA', icon: 'cloud' },
    { name: 'Yellow', value: '#FFCC00', icon: 'star' },
  ];

  // Load calendar events
  const loadCalendarEvents = async () => {
    try {
      setLoadingEvents(true);
      const events = await getEvents();
      setCalendarEvents(events);
      
      // Set default date range (last 7 days to next 30 days)
      const today = new Date();
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(today.getDate() - 7);
      
      const oneMonthLater = new Date();
      oneMonthLater.setDate(today.getDate() + 30);
      
      setDateRange({
        startDate: oneWeekAgo,
        endDate: oneMonthLater,
      });
      
    } catch (error) {
      console.error('Failed to load calendar events:', error);
      Alert.alert('Error', 'Unable to load calendar events');
    } finally {
      setLoadingEvents(false);
    }
  };

  // Load events when calendar modal opens
  useEffect(() => {
    if (showCalendarModal) {
      loadCalendarEvents();
    }
  }, [showCalendarModal]);

  // Toggle color selection
  const toggleColorSelection = (colorValue: string) => {
    if (selectedColors.includes(colorValue)) {
      setSelectedColors(selectedColors.filter(c => c !== colorValue));
    } else {
      setSelectedColors([...selectedColors, colorValue]);
    }
  };

  // Select all colors
  const selectAllColors = () => {
    const allColors = colorOptions.map(c => c.value);
    setSelectedColors(allColors);
  };

  // Clear all color selections
  const clearAllColors = () => {
    setSelectedColors([]);
  };

  // Filter events by color
  const getFilteredEvents = () => {
    let filtered = calendarEvents;
    
    // Filter by color
    if (selectedColors.length > 0) {
      filtered = filtered.filter(event => 
        selectedColors.includes(event.color || '#007AFF')
      );
    }
    
    // Filter by date range
    if (showDateRange && dateRange.startDate && dateRange.endDate) {
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= dateRange.startDate! && 
               eventDate <= dateRange.endDate!;
      });
    }
    
    return filtered;
  };

  // Toggle event selection state
  const toggleEventSelection = (eventId: string) => {
    if (selectedEvents.includes(eventId)) {
      setSelectedEvents(selectedEvents.filter(id => id !== eventId));
    } else {
      setSelectedEvents([...selectedEvents, eventId]);
    }
  };

  // Select all filtered events
  const selectAllFilteredEvents = () => {
    const filteredEvents = getFilteredEvents();
    const allIds = filteredEvents.map(event => event.id);
    setSelectedEvents(allIds);
  };

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedEvents([]);
  };

  // Get selected events
  const getSelectedEvents = () => {
    const filteredEvents = getFilteredEvents();
    return filteredEvents.filter(event => selectedEvents.includes(event.id));
  };

  // Format date to MM/DD/YYYY for calendar message
  const formatDateForMessage = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      
      // Validate date
      if (isNaN(date.getTime())) {
        console.error('Invalid date string:', dateString);
        return '';
      }
      
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    } catch (error) {
      console.error('Error formatting date for message:', error);
      return '';
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Select date';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Generate calendar message
  const generateCalendarMessage = (useSelectedOnly = false): string | null => {
    let eventsToUse = getFilteredEvents();
    
    if (useSelectedOnly && selectedEvents.length > 0) {
      eventsToUse = eventsToUse.filter(event => selectedEvents.includes(event.id));
    }
    
    if (eventsToUse.length === 0) {
      Alert.alert('Info', 'No events to generate message');
      return null;
    }
    
    // Build event strings
    const eventStrings = eventsToUse.map(event => {
      const dateStr = formatDateForMessage(event.date);
      const eventName = event.title.replace(/_/g, ' ');
      const description = (event.description || '').replace(/_/g, ' ');
      const startTime = event.startTime || '09:00';
      const endTime = event.endTime || '10:00';
      const color = event.color || '#007AFF';
      
      return `_${dateStr}_${eventName}_${description}_${startTime}_${endTime}_${color}`;
    });
    
    // Generate final calendar message
    const calendarMessage = `:/calendar${eventStrings.join(';')};`;
    return calendarMessage;
  };

  // Send calendar events
  const sendCalendarEvents = async (sendAll = false) => {
    // If no events selected and not sending all, use all filtered events
    const useSelectedOnly = !sendAll && selectedEvents.length > 0;
    const eventsToSendCount = useSelectedOnly ? selectedEvents.length : getFilteredEvents().length;
    
    const calendarMessage = generateCalendarMessage(useSelectedOnly);
    
    if (!calendarMessage) {
      return;
    }
    
    // Show confirmation dialog
    Alert.alert(
      'Send Calendar Events',
      `Are you sure you want to send ${eventsToSendCount} events?\n\n` +
      `${useSelectedOnly ? '✅ Only selected events' : '✅ All filtered events'}\n` +
      `🎨 Selected colors: ${
        selectedColors.length === 0 ? 'All colors' : 
        selectedColors.length === colorOptions.length ? 'All colors' :
        selectedColors.length + ' colors'
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              // Call parent component callback
              if (onCalendarEventsGenerated) {
                onCalendarEventsGenerated(calendarMessage);
              } else {
                // If no callback, send directly via channel
                if (channel) {
                  await channel.sendMessage({
                    text: calendarMessage,
                  });
                  Alert.alert('Success', 'Calendar events sent!');
                }
              }
              
              // Close modal and reset state
              setShowCalendarModal(false);
              setSelectedColors([]);
              setSelectedEvents([]);
            } catch (error) {
              console.error('Failed to send calendar events:', error);
              Alert.alert('Error', 'Sending failed, please try again');
            }
          }
        }
      ]
    );
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow access to photos to select images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      await handleFileSelection(result, 'gallery');
    } catch (error) {
      console.error('Failed to pick image:', error);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow access to camera to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      await handleFileSelection(result, 'camera');
    } catch (error) {
      console.error('Failed to take photo:', error);
    }
  };

  const pickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow access to media library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
      });

      await handleFileSelection(result, 'video');
    } catch (error) {
      console.error('Failed to pick video:', error);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      await handleFileSelection(result, 'document');
    } catch (error) {
      console.error('Failed to pick document:', error);
    }
  };

  // Preview calendar message
  const previewCalendarMessage = () => {
    const useSelectedOnly = selectedEvents.length > 0;
    const eventsToShow = useSelectedOnly 
      ? getFilteredEvents().filter(event => selectedEvents.includes(event.id))
      : getFilteredEvents();
    
    if (eventsToShow.length === 0) {
      Alert.alert('Preview', 'No events to preview');
      return;
    }
    
    let previewText = `📅 Calendar Preview (${eventsToShow.length} events)\n\n`;
    
    if (useSelectedOnly) {
      previewText += '✅ Only selected events\n\n';
    }
    
    // Group by date
    const eventsByDate: Record<string, CalendarEvent[]> = {};
    eventsToShow.forEach(event => {
      const dateKey = event.date;
      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = [];
      }
      eventsByDate[dateKey].push(event);
    });
    
    // Build preview text
    Object.keys(eventsByDate).sort().forEach(dateKey => {
      const events = eventsByDate[dateKey];
      const date = new Date(dateKey);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
      
      previewText += `📅 ${dateStr}:\n`;
      events.forEach(event => {
        const colorName = colorOptions.find(c => c.value === event.color)?.name || 'Unnamed';
        const selectedIcon = selectedEvents.includes(event.id) ? '✅ ' : '• ';
        previewText += `  ${selectedIcon}${event.title} (${event.startTime || 'All day'}) - ${colorName}\n`;
      });
      previewText += '\n';
    });
    
    Alert.alert('Calendar Preview', previewText, [
      { text: 'Close' },
      { 
        text: useSelectedOnly ? 'Send Selected' : 'Send All', 
        onPress: () => sendCalendarEvents(!useSelectedOnly)
      }
    ]);
  };

  // Show event details
  const showEventDetails = (event: CalendarEvent) => {
    Alert.alert(
      'Event Details',
      `📅 ${event.title}\n\n` +
      `📅 Date: ${event.date}\n` +
      `⏰ Time: ${event.startTime || 'All day'}${event.endTime ? ` - ${event.endTime}` : ''}\n` +
      `🎨 Color: ${colorOptions.find(c => c.value === event.color)?.name || 'Default'}\n` +
      `📝 ${event.description || 'No description'}`,
      [
        { text: 'Close', style: 'cancel' },
        { 
          text: selectedEvents.includes(event.id) ? 'Deselect' : 'Select',
          onPress: () => toggleEventSelection(event.id)
        }
      ]
    );
  };

  // Render individual event item for FlatList
  const renderEventItem = ({ item: event, index }: { item: CalendarEvent; index: number }) => {
    const isSelected = selectedEvents.includes(event.id);
    return (
      <TouchableOpacity
        style={[
          styles.eventPreviewItem,
          isSelected && styles.eventPreviewItemSelected
        ]}
        onPress={() => toggleEventSelection(event.id)}
      >
        {/* Selection indicator */}
        <View style={styles.selectionIndicator}>
          {isSelected ? (
            <Ionicons name="checkbox" size={20} color="#007AFF" />
          ) : (
            <Ionicons name="square-outline" size={20} color="#CCC" />
          )}
        </View>
        
        {/* Event color marker */}
        <View 
          style={[
            styles.eventPreviewColor, 
            { backgroundColor: event.color || '#007AFF' }
          ]} 
        />
        
        {/* Event content */}
        <View style={styles.eventPreviewContent}>
          <Text style={styles.eventPreviewTitle} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={styles.eventPreviewDate}>
            {event.date} • {event.startTime || 'All day'}
          </Text>
        </View>
        
        {/* More info button */}
        <TouchableOpacity 
          style={styles.eventInfoButton}
          onPress={() => showEventDetails(event)}
        >
          <Ionicons name="information-circle-outline" size={18} color="#666" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Render header content for FlatList
  const renderHeader = () => (
    <>
      {/* Event statistics */}
      {!loadingEvents && (
        <View style={styles.eventsStats}>
          <Text style={styles.eventsStatsText}>
            📊 {calendarEvents.length} events in calendar
          </Text>
          <Text style={styles.eventsStatsSubtext}>
            {getFilteredEvents().length} events match filters
          </Text>
        </View>
      )}
      
      {/* Color picker */}
      <View style={styles.colorSelectionSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Select Event Colors</Text>
          <View style={styles.sectionActions}>
            <TouchableOpacity onPress={selectAllColors}>
              <Text style={styles.actionText}>Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={clearAllColors} style={styles.actionSpaced}>
              <Text style={styles.actionText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.colorGrid}>
          {colorOptions.map(color => {
            const isSelected = selectedColors.includes(color.value);
            return (
              <TouchableOpacity
                key={color.value}
                style={[
                  styles.colorOption,
                  { backgroundColor: color.value },
                  isSelected && styles.colorOptionSelected
                ]}
                onPress={() => toggleColorSelection(color.value)}
              >
                <Ionicons 
                  name={color.icon as any} 
                  size={18} 
                  color={isSelected ? "#FFF" : "#000"}
                />
                {isSelected && (
                  <Ionicons 
                    name="checkmark" 
                    size={14} 
                    color="#FFF"
                    style={styles.colorCheckmark}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        
        <Text style={styles.colorSelectionInfo}>
          {selectedColors.length === 0 
            ? 'No colors selected (will include all events)' 
            : `${selectedColors.length} colors selected`
          }
        </Text>
      </View>
      
      {/* Date range filter */}
      <View style={styles.dateRangeSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Filter by Date Range</Text>
          <Switch
            value={showDateRange}
            onValueChange={setShowDateRange}
            trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
            thumbColor="#FFF"
          />
        </View>
        
        {showDateRange && dateRange.startDate && dateRange.endDate && (
          <View style={styles.dateRangeInfo}>
            <Text style={styles.dateRangeText}>
              From {formatDate(dateRange.startDate)} 
              {' to '} 
              {formatDate(dateRange.endDate)}
            </Text>
            <TouchableOpacity 
              style={styles.changeDateButton}
              onPress={() => setShowDateRangeModal(true)}
            >
              <Text style={styles.changeDateText}>Change</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Event preview header */}
      {!loadingEvents && getFilteredEvents().length > 0 && (
        <View style={styles.eventsPreviewHeader}>
          <Text style={styles.sectionTitle}>
            Event Preview ({getFilteredEvents().length} events)
          </Text>
          <View style={styles.previewActions}>
            <TouchableOpacity onPress={selectAllFilteredEvents}>
              <Text style={styles.previewActionText}>Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={clearAllSelections} 
              style={styles.previewActionSpaced}
            >
              <Text style={styles.previewActionText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );

  // Render footer for FlatList
  const renderFooter = () => (
    <View style={styles.listFooter}>
      {/* Selected events statistics */}
      {selectedEvents.length > 0 && (
        <View style={styles.selectedStats}>
          <Text style={styles.selectedStatsText}>
            {selectedEvents.length} of {getFilteredEvents().length} events selected
          </Text>
        </View>
      )}
      
      {/* Spacing before bottom buttons */}
      <View style={styles.footerSpacing} />
    </View>
  );

  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={60} color="#E0E0E0" />
      <Text style={styles.emptyStateTitle}>No Events Found</Text>
      <Text style={styles.emptyStateText}>
        {calendarEvents.length === 0 
          ? 'No events in your calendar. Try adjusting your filters.' 
          : 'No events match your current filters. Try changing colors or date range.'}
      </Text>
    </View>
  );

  useEffect(() => {
    if (showDateRangeModal) {
      setTempStartDate(dateRange.startDate);
      setTempEndDate(dateRange.endDate);
    }
  }, [showDateRangeModal, dateRange.startDate, dateRange.endDate]);

  const confirmDateRange = () => {
    if (tempStartDate && tempEndDate) {
      if (tempStartDate > tempEndDate) {
        Alert.alert('Invalid Range', 'Start date cannot be later than end date');
        return;
      }
      
      setDateRange({
        startDate: tempStartDate,
        endDate: tempEndDate
      });
      setShowDateRangeModal(false);
    } else {
      Alert.alert('Incomplete', 'Please select both start and end dates');
    }
  };

  const DateRangePickerModal = () => (
    <Modal
      visible={showDateRangeModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowDateRangeModal(false)}
    >
      <View style={styles.dateRangeModalContainer}>
        {/* Header */}
        <View style={styles.dateRangeModalHeader}>
          <TouchableOpacity 
            onPress={() => setShowDateRangeModal(false)} 
            style={styles.dateRangeCloseButton}
          >
            <Text style={styles.dateRangeCloseButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.dateRangeModalTitle}>Select Date Range</Text>
          <TouchableOpacity 
            onPress={confirmDateRange} 
            style={styles.dateRangeConfirmButton}
          >
            <Text style={styles.dateRangeConfirmButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={[]} // Empty data since we're rendering header content manually
          renderItem={null}
          ListHeaderComponent={
            <>
              {/* Start Date Picker */}
              <View style={styles.dateRangeInputGroup}>
                <Text style={styles.dateRangeLabel}>Start Date</Text>
                <TouchableOpacity
                  style={styles.dateRangePickerButton}
                  onPress={() => setShowTempStartPicker(true)}
                >
                  <FontAwesome name="calendar" size={20} color="#007AFF" />
                  <Text style={styles.dateRangePickerText}>
                    {tempStartDate ? formatDate(tempStartDate) : 'Select start date'}
                  </Text>
                </TouchableOpacity>
                
                {showTempStartPicker && (
                  <DateTimePicker
                    value={tempStartDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                      if (Platform.OS === 'android') {
                        setShowTempStartPicker(false);
                      }
                      if (selectedDate) {
                        setTempStartDate(selectedDate);

                        if (tempEndDate && selectedDate > tempEndDate) {
                          setTempEndDate(selectedDate);
                        }
                      }
                    }}
                    minimumDate={new Date(2000, 0, 1)} // Allow dates from year 2000
                  />
                )}
              </View>
              
              {/* End Date Picker */}
              <View style={styles.dateRangeInputGroup}>
                <Text style={styles.dateRangeLabel}>End Date</Text>
                <TouchableOpacity
                  style={styles.dateRangePickerButton}
                  onPress={() => setShowTempEndPicker(true)}
                >
                  <FontAwesome name="calendar" size={20} color="#007AFF" />
                  <Text style={styles.dateRangePickerText}>
                    {tempEndDate ? formatDate(tempEndDate) : 'Select end date'}
                  </Text>
                </TouchableOpacity>
                
                {showTempEndPicker && (
                  <DateTimePicker
                    value={tempEndDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                      if (Platform.OS === 'android') {
                        setShowTempEndPicker(false);
                      }
                      if (selectedDate) {
                        setTempEndDate(selectedDate);
                        // Ensure start date is not later than end date
                        if (tempStartDate && selectedDate < tempStartDate) {
                          setTempStartDate(selectedDate);
                        }
                      }
                    }}
                    minimumDate={tempStartDate || new Date(2000, 0, 1)}
                    maximumDate={new Date(2100, 11, 31)} // Allow dates up to year 2100
                  />
                )}
              </View>
              
              {/* Quick Selection Options */}
              <View style={styles.quickSelectContainer}>
                <Text style={styles.quickSelectTitle}>Quick Select</Text>
                <View style={styles.quickSelectButtons}>
                  <TouchableOpacity 
                    style={styles.quickSelectButton}
                    onPress={() => {
                      const today = new Date();
                      const yesterday = new Date();
                      yesterday.setDate(today.getDate() - 1);
                      setTempStartDate(yesterday);
                      setTempEndDate(today);
                    }}
                  >
                    <Text style={styles.quickSelectText}>Yesterday</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.quickSelectButton}
                    onPress={() => {
                      const today = new Date();
                      const weekAgo = new Date();
                      weekAgo.setDate(today.getDate() - 7);
                      const weekLater = new Date();
                      weekLater.setDate(today.getDate() + 7);
                      setTempStartDate(weekAgo);
                      setTempEndDate(weekLater);
                    }}
                  >
                    <Text style={styles.quickSelectText}>Last & Next 7 days</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.quickSelectButton}
                    onPress={() => {
                      const today = new Date();
                      const monthAgo = new Date();
                      monthAgo.setMonth(today.getMonth() - 1);
                      const monthLater = new Date();
                      monthLater.setMonth(today.getMonth() + 1);
                      setTempStartDate(monthAgo);
                      setTempEndDate(monthLater);
                    }}
                  >
                    <Text style={styles.quickSelectText}>Last & Next 30 days</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.quickSelectButton}
                    onPress={() => {
                      const today = new Date();
                      const nextYear = new Date();
                      nextYear.setFullYear(today.getFullYear() + 1);
                      setTempStartDate(today);
                      setTempEndDate(nextYear);
                    }}
                  >
                    <Text style={styles.quickSelectText}>Next Year</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Current Selection Display */}
              {tempStartDate && tempEndDate && (
                <View style={styles.selectionDisplay}>
                  <View style={styles.selectionHeader}>
                    <FontAwesome name="calendar-check-o" size={18} color="#34C759" />
                    <Text style={styles.selectionTitle}>Selected Range</Text>
                  </View>
                  <Text style={styles.selectionDates}>
                    {formatDate(tempStartDate)} - {formatDate(tempEndDate)}
                  </Text>
                  <Text style={styles.selectionDays}>
                    {Math.ceil((tempEndDate.getTime() - tempStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                  </Text>
                </View>
              )}
            </>
          }
          contentContainerStyle={styles.dateRangeFormContainer}
        />
      </View>
    </Modal>
  );

  // Calendar modal component
  const CalendarEventsModal = () => (
    <Modal
      visible={showCalendarModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => {
        setShowCalendarModal(false);
        setSelectedColors([]);
        setSelectedEvents([]);
      }}
    >
      <View style={styles.calendarModalOverlay}>
        <View style={styles.calendarModalContent}>
          <View style={styles.calendarModalHeader}>
            <Text style={styles.calendarModalTitle}>📅 Generate Calendar Message</Text>
            <TouchableOpacity 
              onPress={() => {
                setShowCalendarModal(false);
                setSelectedColors([]);
                setSelectedEvents([]);
              }}
              style={styles.calendarCloseButton}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          
          {/* Use FlatList for the main content */}
          <FlatList
            data={getFilteredEvents()}
            renderItem={renderEventItem}
            keyExtractor={(item, index) => item.id || index.toString()}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={styles.calendarModalBody}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          />
          
          {/* Bottom action buttons */}
          <View style={styles.calendarModalFooter}>
            {/* Preview Button */}
            <TouchableOpacity 
              style={[
                styles.footerButton,
                styles.previewButton,
                getFilteredEvents().length === 0 && styles.footerButtonDisabled
              ]}
              onPress={previewCalendarMessage}
              disabled={getFilteredEvents().length === 0}
            >
              <View style={styles.footerButtonContent}>
                <Ionicons name="eye" size={18} color="#007AFF" />
                <Text style={styles.previewButtonText} numberOfLines={1}>Preview</Text>
              </View>
            </TouchableOpacity>
            
            {/* If there are selected events, show two sending options */}
            {selectedEvents.length > 0 ? (
              <>
                {/* Selected Events Button */}
                <TouchableOpacity 
                  style={[
                    styles.footerButton,
                    styles.generateButton,
                    styles.generateButtonPart
                  ]}
                  onPress={() => sendCalendarEvents(false)}
                >
                  <View style={styles.footerButtonContent}>
                    <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                    <Text style={styles.generateButtonText} numberOfLines={1}>
                      Selected ({selectedEvents.length})
                    </Text>
                  </View>
                </TouchableOpacity>
                
                {/* All Events Button */}
                <TouchableOpacity 
                  style={[
                    styles.footerButton,
                    styles.generateButton,
                    getFilteredEvents().length === 0 && styles.footerButtonDisabled
                  ]}
                  onPress={() => sendCalendarEvents(true)}
                  disabled={getFilteredEvents().length === 0}
                >
                  <View style={styles.footerButtonContent}>
                    {loadingEvents ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="calendar" size={18} color="#FFF" />
                        <Text style={styles.generateButtonText} numberOfLines={1}>
                          All ({getFilteredEvents().length})
                        </Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              </>
            ) : (
              /* Single Generate Button when no events selected */
              <TouchableOpacity 
                style={[
                  styles.footerButton,
                  styles.generateButton,
                  styles.generateButtonFull,
                  getFilteredEvents().length === 0 && styles.footerButtonDisabled
                ]}
                onPress={() => sendCalendarEvents(true)}
                disabled={getFilteredEvents().length === 0}
              >
                <View style={styles.footerButtonContent}>
                  {loadingEvents ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="calendar" size={18} color="#FFF" />
                      <Text style={styles.generateButtonText} numberOfLines={1}>
                        Generate ({getFilteredEvents().length})
                      </Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );

  // File selection logic
  const handleFileSelection = async (result: any, source: string) => {
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      
      try {
        setUploading(true);
        
        console.log('Selected asset:', asset);
        
        // Get file info
        const fileName = asset.fileName || 
                        asset.uri?.split('/').pop() || 
                        `file_${Date.now()}`;
        
        const mimeType = asset.mimeType || 'application/octet-stream';
        const type = mimeType.startsWith('image/') ? 'image' : 
                    mimeType.startsWith('video/') ? 'video' : 'file';
        
        if (!asset.uri) {
          throw new Error('No file URI found');
        }
        
        // Show upload progress
        Alert.alert('Upload', 'Uploading file to Stream CDN...', [], {
          cancelable: false,
        });
        
        // ✅ Pass channel when calling
        const uploadResult = await uploadToStreamCDN(
          asset.uri,
          fileName,
          mimeType,
          channel // ✅ Pass 4th parameter
        );
        
        console.log('✅ Upload successful:', uploadResult);
        
        // Return the CDN URL
        const mediaData = {
          uri: uploadResult.url, // CDN URL
          type: type as 'image' | 'video' | 'file',
          name: fileName,
          mimeType: mimeType,
          thumbnailUrl: uploadResult.thumbnailUrl,
        };
        
        console.log('Returning CDN URL:', mediaData.uri);
        
        onMediaSelected(mediaData);
        
        Alert.alert('Success', 'File uploaded to Stream CDN!');
        
      } catch (error: any) {
        console.error('File upload error:', error);
        Alert.alert('Upload Failed', error.message || 'Could not upload file');
      } finally {
        setUploading(false);
        setShowMediaOptions(false);
      }
    }
  };

  // Media options modal
  const MediaOptionsModal = () => (
    <Modal
      visible={showMediaOptions}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowMediaOptions(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowMediaOptions(false)}
      >
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <Text style={styles.modalTitle}>Send Media</Text>
          
          <View style={styles.optionsContainer}>
            <TouchableOpacity style={styles.optionButton} onPress={pickImage}>
              <View style={styles.optionIcon}>
                <Ionicons name="images" size={28} color="#007AFF" />
              </View>
              <Text style={styles.optionText}>Gallery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.optionButton} onPress={takePhoto}>
              <View style={styles.optionIcon}>
                <Ionicons name="camera" size={28} color="#007AFF" />
              </View>
              <Text style={styles.optionText}>Camera</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.optionButton} onPress={pickVideo}>
              <View style={styles.optionIcon}>
                <Ionicons name="videocam" size={28} color="#007AFF" />
              </View>
              <Text style={styles.optionText}>Video</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.optionButton} onPress={pickDocument}>
              <View style={styles.optionIcon}>
                <Ionicons name="document" size={28} color="#007AFF" />
              </View>
              <Text style={styles.optionText}>File</Text>
            </TouchableOpacity>
            
            {/* New calendar button */}
            <TouchableOpacity 
              style={styles.optionButton} 
              onPress={() => {
                setShowMediaOptions(false);
                setTimeout(() => setShowCalendarModal(true), 300);
              }}
            >
              <View style={styles.optionIcon}>
                <Ionicons name="calendar" size={28} color="#007AFF" />
              </View>
              <Text style={styles.optionText}>Calendar</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => setShowMediaOptions(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <>
      <TouchableOpacity
        style={[styles.attachButton, disabled && styles.disabled]}
        onPress={() => setShowMediaOptions(true)}
        disabled={disabled || uploading}
      >
        {uploading ? (
          <ActivityIndicator size="small" color="#666" />
        ) : (
          <Ionicons name="attach" size={24} color="#666" />
        )}
      </TouchableOpacity>
      
      <MediaOptionsModal />
      <CalendarEventsModal />
      <DateRangePickerModal />
    </>
  );
}

const styles = StyleSheet.create({
  // Original styles remain unchanged
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    marginRight: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#000',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  optionButton: {
    alignItems: 'center',
    padding: 10,
    width: 70,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  
  // New calendar related styles
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  calendarModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    flex: 1,
  },
  calendarModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  calendarModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  calendarCloseButton: {
    padding: 4,
  },
  calendarModalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexGrow: 1,
  },
  calendarModalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 8,
    flexWrap: 'wrap',
  },
  
  // Event statistics
  eventsStats: {
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  eventsStatsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  eventsStatsSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  
  // Color selection section
  colorSelectionSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  sectionActions: {
    flexDirection: 'row',
  },
  actionText: {
    fontSize: 14,
    color: '#007AFF',
  },
  actionSpaced: {
    marginLeft: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#000',
    transform: [{ scale: 1.1 }],
  },
  colorCheckmark: {
    position: 'absolute',
    bottom: 4,
    right: 4,
  },
  colorSelectionInfo: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  
  // Date range section
  dateRangeSection: {
    marginBottom: 20,
  },
  dateRangeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  dateRangeText: {
    fontSize: 14,
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  changeDateButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  changeDateText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
  },
  
  // Event preview section
  eventsPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  
  eventPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  eventPreviewColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  eventPreviewContent: {
    flex: 1,
  },
  eventPreviewTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  eventPreviewDate: {
    fontSize: 12,
    color: '#666',
  },
  
  // Footer button styles
  footerButton: {
    flex: 1,
    minWidth: 100,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  footerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  
  footerButtonDisabled: {
    opacity: 0.5,
  },
  
  previewButton: {
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: 'transparent',
  },
  
  previewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center',
    flexShrink: 1,
  },
  
  generateButton: {
    backgroundColor: '#007AFF',
  },
  
  generateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
    flexShrink: 1,
  },
  
  generateButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  
  generateButtonPart: {
    backgroundColor: '#34C759',
  },
  
  generateButtonFull: {
    flex: 2,
  },
  
  // Date Range Modal Styles
  dateRangeModalContainer: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  
  dateRangeModalHeader: {
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
  
  dateRangeCloseButton: {
    padding: 8,
  },
  
  dateRangeCloseButtonText: {
    fontSize: 17,
    color: '#007AFF',
  },
  
  dateRangeModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  
  dateRangeConfirmButton: {
    padding: 8,
  },
  
  dateRangeConfirmButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  
  dateRangeFormContainer: {
    padding: 16,
  },
  
  dateRangeInputGroup: {
    marginBottom: 24,
  },
  
  dateRangeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  
  dateRangePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  
  dateRangePickerText: {
    fontSize: 16,
    color: '#000000',
    marginLeft: 12,
    flex: 1,
  },
  
  // Quick Select Styles
  quickSelectContainer: {
    marginBottom: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  
  quickSelectTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  
  quickSelectButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  
  quickSelectButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f2f2f7',
    borderRadius: 8,
    alignItems: 'center',
  },
  
  quickSelectText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // Selection Display Styles
  selectionDisplay: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    marginBottom: 24,
  },
  
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  selectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 8,
  },
  
  selectionDates: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  
  selectionDays: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  
  previewActions: {
    flexDirection: 'row',
  },
  
  previewActionText: {
    fontSize: 12,
    color: '#007AFF',
  },
  
  previewActionSpaced: {
    marginLeft: 16,
  },

  selectionIndicator: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  eventPreviewItemSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
    borderWidth: 2,
  },

  eventInfoButton: {
    padding: 4,
    marginLeft: 8,
  },

  selectedStats: {
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  
  selectedStatsText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // New styles for FlatList structure
  listFooter: {
    marginTop: 16,
  },
  
  footerSpacing: {
    height: 20,
  },
  
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});