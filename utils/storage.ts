// app/utils/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define event type
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD format
  startTime?: string; // HH:MM format
  endTime?: string; // HH:MM format
  color?: string;
  createdAt: string;
  updatedAt: string;
  //creator: string;
}

// Storage keys
const STORAGE_KEYS = {
  EVENTS: '@calendar_events',
} as const;

// Generate unique ID
const generateId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  const performanceStamp = performance.now().toString(36).replace('.', '');
  
  return `ev-${timestamp}-${randomStr}-${performanceStamp}`;
};

// Add event validation function
const validateEvent = (event: any): event is CalendarEvent => {
  // Basic validation
  if (!event || typeof event !== 'object') {
    return false;
  }
  
  // 🚨 If missing ID, try to fix
  if (!event.id || typeof event.id !== 'string' || event.id.trim() === '') {
    console.warn('⚠️ Event missing ID, attempting to fix:', event);
    
    // If has createdAt, use it to generate ID
    if (event.createdAt && typeof event.createdAt === 'string') {
      event.id = `fixed-${event.createdAt.replace(/[^0-9]/g, '')}`;
      console.log('🛠️ Fixed event ID:', event.id);
      return true;
    }
    
    // Otherwise generate new ID
    event.id = generateId();
    console.log('🛠️ Generated new ID for event:', event.id);
    return true;
  }
  
  // Validate other required fields
  const hasTitle = typeof event.title === 'string' && event.title.trim() !== '';
  const hasDate = typeof event.date === 'string' && event.date.trim() !== '';
  
  if (!hasTitle || !hasDate) {
    console.warn('⚠️ Event missing required fields:', { hasTitle, hasDate, event });
    return false;
  }
  
  return true;
};

// Get all events
export const getEvents = async (): Promise<CalendarEvent[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.EVENTS);
    if (!jsonValue) return [];
    
    let events = JSON.parse(jsonValue);
    
    // 🚨 Fix: Validate and repair all events
    const validEvents: CalendarEvent[] = [];
    const invalidEvents: any[] = [];
    
    events.forEach((event: any, index: number) => {
      const eventCopy = { ...event }; // Create copy to avoid modifying original array
      
      if (validateEvent(eventCopy)) {
        validEvents.push(eventCopy as CalendarEvent);
      } else {
        invalidEvents.push({ index, event });
        console.warn(`❌ Invalid event at index ${index}:`, event);
      }
    });
    
    // If invalid events were fixed, save repaired list
    if (invalidEvents.length > 0) {
      console.log(`🛠️ Fixed ${invalidEvents.length} invalid events`);
      await AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(validEvents));
    }
    
    console.log(`📊 Loaded ${validEvents.length} valid events`);
    return validEvents;
  } catch (error) {
    console.error('Failed to load events:', error);
    return [];
  }
};

// Save an event (create or update)
export const saveEvent = async (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<CalendarEvent> => {
  try {
    console.log('💾 SAVE EVENT - Input:', {
      hasId: !!event.id,
      id: event.id,
      title: event.title,
      date: event.date
    });
    
    const events = await getEvents();
    const now = new Date().toISOString();
    
    // 🚨 Fix: Ensure always has ID
    let eventId = event.id;
    
    // If new event or no ID, generate one
    if (!eventId || eventId.trim() === '') {
      eventId = generateId();
      console.log('🆕 Generated new ID:', eventId);
    }
    
    // Check if event with same ID already exists (when editing)
    const existingIndex = events.findIndex(e => e.id === eventId);
    
    if (existingIndex !== -1) {
      // 🚨 Update existing event
      console.log('🔄 Updating existing event at index:', existingIndex);
      
      const updatedEvent: CalendarEvent = {
        ...events[existingIndex],  // Keep all original fields
        ...event,                  // Override with new values
        id: eventId,               // 🚨 Ensure ID remains unchanged
        updatedAt: now,
      };
      
      console.log('✨ Updated event:', updatedEvent);
      
      events[existingIndex] = updatedEvent;
      await AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
      
      return updatedEvent;
    } else {
      // 🚨 Create new event - ensure all required fields exist
      console.log('🆕 Creating new event with ID:', eventId);
      
      const newEvent: CalendarEvent = {
        id: eventId,
        createdAt: now,
        updatedAt: now,
        title: event.title || '',
        date: event.date || new Date().toISOString().split('T')[0],
        description: event.description || '',
        startTime: event.startTime,
        endTime: event.endTime,
        color: event.color || '#007AFF',
      };
      
      console.log('✅ New event created:', newEvent);
      
      events.push(newEvent);
      await AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
      
      return newEvent;
    }
  } catch (error) {
    console.error('❌ Failed to save event:', error);
    throw error;
  }
};

// Delete an event
export const deleteEvent = async (eventId: string): Promise<boolean> => {
  try {
    const events = await getEvents();
    const filteredEvents = events.filter(event => event.id !== eventId);
    await AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(filteredEvents));
    return true;
  } catch (error) {
    console.error('Failed to delete event:', error);
    return false;
  }
};

// Get events for a specific date
export const getEventsForDate = async (dateString: string): Promise<CalendarEvent[]> => {
  try {
    const events = await getEvents();
    return events.filter(event => event.date === dateString);
  } catch (error) {
    console.error('Failed to get events for date:', error);
    return [];
  }
};