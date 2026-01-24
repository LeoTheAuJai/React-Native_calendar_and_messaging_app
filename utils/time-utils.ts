// app/utils/time-utils.ts - Complete version with storage integration

export interface TimeSlot {
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
}

export interface EventWithTime {
  id?: string;
  startTime?: string;
  endTime?: string;
  date: string;
}

// Helper function to parse time string consistently
const parseTimeString = (timeString: string): { hours: number; minutes: number } | null => {
  if (!timeString || typeof timeString !== 'string') {
    console.warn('parseTimeString: Invalid input', timeString);
    return null;
  }
  
  const trimmedTime = timeString.trim();
  
  // Handle multiple formats: "01:00", "1:00", "13:30", "2:00", etc.
  const timeParts = trimmedTime.split(':');
  if (timeParts.length !== 2) {
    console.warn(`parseTimeString: Invalid format "${timeString}"`);
    return null;
  }
  
  const hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1], 10);
  
  // Validate ranges
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    console.warn(`parseTimeString: Invalid time value "${timeString}"`);
    return null;
  }
  
  return { hours, minutes };
};

// Convert time string to minutes count
export const timeToMinutes = (timeString: string): number => {
  const parsed = parseTimeString(timeString);
  if (!parsed) {
    console.warn(`timeToMinutes: Failed to parse "${timeString}"`);
    return 0;
  }
  
  const totalMinutes = parsed.hours * 60 + parsed.minutes;
  return totalMinutes;
};

// Validate time format
export const isValidTime = (timeString: string | undefined): boolean => {
  if (!timeString) return false;
  return parseTimeString(timeString) !== null;
};

// Validate time order
export const validateTimeOrder = (startTime: string | undefined, endTime: string | undefined): boolean => {
  if (!startTime || !endTime) return true; // If no time set, default pass
  
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  
  if (start === 0 || end === 0) {
    console.warn('validateTimeOrder: Invalid time inputs', { startTime, endTime });
    return false;
  }
  
  return end > start;
};

// Check if two time slots conflict
export const hasTimeConflict = (
  slot1: TimeSlot,
  slot2: TimeSlot
): boolean => {
  // Validate input
  if (!slot1.startTime || !slot1.endTime || !slot2.startTime || !slot2.endTime) {
    return false;
  }
  
  // Validate time format
  if (!isValidTime(slot1.startTime) || !isValidTime(slot1.endTime) || 
      !isValidTime(slot2.startTime) || !isValidTime(slot2.endTime)) {
    return false;
  }
  
  const start1 = timeToMinutes(slot1.startTime);
  const end1 = timeToMinutes(slot1.endTime);
  const start2 = timeToMinutes(slot2.startTime);
  const end2 = timeToMinutes(slot2.endTime);
  
  // Overlap condition: One event's start time is within another event's duration
  const hasOverlap = (start1 < end2 && end1 > start2);
  
  return hasOverlap;
};

// Main conflict check function - fix type issues
export const checkEventConflicts = (
  newEvent: EventWithTime,
  existingEvents: EventWithTime[],
  excludeEventId?: string
): { 
  hasConflict: boolean; 
  conflictingEvents: EventWithTime[]; 
  message: string;
  overlapDetails?: string[];
} => {
  console.log('🔄 Starting conflict check:', {
    newEvent,
    existingEventsCount: existingEvents.length,
    excludeEventId
  });
  
  // If new event has no time, don't check conflicts
  if (!newEvent.startTime || !newEvent.endTime) {
    return {
      hasConflict: false,
      conflictingEvents: [],
      message: 'No time specified'
    };
  }
  
  // Extract time values, TypeScript now knows they're not undefined
  const newStartTime = newEvent.startTime;
  const newEndTime = newEvent.endTime;
  const newDate = newEvent.date;
  
  // Validate new event time format
  if (!isValidTime(newStartTime) || !isValidTime(newEndTime)) {
    return {
      hasConflict: false,
      conflictingEvents: [],
      message: 'Invalid time format'
    };
  }
  
  // Validate time order
  if (!validateTimeOrder(newStartTime, newEndTime)) {
    return {
      hasConflict: true,
      conflictingEvents: [],
      message: 'End time must be after start time'
    };
  }
  
  const conflictingEvents: EventWithTime[] = [];
  const overlapDetails: string[] = [];
  
  // Create time slot for new event
  const newSlot: TimeSlot = {
    startTime: newStartTime,
    endTime: newEndTime,
  };
  
  // Check each existing event
  for (const existingEvent of existingEvents) {
    // Exclude self (when editing)
    if (excludeEventId && existingEvent.id === excludeEventId) {
      continue;
    }
    
    // Only check events on the same day
    if (existingEvent.date !== newDate) {
      continue;
    }
    
    // Skip events without complete time
    if (!existingEvent.startTime || !existingEvent.endTime) {
      continue;
    }
    
    // Extract existing event time values
    const existingStartTime = existingEvent.startTime;
    const existingEndTime = existingEvent.endTime;
    
    // Create time slot for existing event
    const existingSlot: TimeSlot = {
      startTime: existingStartTime,
      endTime: existingEndTime,
    };
    
    // Check conflict
    if (hasTimeConflict(newSlot, existingSlot)) {
      conflictingEvents.push(existingEvent);
      
      // Calculate overlap time
      const newStart = timeToMinutes(newStartTime);
      const newEnd = timeToMinutes(newEndTime);
      const existStart = timeToMinutes(existingStartTime);
      const existEnd = timeToMinutes(existingEndTime);
      
      const overlapStart = Math.max(newStart, existStart);
      const overlapEnd = Math.min(newEnd, existEnd);
      const overlapMinutes = overlapEnd - overlapStart;
      
      overlapDetails.push(
        `Overlap with ${existingStartTime}-${existingEndTime}: ${overlapMinutes} minutes`
      );
    }
  }
  
  // Generate conflict message
  let message = '';
  if (conflictingEvents.length > 0) {
    const conflictList = conflictingEvents
      .map(e => `${e.startTime} - ${e.endTime}`)
      .join(', ');
    
    message = `Time conflicts with ${conflictingEvents.length} existing event(s): ${conflictList}`;
  }
  
  return {
    hasConflict: conflictingEvents.length > 0,
    conflictingEvents,
    message,
    overlapDetails
  };
};

