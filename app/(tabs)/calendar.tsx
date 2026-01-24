// app/(tabs)/calendar.tsx
import ReusableCalendar from '@/components/reusable-calendar';
import { CalendarEvent, deleteEvent, getEvents, getEventsForDate } from '@/utils/storage';
import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import EventModal from '../../components/event-modal'; // or '@/components/event-modal' depending on your file location

const CalendarScreen: React.FC = () => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsByDate, setEventsByDate] = useState<Record<string, number>>({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 🚨 Responsive calculations: adjust layout based on screen size
  const isTablet = screenWidth >= 768;
  const isSmallScreen = screenWidth < 375;

  // 🚨 Fix: Create responsive styles
  const styles = useMemo(() => {
    // Base values
    const paddingBase = isTablet ? 24 : 16;
    const fontSizeBase = isTablet ? 16 : 14;
    
    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: '#f2f2f7',
      },
      header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: paddingBase,
        paddingTop: 20,
        paddingBottom: 16,
        backgroundColor: '#ffffff',
      },
      headerTitle: {
        fontSize: isTablet ? 32 : 28,
        fontWeight: 'bold',
        color: '#000000',
      },
      headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: isTablet ? 16 : 12,
      },
      showAllButton: {
        paddingHorizontal: isTablet ? 20 : 16,
        paddingVertical: isTablet ? 10 : 8,
        backgroundColor: '#f2f2f7',
        borderRadius: isTablet ? 24 : 20,
      },
      showAllButtonText: {
        fontSize: fontSizeBase,
        fontWeight: '600',
        color: '#007AFF',
      },
      addButton: {
        width: isTablet ? 52 : 44,
        height: isTablet ? 52 : 44,
        borderRadius: isTablet ? 26 : 22,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
      },
      calendarContainer: {
        paddingTop: 0,
        paddingHorizontal: paddingBase,
        paddingVertical: isTablet ? 16 : 12,
        backgroundColor: '#ffffff',
        height: "57%"
      },
      titleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: paddingBase,
        paddingVertical: 12,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e5ea',
      },
      selectedDateText: {
        fontSize: isTablet ? 18 : 16,
        fontWeight: '600',
        color: '#000000',
      },
      eventCountText: {
        fontSize: fontSizeBase,
        color: '#8E8E93',
      },
      eventListContainer: {
        flex: 1,
        backgroundColor: '#f2f2f7',
      },
      eventsList: {
        paddingHorizontal: paddingBase, // 🚨 Fix: using responsive padding here
        paddingBottom: 40,
        paddingTop: 8,
      },
      eventItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: isTablet ? 20 : 16,
        marginBottom: isTablet ? 16 : 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      },
      eventColorDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
      },
      eventContent: {
        flex: 1,
      },
      eventTitle: {
        fontSize: isTablet ? 18 : 16,
        fontWeight: '600',
        color: '#000000',
        marginBottom: 4,
      },
      eventDescription: {
        fontSize: isTablet ? 16 : 14,
        color: '#8E8E93',
        marginBottom: 4,
      },
      eventTime: {
        fontSize: isTablet ? 16 : 14,
        color: '#007AFF',
        fontWeight: '500',
        marginBottom: 2,
      },
      eventDate: {
        fontSize: isTablet ? 14 : 12,
        color: '#8E8E93',
      },
      emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
      },
      emptyStateText: {
        fontSize: isTablet ? 20 : 18,
        fontWeight: '600',
        color: '#8E8E93',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
      },
      emptyStateSubtext: {
        fontSize: fontSizeBase,
        color: '#C7C7CC',
        textAlign: 'center',
      },
      emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      },
    });
  }, [isTablet, screenWidth]);

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Format date key (YYYY-MM-DD)
  const formatDateKey = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Format event date
  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Load events from storage
  const loadEvents = useCallback(async () => {
    try {
      const allEventsData = await getEvents();
      
      // Group events for calendar display
      const grouped: Record<string, number> = {};
      allEventsData.forEach(event => {
        if (!grouped[event.date]) {
          grouped[event.date] = 0;
        }
        grouped[event.date]++;
      });
      setEventsByDate(grouped);
      
      // Show events based on showAllEvents state
      if (showAllEvents) {
        setEvents(allEventsData);
      } else {
        const dateString = formatDateKey(selectedDate);
        const dateEvents = await getEventsForDate(dateString);
        setEvents(dateEvents);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  }, [selectedDate, showAllEvents]);

  // Toggle show all events
  const toggleShowAllEvents = () => {
    setShowAllEvents(!showAllEvents);
  };

  // Load events when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadEvents();
      return () => {};
    }, [loadEvents])
  );

  // Load events when refreshTrigger changes
  useEffect(() => {
    loadEvents();
  }, [refreshTrigger, loadEvents]);

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  // Handle add event
  const handleAddEvent = () => {
    setSelectedEvent(null);
    setIsModalVisible(true);
    console.log('🎯 Add Event Button Pressed!');
    console.log('Current state:', {
      isModalVisible,
      selectedEvent,
      screenWidth
    });
    // Check if setting was successful
    setTimeout(() => {
      console.log('After setting state - isModalVisible:', isModalVisible);
      console.log('Modal should be visible now');
    }, 100);
  };

  // Handle edit event
  const handleEditEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsModalVisible(true);
  };

  // Handle delete event
  const handleDeleteEvent = useCallback(async (eventId: string) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteEvent(eventId);
            if (success) {
              setRefreshTrigger(prev => prev + 1);
            }
          },
        },
      ]
    );
  }, []);

  // Handle modal close
  const handleModalClose = () => {
    setIsModalVisible(false);
    setSelectedEvent(null);
    setRefreshTrigger(prev => prev + 1);
  };

  // Render event item
  const renderEventItem = useCallback(({ item }: { item: CalendarEvent }) => (
    <TouchableOpacity
      style={styles.eventItem}
      onPress={() => handleEditEvent(item)}
      onLongPress={() => handleDeleteEvent(item.id)}
    >
      <View style={[styles.eventColorDot, { backgroundColor: item.color || '#007AFF' }]} />
      <View style={styles.eventContent}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        {item.description && (
          <Text style={styles.eventDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        {(item.startTime || item.endTime) && (
          <Text style={styles.eventTime}>
            {item.startTime} {item.endTime && `- ${item.endTime}`}
          </Text>
        )}
        <Text style={styles.eventDate}>
          {formatEventDate(item.date)}
        </Text>
      </View>
      <FontAwesome name="chevron-right" size={16} color="#8E8E93" />
    </TouchableOpacity>
  ), [handleEditEvent, handleDeleteEvent]);

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <FontAwesome name="calendar-o" size={isTablet ? 56 : 48} color="#C7C7CC" />
      <Text style={styles.emptyStateText}>
        {showAllEvents ? 'No events in calendar' : 'No events for this day'}
      </Text>
      <Text style={styles.emptyStateSubtext}>Tap + to add an event</Text>
    </View>
  );

  // In return statement, add EventModal at the end of SafeAreaView
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calendar</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            onPress={toggleShowAllEvents} 
            style={styles.showAllButton}
          >
            <Text style={styles.showAllButtonText}>
              {showAllEvents ? 'Show Selected Day' : 'Show All'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleAddEvent} 
            style={styles.addButton}
          >
            <FontAwesome name="plus" size={isTablet ? 24 : 20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Calendar Component */}
      <View style={styles.calendarContainer}>
        <ReusableCalendar
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          eventsByDate={eventsByDate}
          showWeekdays={true}
        />
      </View>
      
      {/* Selected Date / Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.selectedDateText}>
          {showAllEvents ? 'All Events' : formatDate(selectedDate)}
        </Text>
        <Text style={styles.eventCountText}>
          {events.length} {events.length === 1 ? 'event' : 'events'}
        </Text>
      </View>
      
      {/* Events List */}
      <View style={styles.eventListContainer}>
        {events.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={events}
            renderItem={renderEventItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.eventsList}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          />
        )}
      </View>
      
      {/* 🚨 Key: Add EventModal component */}
      <EventModal
        visible={isModalVisible}
        onClose={handleModalClose}
        onDelete={handleDeleteEvent}
        date={selectedDate}
        event={selectedEvent}
        getEventsForDate={getEventsForDate} // Add this line
      />
      
    </SafeAreaView>
  );
};

export default CalendarScreen;