// Wrapper function to directly check conflicts from storage
export const checkConflictsFromStorage = async (
  newEvent: {
    id?: string;
    startTime?: string;
    endTime?: string;
    date: string;
  },
  getEventsForDateFn: (date: string) => Promise<EventWithTime[]>
): Promise<{
  hasConflict: boolean;
  conflictingEvents: EventWithTime[];
  message: string;
}> => {
  try {
    // Get all events for the same day
    const existingEvents = await getEventsForDateFn(newEvent.date);
    
    // Convert to EventWithTime format
    const formattedExistingEvents: EventWithTime[] = existingEvents.map(event => ({
      id: event.id,
      startTime: event.startTime,
      endTime: event.endTime,
      date: event.date,
    }));
    
    // Check conflicts
    return checkEventConflicts(
      {
        id: newEvent.id,
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        date: newEvent.date,
      },
      formattedExistingEvents,
      newEvent.id
    );
  } catch (error) {
    console.error('Error checking conflicts from storage:', error);
    return {
      hasConflict: false,
      conflictingEvents: [],
      message: 'Error checking conflicts',
    };
  }
};

// Get first available time slot
export const findAvailableTimeSlot = async (
  date: string,
  durationMinutes: number,
  getEventsForDateFn: (date: string) => Promise<EventWithTime[]>,
  startHour: number = 9,
  endHour: number = 17
): Promise<{ startTime: string; endTime: string } | null> => {
  try {
    const existingEvents = await getEventsForDateFn(date);
    
    // Filter events with complete time and sort by start time
    const eventsWithTimes = existingEvents
      .filter(event => event.startTime && event.endTime)
      .sort((a, b) => {
        const aTime = a.startTime ? timeToMinutes(a.startTime) : 0;
        const bTime = b.startTime ? timeToMinutes(b.startTime) : 0;
        return aTime - bTime;
      });
    
    let currentTime = startHour * 60; // Convert to minutes
    
    for (const event of eventsWithTimes) {
      if (!event.startTime || !event.endTime) continue;
      
      const eventStart = timeToMinutes(event.startTime);
      const eventEnd = timeToMinutes(event.endTime);
      
      // Check if there's enough space between current time and event start time
      if (eventStart - currentTime >= durationMinutes) {
        return {
          startTime: `${Math.floor(currentTime / 60).toString().padStart(2, '0')}:${(currentTime % 60).toString().padStart(2, '0')}`,
          endTime: `${Math.floor((currentTime + durationMinutes) / 60).toString().padStart(2, '0')}:${((currentTime + durationMinutes) % 60).toString().padStart(2, '0')}`
        };
      }
      
      // Move to after event ends
      currentTime = Math.max(currentTime, eventEnd);
      
      // If already past end time, stop searching
      if (currentTime >= endHour * 60) {
        break;
      }
    }
    
    // Check if there's space after the last event
    if ((endHour * 60) - currentTime >= durationMinutes) {
      return {
        startTime: `${Math.floor(currentTime / 60).toString().padStart(2, '0')}:${(currentTime % 60).toString().padStart(2, '0')}`,
        endTime: `${Math.floor((currentTime + durationMinutes) / 60).toString().padStart(2, '0')}:${((currentTime + durationMinutes) % 60).toString().padStart(2, '0')}`
      };
    }
    
    return null; // No available time slot
  } catch (error) {
    console.error('Error finding available time slot:', error);
    return null;
  }
};