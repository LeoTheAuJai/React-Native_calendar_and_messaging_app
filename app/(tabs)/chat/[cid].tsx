// app/(tabs)/chat/[cid].tsx - COMPLETE WORKING VERSION (FIXED)
import MediaAttachmentButton from '@/components/MediaAttachmentButton';
import ReusableCalendar from '@/components/reusable-calendar';
import { useAuth } from '@/hooks/useAuth';

import { CalendarEvent, getEventsForDate, saveEvent } from '@/utils/storage';
import StreamClient from '@/utils/streamClient';
import { uploadToStreamCDN } from '@/utils/streamUploadService'; // Please adjust according to your actual path
import {
  checkConflictsFromStorage,
  EventWithTime,
  isValidTime,
  validateTimeOrder
} from '@/utils/time-utils';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  TextInput as RNTextInput,
  StatusBar,
  StyleSheet,
  Text, // Add this import
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');


// Message Bubble Component - IMPROVED VERSION
// Calendar Message Component

const CalendarMessage = ({ 
   eventsString,
  isOwn,
  message,
  channelMembers,
  currentUserId,
    channel,  // Add this
  messages  // Add this
}: { 
  eventsString: string, 
  isOwn: boolean,
  message: any,
  channelMembers: any[],
  currentUserId: string | null,
  channel: any,  // Add this
  messages: any[] // Add this
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [eventsByDate, setEventsByDate] = useState<Record<string, number>>({});
  const [parsedEvents, setParsedEvents] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<{
    hasConflict: boolean;
    message: string;
    conflictingEvents: EventWithTime[];
  } | null>(null);
  

  // New state for tracking member participation
  const [memberParticipation, setMemberParticipation] = useState<{
    [userId: string]: {
      joined: boolean;
      joinedAt?: Date;
      eventsAdded?: number;
      userName: string;
    }
  }>({});
  
  const [showParticipation, setShowParticipation] = useState(false);
  
   // Initialize member participation tracking
  useEffect(() => {
    if (channelMembers && message?.id) {
      const initialParticipation: any = {};
      
      channelMembers.forEach((member: any) => {
        initialParticipation[member.id] = {
          joined: false,
          userName: member.name || member.id,
        };
      });
      
      // Mark current user as joined if they've already interacted
      if (currentUserId) {
        initialParticipation[currentUserId] = {
          ...initialParticipation[currentUserId],
          joined: false, // Will be updated when they join
        };
      }
      
      setMemberParticipation(initialParticipation);
    }
  }, [channelMembers, message?.id, currentUserId]);

  

  // Update member participation when someone joins
  const updateMemberParticipation = (userId: string, eventsCount: number = 0) => {
    if (!memberParticipation[userId]) return;
    
    setMemberParticipation(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        joined: true,
        joinedAt: new Date(),
        eventsAdded: eventsCount,
      }
    }));
    
    // You could also save this to your backend/database
    saveParticipationToStorage(userId);
  };
    // Save participation to AsyncStorage (or your preferred storage)
  const saveParticipationToStorage = async (userId: string) => {
    try {
      const participationKey = `calendar_participation_${message?.id}_${userId}`;
      const participationData = {
        userId,
        messageId: message?.id,
        joinedAt: new Date().toISOString(),
        joined: true,
      };
      
      // Using AsyncStorage - make sure to import it
      // await AsyncStorage.setItem(participationKey, JSON.stringify(participationData));
      
      console.log('Participation saved for user:', userId);
    } catch (error) {
      console.error('Failed to save participation:', error);
    }
  };
  
    // Load participation data from storage
  const loadParticipationFromStorage = async () => {
    try {
      if (!message?.id) return;
      
      // Load participation for all members
      const loadedParticipation: any = { ...memberParticipation };
      
      for (const member of channelMembers) {
        const participationKey = `calendar_participation_${message?.id}_${member.id}`;
        // const storedData = await AsyncStorage.getItem(participationKey);
        
        // if (storedData) {
        //   const data = JSON.parse(storedData);
        //   loadedParticipation[member.id] = {
        //     ...loadedParticipation[member.id],
        //     joined: data.joined || false,
        //     joinedAt: data.joinedAt ? new Date(data.joinedAt) : undefined,
        //   };
        // }
      }
      
      setMemberParticipation(loadedParticipation);
    } catch (error) {
      console.error('Failed to load participation:', error);
    }
  };
  
  // Calculate participation statistics
  const getParticipationStats = () => {
    const totalMembers = Object.keys(memberParticipation).length;
    const joinedMembers = Object.values(memberParticipation).filter(m => m.joined).length;
    
    return {
      totalMembers,
      joinedMembers,
      pendingMembers: totalMembers - joinedMembers,
      percentage: totalMembers > 0 ? Math.round((joinedMembers / totalMembers) * 100) : 0,
    };
  };
  
  // Render participation summary
  const renderParticipationSummary = () => {
    const stats = getParticipationStats();
    
    if (stats.totalMembers === 0) return null;
    
    return (
      <TouchableOpacity
        style={[
          styles.participationSummary,
          isOwn ? styles.ownParticipationSummary : styles.otherParticipationSummary
        ]}
        onPress={() => setShowParticipation(!showParticipation)}
        activeOpacity={0.7}
      >
        <View style={styles.participationStatsRow}>
          <View style={styles.participationIconContainer}>
            <Ionicons 
              name="people-outline" 
              size={14} 
              color={isOwn ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.7)'} 
            />
            <Text style={[
              styles.participationCount,
              isOwn ? styles.ownParticipationText : styles.otherParticipationText
            ]}>
              {stats.joinedMembers}/{stats.totalMembers}
            </Text>
          </View>
          
          <View style={styles.participationProgressBar}>
            <View 
              style={[
                styles.participationProgressFill,
                { 
                  width: `${stats.percentage}%`,
                  backgroundColor: isOwn ? 'rgba(255, 255, 255, 0.9)' : '#007AFF'
                }
              ]} 
            />
          </View>
          
          <Ionicons 
            name={showParticipation ? "chevron-up-outline" : "chevron-down-outline"} 
            size={16} 
            color={isOwn ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.7)'} 
          />
        </View>
        
        {showParticipation && renderParticipationDetails()}
      </TouchableOpacity>
    );
  };
  
  // Render detailed participation list
  const renderParticipationDetails = () => {
    const stats = getParticipationStats();
    
    return (
      <View style={styles.participationDetails}>
        <View style={styles.participationHeader}>
          <Text style={[
            styles.participationTitle,
            isOwn ? styles.ownParticipationText : styles.otherParticipationText
          ]}>
            Calendar Participation ({stats.percentage}%)
          </Text>
        </View>
        
        <View style={styles.participationLists}>
          {/* Joined Members */}
          {stats.joinedMembers > 0 && (
            <View style={styles.participationList}>
              <View style={styles.participationListHeader}>
                <Ionicons name="checkmark-circle-outline" size={14} color="#34C759" />
                <Text style={[
                  styles.participationListTitle,
                  isOwn ? styles.ownParticipationText : styles.otherParticipationText
                ]}>
                  Joined ({stats.joinedMembers})
                </Text>
              </View>
              
              {Object.entries(memberParticipation)
                .filter(([_, data]) => data.joined)
                .map(([userId, data]) => (
                  <View key={userId} style={styles.participationMember}>
                    <View style={styles.memberInfo}>
                      <View style={[
                        styles.memberStatusDot,
                        { backgroundColor: '#34C759' }
                      ]} />
                      <Text style={[
                        styles.memberName,
                        isOwn ? styles.ownParticipationText : styles.otherParticipationText
                      ]}>
                        {data.userName}
                      </Text>
                    </View>
                    {data.joinedAt && (
                      <Text style={styles.memberTime}>
                        {new Date(data.joinedAt).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </Text>
                    )}
                  </View>
                ))}
            </View>
          )}
          
          {/* Pending Members */}
          {stats.pendingMembers > 0 && (
            <View style={styles.participationList}>
              <View style={styles.participationListHeader}>
                <Ionicons name="time-outline" size={14} color="#FF9500" />
                <Text style={[
                  styles.participationListTitle,
                  isOwn ? styles.ownParticipationText : styles.otherParticipationText
                ]}>
                  Not Joined ({stats.pendingMembers})
                </Text>
              </View>
              
              {Object.entries(memberParticipation)
                .filter(([_, data]) => !data.joined)
                .map(([userId, data]) => (
                  <View key={userId} style={styles.participationMember}>
                    <View style={styles.memberInfo}>
                      <View style={[
                        styles.memberStatusDot,
                        { backgroundColor: '#FF9500' }
                      ]} />
                      <Text style={[
                        styles.memberName,
                        isOwn ? styles.ownParticipationText : styles.otherParticipationText
                      ]}>
                        {data.userName}
                      </Text>
                    </View>
                    <Ionicons name="person-outline" size={16} color="#8E8E93" />
                  </View>
                ))}
            </View>
          )}
        </View>
        
        <View style={styles.participationFooter}>
          <Text style={[
            styles.participationFooterText,
            isOwn ? styles.ownParticipationFooterText : styles.otherParticipationFooterText
          ]}>
          </Text>
        </View>
      </View>
    );
  };
  
// Also update the sendParticipationMessage function to ensure it sends the right format:
const sendParticipationMessage = async (eventId: string, eventName: string, action: 'joined' | 'left' = 'joined') => {
  try {
    if (!channel) {
      console.error('Channel not available');
      return;
    }
    
    // Get current user info
    const client = StreamClient.getInstance();
    const userName = currentUserId || client.userID || 'User';
    
    // Send a system message indicating participation
    const messageText = `!${userName} has joined event "${eventName}"!`;
    
    // Try to send with metadata first, fallback to regular message
    try {
      await channel.sendMessage({
        text: messageText,
        type: 'system',
        metadata: {
          eventId,
          eventName,
          action,
          userId: currentUserId,
          timestamp: new Date().toISOString(),
          type: 'event_participation'
        }
      });
    } catch (metadataError) {
      // If metadata fails, send as regular message
      console.log('Metadata not supported, sending as regular message');
      await channel.sendMessage({
        text: messageText
      });
    }
    
    console.log(`Participation message sent: ${messageText}`);
  } catch (error) {
    console.error('Failed to send participation message:', error);
  }
};
  // Handle adding all events
  const handleAddAllEvents = async () => {
    try {
      if (parsedEvents.length === 0) {
        Alert.alert('Info', 'No events in calendar');
        return;
      }
      
      // Filter events with valid time
      const validEvents = parsedEvents.filter(e => e.isValidTime);
      
      if (validEvents.length === 0) {
        Alert.alert('Info', 'No events with valid time in calendar');
        return;
      }
      
      // Show confirmation dialog
      Alert.alert(
        'Add All Events',
        `Are you sure you want to add all ${validEvents.length} events from the calendar?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Check Conflicts and Add', 
            onPress: () => checkConflictsAndAddAll(validEvents)
          },
          { 
            text: 'Add Anyway (Ignore Conflicts)', 
            style: 'destructive',
            onPress: () => saveAllEvents(validEvents, true)
          }
        ]
      );
    } catch (error) {
      console.error('Failed to add all events:', error);
      Alert.alert('Error', 'Operation failed, please try again');
    }
  };
  
  // Check conflicts and add all events
  const checkConflictsAndAddAll = async (validEvents: any[]) => {
    try {
      setIsSavingAll(true);
      
      // Group events by date
      const eventsByDateGroup: Record<string, any[]> = {};
      validEvents.forEach(event => {
        if (!eventsByDateGroup[event.dateKey]) {
          eventsByDateGroup[event.dateKey] = [];
        }
        eventsByDateGroup[event.dateKey].push(event);
      });
      
      // Check conflicts for each date
      const conflictingDates: string[] = [];
      const conflictDetails: any[] = [];
      
      for (const [dateKey, events] of Object.entries(eventsByDateGroup)) {
        // Get existing events for this date
        const existingEvents = await getEventsForDate(dateKey);
        
        for (const event of events) {
          const conflictResult = await checkConflictsFromStorage(
            {
              startTime: event.startTime,
              endTime: event.endTime,
              date: dateKey,
            },
            getEventsForDate
          );
          
          if (conflictResult.hasConflict) {
            if (!conflictingDates.includes(dateKey)) {
              conflictingDates.push(dateKey);
            }
            conflictDetails.push({
              event,
              conflictResult,
              dateKey,
            });
          }
        }
      }
      
      // If there are conflicts, show options
      if (conflictingDates.length > 0) {
        const conflictCount = conflictDetails.length;
        const dateCount = conflictingDates.length;
        
        Alert.alert(
          'Time Conflicts Found',
          `${conflictCount} events have conflicts in ${dateCount} dates\n\nHow do you want to proceed?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Add Only Non-conflicting Events', 
              onPress: () => addNonConflictingEvents(validEvents, conflictDetails)
            },
            { 
              text: 'View Conflict Details', 
              onPress: () => showConflictDetails(conflictDetails)
            },
            { 
              text: 'Add All (Ignore Conflicts)', 
              style: 'destructive',
              onPress: () => saveAllEvents(validEvents, true)
            }
          ]
        );
      } else {
        // No conflicts, add directly
        Alert.alert(
          'Confirm Addition',
          `All ${validEvents.length} events have no conflicts, confirm to add?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Confirm Add', 
              onPress: () => saveAllEvents(validEvents, false)
            }
          ]
        );
      }
      
    } catch (error) {
      console.error('Failed to check conflicts:', error);
      Alert.alert('Error', 'Failed to check conflicts, please try again');
    } finally {
      setIsSavingAll(false);
    }
  };
  
  // Add only non-conflicting events
  const addNonConflictingEvents = async (validEvents: any[], conflictDetails: any[]) => {
    try {
      setIsSavingAll(true);
      
      // Get conflicting event IDs
      const conflictingEventIds = conflictDetails.map(detail => detail.event.id);
      
      // Filter out non-conflicting events
      const nonConflictingEvents = validEvents.filter(
        event => !conflictingEventIds.includes(event.id)
      );
      
      if (nonConflictingEvents.length === 0) {
        Alert.alert('Info', 'All events have conflicts, no events to add');
        return;
      }
      
      await saveAllEvents(nonConflictingEvents, false);
      
    } catch (error) {
      console.error('Failed to add non-conflicting events:', error);
      Alert.alert('Error', 'Failed to add events, please try again');
    } finally {
      setIsSavingAll(false);
    }
  };
  
  // Show conflict details
  const showConflictDetails = (conflictDetails: any[]) => {
    // Group conflicts by date
    const conflictsByDate: Record<string, any[]> = {};
    conflictDetails.forEach(detail => {
      const dateStr = detail.dateKey; // YYYY-MM-DD format
      const displayDate = formatDateDisplay(dateStr);
      
      if (!conflictsByDate[displayDate]) {
        conflictsByDate[displayDate] = [];
      }
      conflictsByDate[displayDate].push(detail);
    });
    
    // Build detail message
    let detailsMessage = '📅 Conflict Details:\n\n';
    
    Object.entries(conflictsByDate).forEach(([date, conflicts], index) => {
      detailsMessage += `📅 ${date}:\n`;
      conflicts.forEach((conflict, conflictIndex) => {
        const event = conflict.event;
        const conflictMsg = conflict.conflictResult.message.split(':')[0];
        detailsMessage += `${conflictIndex + 1}. ${event.name} (${event.startTime}-${event.endTime})\n`;
        detailsMessage += `   💥 ${conflictMsg}\n`;
      });
      detailsMessage += '\n';
    });
    
    Alert.alert(
      'Time Conflict Details',
      detailsMessage,
      [
        { text: 'Close', style: 'cancel' },
        { 
          text: 'Add Only Non-conflicting Events', 
          onPress: () => addNonConflictingEvents(
            parsedEvents.filter(e => e.isValidTime),
            conflictDetails
          )
        },
        { 
          text: 'Add All (Ignore Conflicts)', 
          style: 'destructive',
          onPress: () => saveAllEvents(
            parsedEvents.filter(e => e.isValidTime),
            true
          )
        }
      ]
    );
  };
  
  // Format date display
  const formatDateDisplay = (dateKey: string) => {
    // dateKey format: YYYY-MM-DD
    const [year, month, day] = dateKey.split('-').map(Number);
    return `${month}/${day}/${year}`;
  };
  
  // Save all events
  const saveAllEvents = async (eventsToSave: any[], ignoreConflicts: boolean) => {
    try {
      setIsSavingAll(true);
      
      const savedEvents: CalendarEvent[] = [];
      const failedEvents: any[] = [];
      
      for (const event of eventsToSave) {
        try {
          // If not ignoring conflicts, check each event
          if (!ignoreConflicts) {
            const conflictResult = await checkConflictsFromStorage(
              {
                startTime: event.startTime,
                endTime: event.endTime,
                date: event.dateKey,
              },
              getEventsForDate
            );
            
            if (conflictResult.hasConflict) {
              failedEvents.push({
                event,
                reason: 'Time conflict',
                conflictDetails: conflictResult.message,
                date: event.dateKey,
              });
              continue;
            }
          }
          
          // Convert date format from MM/DD/YYYY to YYYY-MM-DD
          const [month, day, year] = event.originalDateStr.split('/').map(Number);
          const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          
          const calendarEvent: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> = {
            title: event.name,
            description: event.description || `Added from shared calendar: ${event.name}`,
            date: formattedDate,
            startTime: event.startTime || '09:00',
            endTime: event.endTime || '10:00',
            color: event.color || '#007AFF',
          };
          
          const savedEvent = await saveEvent(calendarEvent);
          savedEvents.push(savedEvent);
          
        } catch (error) {
          console.error('Failed to save single event:', error);
          failedEvents.push({
            event,
            reason: 'Save failed',
            error: error instanceof Error ? error.message : String(error),
            date: event.dateKey,
          });
        }
      }
      
      // Show result
      if (savedEvents.length > 0) {
        let message = `✅ Successfully added ${savedEvents.length} events to your calendar`;
        
        if (failedEvents.length > 0) {
          message += `\n\n⚠️ ${failedEvents.length} events failed:`;
          
          // Group by failure reason
          const reasons: Record<string, number> = {};
          failedEvents.forEach(failed => {
            reasons[failed.reason] = (reasons[failed.reason] || 0) + 1;
          });
          
          Object.entries(reasons).forEach(([reason, count], index) => {
            message += `\n${index + 1}. ${reason}: ${count} events`;
          });
          
          if (failedEvents.some(f => f.reason === 'Time conflict')) {
            message += '\n\n📅 Conflicting events remain in your calendar and need manual schedule adjustment.';
          }
        }
        
        Alert.alert('Complete', message, [{ text: 'OK' }]);
        
        // Re-check conflicts for selected date
        if (selectedDate) {
          checkConflictsForSelectedDate();
        }
      } else {
        Alert.alert('Info', 'No events were successfully added');
      }
      
    } catch (error) {
      console.error('Failed to save all events:', error);
      Alert.alert('Error', 'Failed to save events, please try again');
    } finally {
      setIsSavingAll(false);
    }
  };
  
  // Parse event string
  useEffect(() => {
    if (eventsString) {
      parseEvents(eventsString);
    }
  }, [eventsString]);
  
// In the CalendarMessage component, update the parseEvents function
const parseEvents = (eventsStr: string) => {
  try {
    // Remove prefix ":/calendar"
    const cleanStr = eventsStr.replace(':/calendar', '').trim();
    if (!cleanStr) return;
    
    // Split events by semicolon
    const eventStrings = cleanStr.split(';').filter(e => e.trim());
    const events: any[] = [];
    const dateCounts: Record<string, number> = {};
    
    eventStrings.forEach((eventStr, index) => {
      // Parse format: _11/3/2025_eventName_description_startTime_endTime_color
      const parts = eventStr.split('_');
      if (parts.length >= 6) {
        const dateStr = parts[1]; // 11/3/2025
        const name = parts[2] || 'Event';
        const description = parts[3] || '';
        const startTime = parts[4] || '09:00';
        const endTime = parts[5] || '10:00';
        const color = parts[6] || '#007AFF';
        
        // Parse date
        const [month, day, year] = dateStr.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // Validate time format
        const isValidStartTime = isValidTime(startTime);
        const isValidEndTime = isValidTime(endTime);
        const isValidOrder = validateTimeOrder(startTime, endTime);
        
        // Create unique event ID
        const eventId = `event-${dateKey}-${name.replace(/\s+/g, '-')}-${index}`;
        
        // Add to event list
        events.push({
          id: eventId,
          date,
          dateKey,
          name,
          description,
          startTime: isValidStartTime ? startTime : '09:00',
          endTime: isValidEndTime && isValidOrder ? endTime : '10:00',
          color,
          dateStr,
          originalDateStr: dateStr,
          isValidTime: isValidStartTime && isValidEndTime && isValidOrder,
          timeValidation: {
            isValidStartTime,
            isValidEndTime,
            isValidOrder,
            error: !isValidStartTime ? 'Invalid start time' : 
                   !isValidEndTime ? 'Invalid end time' : 
                   !isValidOrder ? 'End time must be after start time' : null
          }
        });
        
        // Count events per date
        dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;
      }
    });
    
    setParsedEvents(events);
    setEventsByDate(dateCounts);
    
    // Initialize participation for each event
    initializeEventParticipation(events);
    
    // Automatically check conflicts for selected date
    checkConflictsForSelectedDate();
    
  } catch (error) {
    console.error('Failed to parse calendar events:', error);
  }
};
// Add this function to initialize participation for each event
const initializeEventParticipation = (events: any[]) => {
  if (!channelMembers || !message?.id) return;
  
  const initialEventParticipation: Record<string, any> = {};
  
  events.forEach(event => {
    initialEventParticipation[event.id] = {};
    
    channelMembers.forEach((member: any) => {
      initialEventParticipation[event.id][member.id] = {
        joined: false,
        userName: member.name || member.id,
      };
    });
  });
  
  // You'll need to create a new state for event participation
  // Add this to your existing state declarations:
  // const [eventParticipation, setEventParticipation] = useState<Record<string, any>>({});
  
  setEventParticipation(initialEventParticipation);
};
// Add this to your existing state declarations in CalendarMessage
const [eventParticipation, setEventParticipation] = useState<Record<string, any>>({});
const [expandedEvent, setExpandedEvent] = useState<string | null>(null);


const saveEventParticipationToStorage = async (eventId: string, userId: string) => {
  try {
    const participationKey = `calendar_event_participation_${message?.id}_${eventId}_${userId}`;
    const participationData = {
      userId,
      eventId,
      messageId: message?.id,
      joinedAt: new Date().toISOString(),
      joined: true,
    };
    
    // Using AsyncStorage - make sure to import it
    // await AsyncStorage.setItem(participationKey, JSON.stringify(participationData));
    
    console.log('Event participation saved for user:', userId, 'event:', eventId);
  } catch (error) {
    console.error('Failed to save event participation:', error);
  }
};
// Update the member participation function to handle event-specific participation
const updateEventParticipation = (eventId: string, userId: string, eventsCount: number = 0) => {
  if (!eventParticipation[eventId]?.[userId]) return;
  
  setEventParticipation(prev => ({
    ...prev,
    [eventId]: {
      ...prev[eventId],
      [userId]: {
        ...prev[eventId][userId],
        joined: true,
        joinedAt: new Date(),
        eventsAdded: eventsCount,
      }
    }
  }));
  
saveEventParticipationToStorage(eventId, userId);
};
// Update the EventParticipationItem component to use async participation checking:
const EventParticipationItem = ({ event, isOwn }: { event: any, isOwn: boolean }) => {
  const [stats, setStats] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  
  // Load participation stats
  useEffect(() => {
    const loadParticipation = async () => {
      setLoading(true);
      try {
        const participationStats = await getEventParticipationStats(event.id, event.name);
        setStats(participationStats);
        
         // Check if current user has joined
        const userHasJoined = await checkCurrentUserParticipation(event.id, event.name);
        setHasJoined(userHasJoined);
      } catch (error) {
        console.error('Failed to load participation:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadParticipation();
  }, [event.id, event.name, messages]); // Add event.name dependency
  
  // Function to handle joining an event
  const handleJoinEvent = async () => {
    try {
      if (hasJoined) {
        // User already joined, maybe show option to leave?
        Alert.alert('Already Joined', 'You have already joined this event');
        return;
      }
      
      // Check if event has valid time
      if (!event.isValidTime) {
        Alert.alert('Invalid Time', 'This event has invalid time format');
        return;
      }
      
      // Check for conflicts
      const conflictResult = await checkConflictsFromStorage(
        {
          startTime: event.startTime,
          endTime: event.endTime,
          date: event.dateKey,
        },
        getEventsForDate
      );
      
      if (conflictResult.hasConflict) {
        Alert.alert(
          'Time Conflict',
          `This event conflicts with existing events: ${conflictResult.message.split(':')[0]}`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Join Anyway', 
              style: 'destructive',
              onPress: () => handleAddEventWithConflicts(event)
            },
            { 
              text: 'Join Without Adding to Calendar', 
              onPress: () => handleJoinEventOnly(event)
            }
          ]
        );
      } else {
        Alert.alert(
          'Join Event',
          `Do you want to:\n\n1. Add "${event.name}" to your calendar\n2. Just join the event (no calendar entry)`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Join Only', 
              onPress: () => handleJoinEventOnly(event)
            },
            { 
              text: 'Add to Calendar & Join', 
              style: 'default',
              onPress: () => handleAddEventToCalendar(event)
            }
          ]
        );
      }
    } catch (error) {
      console.error('Failed to join event:', error);
      Alert.alert('Error', 'Failed to join event, please try again');
    }
  };
  
  const handleJoinEventOnly = async (eventToJoin: any) => {
    try {
      // Just send participation message without adding to calendar
      await sendParticipationMessage(eventToJoin.id, eventToJoin.name, 'joined');
      setHasJoined(true);
      
      // Refresh participation stats
const participationStats = await getEventParticipationStats(event.id, event.name);
      setStats(participationStats);
      
      Alert.alert('Success', `You've joined "${eventToJoin.name}"`);
    } catch (error) {
      console.error('Failed to join event:', error);
      Alert.alert('Error', 'Failed to join event, please try again');
    }
  };
  
  const handleAddEventToCalendar = async (eventToAdd: any) => {
    try {
      // Add to calendar and send participation message
      await saveSingleEvent(eventToAdd, false);
      setHasJoined(true);
    } catch (error) {
      console.error('Failed to add event:', error);
    }
  };
  
  const handleAddEventWithConflicts = async (eventToAdd: any) => {
    try {
      // Add to calendar ignoring conflicts and send participation message
      await saveSingleEvent(eventToAdd, true);
      setHasJoined(true);
    } catch (error) {
      console.error('Failed to add event:', error);
    }
  };
  
  const renderEventParticipationSummary = () => {
    if (loading || !stats) {
      return (
        <View style={[
          styles.eventParticipationSummary,
          isOwn ? styles.ownParticipationSummary : styles.otherParticipationSummary
        ]}>
          <ActivityIndicator size="small" color={isOwn ? '#FFFFFF' : '#007AFF'} />
        </View>
      );
    }
    
    if (stats.totalMembers === 0) return null;
    
    return (
      <TouchableOpacity
        style={[
          styles.eventParticipationSummary,
          isOwn ? styles.ownParticipationSummary : styles.otherParticipationSummary,
          hasJoined && styles.joinedEventSummary
        ]}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.eventParticipationHeader}>
          <View style={styles.eventTitleContainer}>
            <View 
              style={[
                styles.eventColorDot, 
                { backgroundColor: event.color || '#007AFF' }
              ]} 
            />
            <Text style={[
              styles.eventName,
              isOwn ? styles.ownParticipationText : styles.otherParticipationText
            ]}>
              {event.name}
            </Text>
            {hasJoined && (
              <Ionicons 
                name="checkmark-circle" 
                size={14} 
                color={isOwn ? '#FFFFFF' : '#34C759'} 
                style={{ marginLeft: 6 }}
              />
            )}
            <Text style={[
              styles.eventTime,
              isOwn ? styles.ownParticipationText : styles.otherParticipationText
            ]}>
              {event.startTime} - {event.endTime}
            </Text>
          </View>
          
          <View style={styles.participationStatsRow}>
            <View style={styles.participationIconContainer}>
              <Ionicons 
                name="people-outline" 
                size={12} 
                color={isOwn ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.7)'} 
              />
              <Text style={[
                styles.participationCount,
                isOwn ? styles.ownParticipationText : styles.otherParticipationText
              ]}>
                {stats.joinedMembers}/{stats.totalMembers}
              </Text>
            </View>
            
            <View style={styles.participationProgressBar}>
              <View 
                style={[
                  styles.participationProgressFill,
                  { 
                    width: `${stats.percentage}%`,
                    backgroundColor: isOwn ? 'rgba(255, 255, 255, 0.9)' : event.color || '#007AFF'
                  }
                ]} 
              />
            </View>
            
            <Ionicons 
              name={isExpanded ? "chevron-up-outline" : "chevron-down-outline"} 
              size={14} 
              color={isOwn ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.7)'} 
            />
          </View>
        </View>
        
        {isExpanded && renderEventParticipationDetails(event.id)}
      </TouchableOpacity>
    );
  };
  
  const renderEventParticipationDetails = (eventId: string) => {
    if (!stats || !stats.participants) return null;
    
    return (
      <View style={styles.eventParticipationDetails}>
        <View style={styles.participationLists}>
          {/* Joined Members */}
          {stats.joinedMembers > 0 && (
            <View style={styles.participationList}>
              <View style={styles.participationListHeader}>
                <Ionicons name="checkmark-circle-outline" size={12} color="#34C759" />
                <Text style={[
                  styles.participationListTitle,
                  isOwn ? styles.ownParticipationText : styles.otherParticipationText
                ]}>
                  Joined ({stats.joinedMembers})
                </Text>
              </View>
              
              {stats.participants.map((participant: any, index: number) => (
                <View key={participant.userId || index} style={styles.participationMember}>
                  <View style={styles.memberInfo}>
                    <View style={[
                      styles.memberStatusDot,
                      { backgroundColor: '#34C759' }
                    ]} />
                    <Text style={[
                      styles.memberName,
                      isOwn ? styles.ownParticipationText : styles.otherParticipationText
                    ]}>
                      {participant.userName}
                    </Text>
                  </View>
                  {participant.joinedAt && (
                    <Text style={[
                      styles.memberTime,
                      isOwn ? styles.ownMemberTime : undefined
                    ]}>
                      {new Date(participant.joinedAt).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
          
          {/* Pending Members - Show members who haven't joined yet */}
          {stats.pendingMembers > 0 && (
            <View style={styles.participationList}>
              <View style={styles.participationListHeader}>
                <Ionicons name="time-outline" size={12} color="#FF9500" />
                <Text style={[
                  styles.participationListTitle,
                  isOwn ? styles.ownParticipationText : styles.otherParticipationText
                ]}>
                  Not Joined ({stats.pendingMembers})
                </Text>
              </View>
              
              {channelMembers
                ?.filter((member: any) => 
                  !stats.participants.some((p: any) => p.userId === member.id)
                )
                .map((member: any) => (
                  <View key={member.id} style={styles.participationMember}>
                    <View style={styles.memberInfo}>
                      <View style={[
                        styles.memberStatusDot,
                        { backgroundColor: '#FF9500' }
                      ]} />
                      <Text style={[
                        styles.memberName,
                        isOwn ? styles.ownParticipationText : styles.otherParticipationText
                      ]}>
                        {member.name || member.id}
                      </Text>
                    </View>
                    <Ionicons name="person-outline" size={14} color="#8E8E93" />
                  </View>
                ))}
            </View>
          )}
        </View>
        
        {/* Join/Add Button */}
        <TouchableOpacity
          style={[
            styles.addEventButton,
            isOwn ? styles.ownJoinButton : styles.otherJoinButton,
            hasJoined && styles.joinedEventButton
          ]}
          onPress={handleJoinEvent}
          disabled={isSaving || hasJoined}
        >
          {isSaving ? (
            <ActivityIndicator 
              size="small" 
              color={isOwn ? '#007AFF' : '#FFFFFF'} 
            />
          ) : (
            <>
              <Ionicons 
                name={hasJoined ? "checkmark-circle" : "add-circle-outline"} 
                size={14} 
                color={isOwn ? '#007AFF' : '#FFFFFF'} 
              />
              <Text style={[
                styles.addEventButtonText,
                isOwn ? styles.ownJoinButtonText : styles.otherJoinButtonText
              ]}>
                {hasJoined ? 'Joined' : 'Join Event'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };
  
  return renderEventParticipationSummary();
};


// Add this function to handle adding a single event
const handleAddSingleEvent = async (event: any) => {
  try {
    if (!event.isValidTime) {
      Alert.alert('Invalid Time', 'This event has invalid time format');
      return;
    }
    
    // Check for conflicts
    const conflictResult = await checkConflictsFromStorage(
      {
        startTime: event.startTime,
        endTime: event.endTime,
        date: event.dateKey,
      },
      getEventsForDate
    );
    
    if (conflictResult.hasConflict) {
      Alert.alert(
        'Time Conflict',
        `This event conflicts with existing events: ${conflictResult.message.split(':')[0]}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Add Anyway', 
            style: 'destructive',
            onPress: () => saveSingleEvent(event, true)
          }
        ]
      );
    } else {
      Alert.alert(
        'Add Event',
        `Add "${event.name}" to your calendar?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Confirm', 
            onPress: () => saveSingleEvent(event, false)
          }
        ]
      );
    }
  } catch (error) {
    console.error('Failed to add single event:', error);
    Alert.alert('Error', 'Failed to add event, please try again');
  }
};

// Update the saveSingleEvent function to send participation message:
const saveSingleEvent = async (event: any, ignoreConflicts: boolean) => {
  try {
    setIsSaving(true);
    
    // Convert date format
    const [month, day, year] = event.originalDateStr.split('/').map(Number);
    const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const calendarEvent: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> = {
      title: event.name,
      description: event.description || `Added from shared calendar: ${event.name}`,
      date: formattedDate,
      startTime: event.startTime || '09:00',
      endTime: event.endTime || '10:00',
      color: event.color || '#007AFF',
    };
    
    const savedEvent = await saveEvent(calendarEvent);
    
    // Send participation message instead of updating local state
    await sendParticipationMessage(event.id, event.name, 'joined');
    
    Alert.alert('Success', `"${event.name}" added to your calendar`);
    
    // Re-check conflicts
    checkConflictsForSelectedDate();
    
  } catch (error) {
    console.error('Failed to save single event:', error);
    Alert.alert('Error', 'Failed to save event, please try again');
  } finally {
    setIsSaving(false);
  }
};
// Update the getEventParticipationStats function:
const getEventParticipationStats = async (eventId: string, eventName: string) => {
  try {
    // Get participation data from chat messages
    const participation = await checkEventParticipationFromMessages(eventId, eventName);
    
    const totalMembers = channelMembers?.length || 0;
    const joinedMembers = participation.length;
    
    return {
      totalMembers,
      joinedMembers,
      pendingMembers: totalMembers - joinedMembers,
      percentage: totalMembers > 0 ? Math.round((joinedMembers / totalMembers) * 100) : 0,
      participants: participation,
    };
  } catch (error) {
    console.error('Failed to get event participation stats:', error);
    return {
      totalMembers: channelMembers?.length || 0,
      joinedMembers: 0,
      pendingMembers: channelMembers?.length || 0,
      percentage: 0,
      participants: [],
    };
  }
};
// Update the checkEventParticipationFromMessages function:
const checkEventParticipationFromMessages = async (eventId: string, eventName: string): Promise<any[]> => {
  try {
    if (!channel || !messages) {
      return [];
    }
    
    const participation: any[] = [];
    
    // Search through messages for participation messages for this event
    messages.forEach((msg: any) => {
      // Check for participation message pattern: "!username has joined event "Event Name"!"
      const messageText = msg.text || '';
      
      // Pattern 1: Check if message contains the event name and "has joined event"
      if (messageText.includes(`has joined event "${eventName}"`) ||
          messageText.includes(`has joined event ${eventName}`) ||
          messageText.includes(`joined event "${eventName}"`)) {
        
        // Extract username from the message
        // Pattern: "!username has joined..."
        let username = '';
        if (messageText.startsWith('!')) {
          const parts = messageText.split(' ');
          if (parts.length > 0) {
            username = parts[0].substring(1); // Remove the "!" prefix
          }
        }
        
        // Find user ID from channel members
        const user = channelMembers?.find((member: any) => 
          member.name === username || member.id === username
        );
        
        if (user) {
          // Check if we already have this user in the list
          const existing = participation.find(p => p.userId === user.id);
          if (!existing) {
            participation.push({
              userId: user.id,
              userName: user.name || user.id,
              joinedAt: new Date(msg.created_at),
              eventId,
              eventName
            });
          }
        }
      }
      
      // Pattern 2: Also check metadata if available
      if (msg.metadata?.type === 'event_participation' && 
          msg.metadata?.eventId === eventId &&
          msg.metadata?.action === 'joined') {
        
        const existing = participation.find(p => p.userId === msg.metadata.userId);
        if (!existing) {
          participation.push({
            userId: msg.metadata.userId,
            userName: msg.user?.name || msg.metadata.userId,
            joinedAt: new Date(msg.metadata.timestamp || msg.created_at),
            eventId: msg.metadata.eventId,
            eventName: msg.metadata.eventName
          });
        }
      }
    });
    
    return participation;
  } catch (error) {
    console.error('Failed to check participation from messages:', error);
    return [];
  }
};

// Update the checkCurrentUserParticipation function:
const checkCurrentUserParticipation = async (eventId: string, eventName: string): Promise<boolean> => {
  try {
    if (!currentUserId || !messages) return false;
    
    // Check for text pattern participation
    const hasTextParticipation = messages.some((msg: any) => {
      const messageText = msg.text || '';
      
      // Check if this is a participation message for this event
      if (messageText.includes(`has joined event "${eventName}"`) ||
          messageText.includes(`has joined event ${eventName}`) ||
          messageText.includes(`joined event "${eventName}"`)) {
        
        // Extract username
        if (messageText.startsWith('!')) {
          const parts = messageText.split(' ');
          const username = parts[0].substring(1);
          
          // Check if this is the current user
          if (username === currentUserId) {
            return true;
          }
          
          // Also check against user's name
          const currentUser = channelMembers?.find((member: any) => member.id === currentUserId);
          if (currentUser?.name === username) {
            return true;
          }
        }
      }
      
      return false;
    });
    
    // Also check metadata participation
    const hasMetadataParticipation = messages.some((msg: any) => 
      msg.metadata?.type === 'event_participation' &&
      msg.metadata?.eventId === eventId &&
      msg.metadata?.action === 'joined' &&
      (msg.metadata?.userId === currentUserId || msg.user_id === currentUserId)
    );
    
    return hasTextParticipation || hasMetadataParticipation;
  } catch (error) {
    console.error('Failed to check current user participation:', error);
    return false;
  }
};
  
  // Check if events for selected date have conflicts
  const checkConflictsForSelectedDate = async () => {
    try {
      setIsCheckingConflicts(true);
      
      const dateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
      const dayEvents = parsedEvents.filter(e => e.dateKey === dateKey);
      
      if (dayEvents.length === 0) {
        setConflictInfo(null);
        return;
      }
      
      // Use new checkConflictsFromStorage function
      const conflicts: any[] = [];
      let hasAnyConflict = false;
      
      for (const newEvent of dayEvents) {
        // Skip events with invalid time
        if (!newEvent.isValidTime) continue;
        
        const conflictResult = await checkConflictsFromStorage(
          {
            id: newEvent.id,
            startTime: newEvent.startTime,
            endTime: newEvent.endTime,
            date: newEvent.dateKey,
          },
          getEventsForDate
        );
        
        if (conflictResult.hasConflict) {
          hasAnyConflict = true;
          conflicts.push({
            eventName: newEvent.name,
            eventTime: `${newEvent.startTime}-${newEvent.endTime}`,
            conflictInfo: conflictResult,
          });
        }
      }
      
      if (hasAnyConflict) {
        const conflictCount = conflicts.length;
        const conflictMessages = conflicts.map(c => 
          `• ${c.eventName} (${c.eventTime}): ${c.conflictInfo.message.split(':')[0]}`
        ).join('\n');
        
        setConflictInfo({
          hasConflict: true,
          message: `Found ${conflictCount} event conflicts:\n${conflictMessages}`,
          conflictingEvents: conflicts.flatMap(c => c.conflictInfo.conflictingEvents),
        });
      } else {
        setConflictInfo(null);
      }
      
    } catch (error) {
      console.error('Failed to check conflicts:', error);
      setConflictInfo(null);
    } finally {
      setIsCheckingConflicts(false);
    }
  };
  
  // Re-check conflicts when selected date or parsed events change
  useEffect(() => {
    if (parsedEvents.length > 0) {
      checkConflictsForSelectedDate();
    }
  }, [selectedDate, parsedEvents]);
  
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const dayEvents = parsedEvents.filter(e => e.dateKey === dateKey);
    
    if (dayEvents.length > 0) {
      const validEvents = dayEvents.filter(e => e.isValidTime);
      const invalidEvents = dayEvents.filter(e => !e.isValidTime);
      
      let eventList = validEvents.map(e => 
        `• ${e.name} (${e.startTime}-${e.endTime})`
      ).join('\n');
      
      if (invalidEvents.length > 0) {
        eventList += `\n\n⚠️ ${invalidEvents.length} events have invalid time`;
      }
      
      // Get conflict info for this date
      const dateConflictInfo = conflictInfo?.conflictingEvents?.filter(
        ev => ev.date === dateKey
      ).length || 0;
      
      let alertMessage = eventList;
      
      if (dateConflictInfo > 0) {
        alertMessage += `\n\n⚠️ Note: ${dateConflictInfo} events conflict with existing events in your calendar`;
      }
      
      Alert.alert(
        `📅 ${date.getMonth() + 1}/${date.getDate()} Events`,
        alertMessage,
        [
          { text: 'Close', style: 'cancel' },
          { 
            text: 'View Details', 
            onPress: () => showDateEventDetails(date)
          },
          { 
            text: 'Add These Events', 
            onPress: () => handleJoinCalendarForDate(date)
          }
        ]
      );
    } else {
      Alert.alert(
        `📅 ${date.getMonth() + 1}/${date.getDate()}`,
        'No events for this date',
        [{ text: 'OK' }]
      );
    }
  };
  
  // Show detailed information for date events
  const showDateEventDetails = (date: Date) => {
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const dayEvents = parsedEvents.filter(e => e.dateKey === dateKey);
    
    const validEvents = dayEvents.filter(e => e.isValidTime);
    const invalidEvents = dayEvents.filter(e => !e.isValidTime);
    
    let details = `📅 ${date.getMonth() + 1}/${date.getDate()} Event Details\n\n`;
    
    if (validEvents.length > 0) {
      details += '✅ Valid Events:\n';
      validEvents.forEach(event => {
        details += `• ${event.name}\n`;
        details += `  Time: ${event.startTime}-${event.endTime}\n`;
        if (event.description) details += `  Description: ${event.description}\n`;
        details += `  Color: ${event.color}\n\n`;
      });
    }
    
    if (invalidEvents.length > 0) {
      details += '⚠️ Events with Invalid Time:\n';
      invalidEvents.forEach(event => {
        details += `• ${event.name}\n`;
        details += `  Error: ${event.timeValidation?.error || 'Invalid time format'}\n\n`;
      });
    }
    
    Alert.alert(
      'Event Details',
      details,
      [
        { text: 'Close', style: 'cancel' },
        { 
          text: 'Add Valid Events', 
          onPress: () => handleJoinCalendarForDate(date)
        }
      ]
    );
  };
  
  // Handle join calendar button click
  // Modified handleJoinCalendar to show participation info
  const handleJoinCalendar = async () => {
    try {
      const stats = getParticipationStats();
      
      Alert.alert(
        'Join Shared Calendar',
        `${stats.joinedMembers} of ${stats.totalMembers} members have joined this calendar.\n\nAdd these events to your personal calendar?`,
        [
          { 
            text: 'View Participation', 
            style: 'default',
            onPress: () => setShowParticipation(true)
          },
          { 
            text: 'Cancel', 
            style: 'cancel' 
          },
          { 
            text: 'Join Calendar', 
            onPress: async () => {
              // Original join logic
              const dateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
              const dayEvents = parsedEvents.filter(e => e.dateKey === dateKey);
              
              if (dayEvents.length === 0) {
                Alert.alert('Info', 'No events for selected date');
                return;
              }
              
              const validEvents = dayEvents.filter(e => e.isValidTime);
              
              if (validEvents.length === 0) {
                Alert.alert('Info', 'No events with valid time for selected date');
                return;
              }
              
              if (conflictInfo?.hasConflict) {
                Alert.alert(
                  'Time Conflicts Found',
                  `${conflictInfo.message.split('\n')[0]}\n\nHow do you want to proceed?`,
                  [
                    { 
                      text: 'Cancel', 
                      style: 'cancel' 
                    },
                    { 
                      text: 'Add Only Non-conflicting Events', 
                      onPress: () => handleJoinCalendarWithConflictResolution('skip', validEvents)
                    },
                    { 
                      text: 'Add All (Ignore Conflicts)', 
                      style: 'destructive',
                      onPress: () => handleJoinCalendarWithConflictResolution('override', validEvents)
                    }
                  ]
                );
              } else {
                Alert.alert(
                  'Add to Calendar',
                  `Are you sure you want to add ${validEvents.length} events to your calendar?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Confirm', 
                      onPress: () => saveEvents(validEvents)
                    }
                  ]
                );
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Failed to handle join calendar:', error);
      Alert.alert('Error', 'Operation failed, please try again');
    }
  };

  
  // Show smart merge options
  const showSmartMergeOptions = (dateKey: string) => {
    Alert.alert(
      'Smart Merge Options',
      'Choose merge strategy:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Adjust Time to Avoid Conflicts', 
          onPress: () => handleSmartMergeAdjustTime(dateKey)
        },
        { 
          text: 'Merge Overlapping Events', 
          onPress: () => handleSmartMergeCombineEvents(dateKey)
        }
      ]
    );
  };
  
  // Smart merge: adjust time
  const handleSmartMergeAdjustTime = async (dateKey: string) => {
    try {
      const dayEvents = parsedEvents.filter(e => e.dateKey === dateKey);
      const validEvents = dayEvents.filter(e => e.isValidTime);
      
      // Get existing events
      const existingEvents = await getEventsForDate(dateKey);
      
      // Implement automatic time adjustment logic here
      // e.g., find available time slots, reschedule event times
      
      Alert.alert(
        'Feature in Development',
        'Automatic time adjustment feature is under development',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Smart time adjustment failed:', error);
    }
  };
  
  // Smart merge: merge overlapping events
  const handleSmartMergeCombineEvents = async (dateKey: string) => {
    try {
      const dayEvents = parsedEvents.filter(e => e.dateKey === dateKey);
      const validEvents = dayEvents.filter(e => e.isValidTime);
      
      // Implement event merging logic here
      // e.g., merge conflicting events into one event
      
      Alert.alert(
        'Feature in Development',
        'Event merging feature is under development',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Smart merge failed:', error);
    }
  };
  
  // Add this helper function to the CalendarMessage component
  const handleJoinCalendarForDate = async (date: Date) => {
    try {
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const dayEvents = parsedEvents.filter(e => e.dateKey === dateKey);
      
      if (dayEvents.length === 0) {
        Alert.alert('Info', 'No events for this date');
        return;
      }
      
      // Filter valid events
      const validEvents = dayEvents.filter(e => e.isValidTime);
      
      if (validEvents.length === 0) {
        Alert.alert('Info', 'No events with valid time for this date');
        return;
      }
      
      // Check conflicts for this date
      const conflictsForDate: {
        event: any;
        conflictResult: { hasConflict: boolean; message: string; conflictingEvents: EventWithTime[] };
      }[] = [];
      
      for (const event of validEvents) {
        const conflictResult = await checkConflictsFromStorage(
          {
            startTime: event.startTime,
            endTime: event.endTime,
            date: event.dateKey,
          },
          getEventsForDate
        );
        
        if (conflictResult.hasConflict) {
          conflictsForDate.push({
            event,
            conflictResult,
          });
        }
      }
      
      if (conflictsForDate.length > 0) {
        Alert.alert(
          'Time Conflicts Found',
          `Selected date has ${conflictsForDate.length} events conflicting with existing events in your calendar`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Add Only Non-conflicting Events', 
              onPress: () => {
                const nonConflictingEvents = validEvents.filter(event => 
                  !conflictsForDate.some(c => c.event.id === event.id)
                );
                saveEvents(nonConflictingEvents, false);
              }
            },
            { 
              text: 'Add All', 
              style: 'destructive',
              onPress: () => saveEvents(validEvents, true)
            }
          ]
        );
      } else {
        Alert.alert(
          'Add Events',
          `Are you sure you want to add ${validEvents.length} events?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Confirm', 
              onPress: () => saveEvents(validEvents, false)
            }
          ]
        );
      }
      
    } catch (error) {
      console.error('Failed to handle join calendar:', error);
      Alert.alert('Error', 'Operation failed, please try again');
    }
  };
  
  // Handle event addition with conflict resolution
  const handleJoinCalendarWithConflictResolution = async (
    resolution: 'skip' | 'override', 
    eventsToProcess: any[]
  ) => {
    try {
      setIsSaving(true);
      
      if (resolution === 'skip') {
        // Skip conflicting events
        const nonConflictingEvents = [];
        
        for (const event of eventsToProcess) {
          const conflictResult = await checkConflictsFromStorage(
            {
              startTime: event.startTime,
              endTime: event.endTime,
              date: event.dateKey,
            },
            getEventsForDate
          );
          
          if (!conflictResult.hasConflict) {
            nonConflictingEvents.push(event);
          }
        }
        
        if (nonConflictingEvents.length === 0) {
          Alert.alert('Info', 'All events have conflicts, no events to add');
          return;
        }
        
        await saveEvents(nonConflictingEvents, false);
      } else {
        // Override mode: save all events directly
        await saveEvents(eventsToProcess, true);
      }
      
    } catch (error) {
      console.error('Failed to handle conflict resolution:', error);
      Alert.alert('Error', 'Operation failed, please try again');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Core function to save events
  // Modified saveEvents function to track participation
  const saveEvents = async (eventsToSave: any[], ignoreConflicts = false) => {
    try {
      setIsSaving(true);
      
      const savedEvents: CalendarEvent[] = [];
      const failedEvents: any[] = [];
      
      for (const event of eventsToSave) {
        try {
          // If not ignoring conflicts, check each event
          if (!ignoreConflicts) {
            const conflictResult = await checkConflictsFromStorage(
              {
                startTime: event.startTime,
                endTime: event.endTime,
                date: event.dateKey,
              },
              getEventsForDate
            );
            
            if (conflictResult.hasConflict) {
              failedEvents.push({
                event,
                reason: 'Time conflict',
                conflictDetails: conflictResult.message,
              });
              continue;
            }
          }
          
          const [month, day, year] = event.originalDateStr.split('/').map(Number);
          const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          
          const calendarEvent: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> = {
            title: event.name,
            description: event.description || `Added from shared calendar: ${event.name}`,
            date: formattedDate,
            startTime: event.startTime || '09:00',
            endTime: event.endTime || '10:00',
            color: event.color || '#007AFF',
          };
          
          const savedEvent = await saveEvent(calendarEvent);
          savedEvents.push(savedEvent);
          
        } catch (error) {
          console.error('Failed to save single event:', error);
          failedEvents.push({
            event,
            reason: 'Save failed',
          });
        }
      }
      
      // Update participation when events are saved
      if (savedEvents.length > 0 && currentUserId) {
        updateMemberParticipation(currentUserId, savedEvents.length);
      }
      
      // Show result
      if (savedEvents.length > 0) {
        let message = `✅ Successfully added ${savedEvents.length} events to your calendar`;
        
        if (failedEvents.length > 0) {
          message += `\n\n⚠️ ${failedEvents.length} events failed:`;
          failedEvents.forEach((failed, index) => {
            message += `\n${index + 1}. ${failed.event.name}: ${failed.reason}`;
            if (failed.conflictDetails) {
              message += ` (${failed.conflictDetails.split(':')[0]})`;
            }
          });
        }
        
        Alert.alert('Complete', message, [{ text: 'OK' }]);
        
        // Re-check conflicts
        checkConflictsForSelectedDate();
      } else {
        Alert.alert('Info', 'No events were successfully added');
      }
      
    } catch (error) {
      console.error('Failed to save events:', error);
      Alert.alert('Error', 'Failed to save events, please try again');
    } finally {
      setIsSaving(false);
    }
  };
  
  const renderAddAllButton = () => {
    if (parsedEvents.length === 0) return null;
    
    const validEventsCount = parsedEvents.filter(e => e.isValidTime).length;
    const invalidEventsCount = parsedEvents.filter(e => !e.isValidTime).length;
    

  };
  
  // Check if selected date has events
  const hasEventsForSelectedDate = () => {
    const dateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    return parsedEvents.some(e => e.dateKey === dateKey);
  };
  
  // Render conflict warning
  const renderConflictWarning = () => {
    if (!conflictInfo?.hasConflict) return null;
    
    const conflictCount = conflictInfo.conflictingEvents.length;
    
    return (
      <View style={[
      styles.conflictWarningContainer,
      isOwn ? styles.ownConflictWarning : styles.otherConflictWarning
    ]}>
      <View style={styles.conflictHeader}>
        <Ionicons 
          name={isCheckingConflicts ? "time-outline" : "warning-outline"} 
          size={16} 
          color="#FF9500" 
        />
        <Text style={[
          styles.conflictHeaderText,
          isOwn ? styles.ownConflictText : styles.otherConflictText
        ]}>
          {isCheckingConflicts ? 'Checking conflicts...' : `Found ${conflictCount} time conflicts`}
        </Text>
      </View>
      
      {!isCheckingConflicts && (
        <Text style={[
          styles.conflictMessage,
          isOwn ? styles.ownConflictText : styles.otherConflictText
        ]}>
          {conflictInfo.message.split('\n')[0]}
        </Text>
      )}
      
      {/* REMOVE or comment out this section since overlapDetails doesn't exist */}
      {/* 
      {!isCheckingConflicts && conflictInfo.overlapDetails && (
        <Text style={styles.conflictDetails}>
          {conflictInfo.overlapDetails.join(', ')}
        </Text>
      )}
      */}
    </View>
    );
  };
  
// In the CalendarMessage component's return statement, add this after the conflict warning:
return (
  <View style={[
    styles.calendarContainer,
    isOwn ? styles.ownCalendarContainer : styles.otherCalendarContainer
  ]}>
    {/* Calendar header */}
    <View style={styles.calendarHeader}>
      <View style={styles.calendarTitleContainer}>
        <Text style={[
          styles.calendarTitle,
          isOwn ? styles.ownCalendarText : styles.otherCalendarText
        ]}>
          📅 Shared Calendar
        </Text>
        {parsedEvents.length > 0 && (
          <Text style={styles.eventCount}>
            {parsedEvents.length} events
          </Text>
        )}
      </View>
    </View>
    
    {/* Event-specific participation for each event */}
    {parsedEvents.map((event, index) => (
      <EventParticipationItem 
        key={event.id || index}
        event={event}
        isOwn={isOwn}
      />
    ))}
    
    {/* Add All Events Button */}
    {renderAddAllButton()}
    
    {/* Calendar component */}
    <ReusableCalendar
      selectedDate={selectedDate}
      onDateSelect={handleDateSelect}
      eventsByDate={eventsByDate}
      theme={{
        primaryColor: isOwn ? '#FFFFFF' : '#007AFF',
        selectedColor: isOwn ? '#FFFFFF' : '#007AFF',
        todayColor: isOwn ? '#FFFFFF' : '#34C759',
      }}
      compact={true}
    />
    
    {/* Rest of your existing JSX... */}
  </View>
);
};

const MessageBubble = ({ 
  message, 
  isOwn, 
  onLongPress,
  channelMembers,
  currentUserId ,
  channel,  // Add this
  messages  // Add this
}: { 
  message: any, 
  isOwn: boolean,
  onLongPress?: (message: any) => void,
  channelMembers: any[],
  currentUserId: string | null,
  channel: any,  // Add this
  messages: any[] // Add this
}) => {
  const [isPressed, setIsPressed] = useState(false);
  
  // Check if it's a calendar message
  const isCalendarMessage = message.text && message.text.startsWith(':/calendar');
  
  // If it's a calendar message, extract event string
  const calendarEventsString = isCalendarMessage ? message.text : '';
  const time = new Date(message.created_at).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  // If it's a calendar message, render calendar
if (isCalendarMessage) {
    return (
      <TouchableOpacity
        style={[
          styles.messageBubbleContainer,
          isOwn ? styles.ownMessageContainer : styles.otherMessageContainer,
          isPressed && styles.messagePressed
        ]}
        onLongPress={() => {
          if (onLongPress && isOwn) {
            setIsPressed(true);
            onLongPress(message);
            setTimeout(() => setIsPressed(false), 300);
          }
        }}
        onPressOut={() => setIsPressed(false)}
        delayLongPress={500}
        activeOpacity={0.7}
        disabled={!isOwn}
      >
        <CalendarMessage 
          eventsString={calendarEventsString}
          isOwn={isOwn}
          message={message}
          channelMembers={channelMembers}
          currentUserId={currentUserId}
        channel={channel}  // Pass the channel prop
        messages={messages} // Pass the messages prop
        />
        <Text style={styles.messageTime}>{time}</Text>
      </TouchableOpacity>
    );
  }
  
  // Check for attachments
  const hasAttachments = message.attachments && message.attachments.length > 0;
  const firstAttachment = hasAttachments ? message.attachments[0] : null;

  // Get attachment URL - check multiple possible properties
  const getAttachmentUrl = () => {
    if (!firstAttachment) return null;
    
    return firstAttachment.image_url || 
           firstAttachment.asset_url || 
           firstAttachment.thumb_url ||
           firstAttachment.upload?.uri; // Also check upload property
  };

  const attachmentUrl = getAttachmentUrl();
  
  // Determine attachment type
  const getAttachmentType = () => {
    if (!firstAttachment) return null;
    
    if (firstAttachment.type === 'image' || 
        firstAttachment.image_url ||
        firstAttachment.mime_type?.startsWith('image/') ||
        firstAttachment.upload?.mimeType?.startsWith('image/')) {
      return 'image';
    } else if (firstAttachment.type === 'video' || 
               firstAttachment.mime_type?.startsWith('video/') ||
               firstAttachment.upload?.mimeType?.startsWith('video/')) {
      return 'video';
    } else {
      return 'file';
    }
  };
  
  const attachmentType = getAttachmentType();

  // Long press handler
  const handleLongPress = () => {
    if (onLongPress && isOwn) {
      setIsPressed(true);
      onLongPress(message);
      // Restore visual state after 300ms
      setTimeout(() => setIsPressed(false), 300);
    }
  };

  return (
    <TouchableOpacity // ✅ Changed View to TouchableOpacity
      style={[
        styles.messageBubbleContainer,
        isOwn ? styles.ownMessageContainer : styles.otherMessageContainer,
        isPressed && styles.messagePressed // Visual feedback when long pressed
      ]}
      onLongPress={handleLongPress}
      onPressOut={() => setIsPressed(false)} // Restore when released
      delayLongPress={500} // 500ms long press trigger
      activeOpacity={0.7}
      disabled={!isOwn} // Only own messages can be long pressed
    >
      {!isOwn && message.user && (
        <Text style={styles.senderName}>{message.user.name || message.user.id}</Text>
      )}
      
      <View style={[
        styles.messageBubble,
        isOwn ? styles.ownMessage : styles.otherMessage,
        hasAttachments && styles.attachmentBubble
      ]}>
        {/* Text Content */}
        {message.text && (
          <Text style={[
            styles.messageText,
            isOwn ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {message.text}
          </Text>
        )}
        
        {/* Image Attachment Preview */}
        {hasAttachments && attachmentType === 'image' && (
          <TouchableOpacity 
            style={styles.mediaPreviewContainer}
            onPress={() => {
              if (attachmentUrl) {
                Alert.alert(
                  'View Image',
                  'Loaded from Stream CDN',
                  [{ text: 'OK' }]
                );
              }
            }}
          >
            {attachmentUrl ? (
              <Image 
                source={{ uri: attachmentUrl }} 
                style={styles.mediaPreviewImage}
                resizeMode="cover"
                onError={(e) => console.log('CDN image failed to load')}
              />
            ) : (
              <View style={[styles.mediaPreviewImage, { 
                backgroundColor: '#F0F0F0', 
                justifyContent: 'center', 
                alignItems: 'center' 
              }]}>
                <Ionicons name="image-outline" size={32} color="#999" />
                <Text style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                  Loading image...
                </Text>
              </View>
            )}
            
            {firstAttachment?.title && (
              <Text style={styles.mediaCaption}>{firstAttachment.title}</Text>
            )}
          </TouchableOpacity>
        )}
        
        {/* Other attachment types... (keep existing video and file code) */}
      </View>
      
      <Text style={styles.messageTime}>{time}</Text>
    </TouchableOpacity> // ✅ End TouchableOpacity
  );
};

// Updated CustomHeader Component for Multiple Members
function CustomHeader({ channel }: { channel: any }) {
  const { getCurrentUser } = useAuth();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [members, setMembers] = useState<{
    id: string;
    name: string;
    image: string | null;
    isOnline: boolean;
  }[]>([]);
  const [isAddMembersModalVisible, setIsAddMembersModalVisible] = useState(false);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const userData = await getCurrentUser();
      if (userData?.id) {
        setCurrentUserId(userData.id);
      } else {
        const streamClient = StreamClient.getInstance();
        if (streamClient.userID) {
          setCurrentUserId(streamClient.userID);
        }
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  // Load and update channel members
  useEffect(() => {
    if (currentUserId && channel) {
      updateMembersList();
      
      // Listen for member changes
      const handleMemberUpdates = (event: any) => {
        console.log('Member update event:', event);
        updateMembersList();
      };
      
      channel.on('member.added', handleMemberUpdates);
      channel.on('member.removed', handleMemberUpdates);
      channel.on('member.updated', handleMemberUpdates);
      channel.on('user.updated', handleMemberUpdates);
      
      return () => {
        channel.off('member.added', handleMemberUpdates);
        channel.off('member.removed', handleMemberUpdates);
        channel.off('member.updated', handleMemberUpdates);
        channel.off('user.updated', handleMemberUpdates);
      };
    }
  }, [channel, currentUserId]);

  const updateMembersList = () => {
    if (!channel?.state?.members || !currentUserId) return;
    
    const allMembers = Object.values(channel.state.members);
    const otherMembers = allMembers.filter((member: any) => 
      member.user_id !== currentUserId
    );
    
    const memberDetails = otherMembers.map((member: any) => ({
      id: member.user_id,
      name: member.user?.name || member.user_id,
      image: member.user?.image || null,
      isOnline: member.user?.online || false,
    }));
    
    console.log('Updated member list:', memberDetails);
    setMembers(memberDetails);
  };

  // Handle adding members
  const handleAddMembers = async (userIds: string[]) => {
    try {
      if (!channel) {
        Alert.alert('Error', 'Channel not available');
        return;
      }

      await channel.addMembers(userIds, {
        text: `${currentUserId} added ${userIds.length} member(s) to the chat`,
      });

      Alert.alert('Success', 'Members added successfully');
      setIsAddMembersModalVisible(false);
    } catch (error: any) {
      console.error('Failed to add members:', error);
      Alert.alert('Error', `Failed to add members: ${error.message || 'Unknown error'}`);
    }
  };

  // Format member names for display
  const getMemberDisplayText = () => {
    if (members.length === 0) return 'Loading...';
    if (members.length === 1) return members[0].name;
    
    // For 2-3 members, show all names
    if (members.length <= 3) {
      return members.map(m => m.name).join(', ');
    }
    
    // For 4+ members, show first 2 names + count
    const firstTwo = members.slice(0, 2).map(m => m.name).join(', ');
    return `${firstTwo} + ${members.length - 2} more`;
  };

  // Calculate online status
  const getOnlineStatus = () => {
    if (members.length === 0) return 'Offline';
    
    const onlineCount = members.filter(m => m.isOnline).length;
    
    if (members.length === 1) {
      return members[0].isOnline ? 'Online' : 'Offline';
    }
    
    return `${onlineCount} of ${members.length} online`;
  };

  // Get online status color
  const getOnlineStatusColor = () => {
    if (members.length === 0) return '#8E8E93';
    
    const onlineCount = members.filter(m => m.isOnline).length;
    
    if (members.length === 1) {
      return members[0].isOnline ? '#4CD964' : '#8E8E93';
    }
    
    return onlineCount > 0 ? '#4CD964' : '#8E8E93';
  };

  // Handle viewing member list
  const handleViewMembers = () => {
    if (members.length === 0) return;
    
    const memberList = members.map((member, index) => 
      `${index + 1}. ${member.name} ${member.isOnline ? '🟢' : '⚫'}`
    ).join('\n');
    
    Alert.alert(
      'Chat Members',
      `Total: ${members.length} member(s)\n\n${memberList}`,
      [
        { text: 'Close', style: 'cancel' },
        { 
          text: 'Add More Members', 
          onPress: () => setIsAddMembersModalVisible(true)
        }
      ]
    );
  };

  return (
    <>
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        
        {/* Clickable member info area */}
        <TouchableOpacity 
          style={styles.memberInfoContainer}
          onPress={handleViewMembers}
          activeOpacity={0.7}
        >
          <View style={styles.memberAvatarsContainer}>
            {members.length === 0 ? (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>...</Text>
              </View>
            ) : members.length === 1 ? (
              members[0].image ? (
                <Image source={{ uri: members[0].image }} style={styles.singleAvatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>
                    {members[0].name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )
            ) : (
              // Multiple avatars stacked
              <View style={styles.multipleAvatarsContainer}>
                {members.slice(0, 3).map((member, index) => (
                  <View 
                    key={member.id} 
                    style={[
                      styles.stackedAvatar,
                      { 
                        left: index * 10,
                        zIndex: 10 - index
                      }
                    ]}
                  >
                    {member.image ? (
                      <Image source={{ uri: member.image }} style={styles.stackedAvatarImage} />
                    ) : (
                      <View style={styles.stackedAvatarPlaceholder}>
                        <Text style={styles.stackedAvatarInitial}>
                          {member.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
                {members.length > 3 && (
                  <View style={[styles.stackedAvatar, styles.extraCountAvatar, {
                    left: 30
                  }]}>
                    <Text style={styles.extraCountText}>+{members.length - 3}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
          
          <View style={styles.memberTextInfo}>
            <Text style={styles.memberName} numberOfLines={1}>
              {getMemberDisplayText()}
            </Text>
            <View style={styles.statusContainer}>
              <View style={[
                styles.statusDot, 
                { backgroundColor: getOnlineStatusColor() }
              ]} />
              <Text style={styles.statusText}>
                {getOnlineStatus()}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        
        {/* Add Members Button */}
        <TouchableOpacity 
          style={styles.addMembersButton}
          onPress={() => setIsAddMembersModalVisible(true)}
        >
          <Ionicons name="person-add-outline" size={20} color="#FFF" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-vertical" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Add Members Modal */}
      <AddMembersModal
        visible={isAddMembersModalVisible}
        onClose={() => setIsAddMembersModalVisible(false)}
        onAddMembers={handleAddMembers}
        currentUserId={currentUserId}
        existingMembers={channel?.state?.members ? Object.keys(channel.state.members) : []}
      />
    </>
  );
}

// Add Members Modal Component
function AddMembersModal({
  visible,
  onClose,
  onAddMembers,
  currentUserId,
  existingMembers
}: {
  visible: boolean;
  onClose: () => void;
  onAddMembers: (userIds: string[]) => Promise<void>;
  currentUserId: string | null;
  existingMembers: string[];
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  // Fetch available users (you'll need to implement this)
// Update the fetchAvailableUsers function in AddMembersModal component
const fetchAvailableUsers = async (query: string) => {
  setLoading(true);
  try {
    const client = StreamClient.getInstance();
    
    // Create filter conditions
    const filterConditions: any = {};
    
    // Add name search if query exists
    if (query.trim()) {
      filterConditions.name = { $autocomplete: query };
    }
    
    // Exclude existing members and current user
    const excludedIds = [...existingMembers];
    if (currentUserId) {
      excludedIds.push(currentUserId);
    }
    
    if (excludedIds.length > 0) {
      filterConditions.id = { $nin: excludedIds };
    }
    
    // Query users from Stream
    const response = await client.queryUsers(filterConditions);
    
    setAvailableUsers(response.users || []);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    Alert.alert('Error', 'Failed to fetch users');
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    if (visible && searchQuery.length >= 2) {
      const debounceTimer = setTimeout(() => {
        fetchAvailableUsers(searchQuery);
      }, 300);

      return () => clearTimeout(debounceTimer);
    } else {
      setAvailableUsers([]);
    }
  }, [searchQuery, visible]);

  const handleUserSelect = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const handleAdd = async () => {
    if (selectedUserIds.length === 0) {
      Alert.alert('Please select at least one user');
      return;
    }

    setAdding(true);
    try {
      await onAddMembers(selectedUserIds);
      setSelectedUserIds([]);
      setSearchQuery('');
    } catch (error) {
      // Error is handled in parent component
    } finally {
      setAdding(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Members</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search users..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#007AFF" style={styles.loadingIndicator} />
          ) : (
            <FlatList
              data={availableUsers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.userItem,
                    selectedUserIds.includes(item.id) && styles.userItemSelected
                  ]}
                  onPress={() => handleUserSelect(item.id)}
                >
                  <View style={styles.userInfo}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.userAvatar} />
                    ) : (
                      <View style={styles.userAvatarPlaceholder}>
                        <Text style={styles.userAvatarInitial}>
                          {item.name?.charAt(0).toUpperCase() || item.id.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.userDetails}>
                      <Text style={styles.userName}>{item.name || item.id}</Text>
                      <Text style={styles.userId}>{item.id}</Text>
                    </View>
                  </View>
                  {selectedUserIds.includes(item.id) && (
                    <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Text style={styles.emptyListText}>
                    {searchQuery.length < 2 
                      ? 'Type at least 2 characters to search' 
                      : 'No users found'}
                  </Text>
                </View>
              }
            />
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[
                styles.addButton,
                (selectedUserIds.length === 0 || adding) && styles.addButtonDisabled
              ]}
              onPress={handleAdd}
              disabled={selectedUserIds.length === 0 || adding}
            >
              {adding ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="person-add" size={20} color="#FFF" />
                  <Text style={styles.addButtonText}>
                    Add {selectedUserIds.length} Member{selectedUserIds.length !== 1 ? 's' : ''}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
// Custom Message Input Component
function CustomMessageInput({ 
  channel, 
  onSend,
  currentUserId // Add this parameter
}: { 
  channel: any, 
  onSend: () => void 
  currentUserId: string | null // Add type definition
}) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const textInputRef = useRef<RNTextInput>(null);

  const handleCalendarEventsGenerated = (calendarMessage: string) => {
    setText(calendarMessage);
  };

  // ✅ CORRECT
  const handleMediaSelected = async (media: {
    uri: string;
    type: 'image' | 'video' | 'file';
    name?: string;
    mimeType?: string;
  }) => {
    try {
      setUploading(true);
      const attachment = {
        uri: media.uri,  // ✅ Store as 'uri'
        type: media.type,
        name: media.name || `file_${Date.now()}`,
        mimeType: media.mimeType || 'application/octet-stream',
      };
      console.log('✅ Received attachment:', attachment);
      setAttachments([...attachments, attachment]);
    } catch (error) {
      console.error('Media processing failed:', error);
      Alert.alert('Error', 'Failed to process media file');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    const newAttachments = [...attachments];
    newAttachments.splice(index, 1);
    setAttachments(newAttachments);
  };
  
  // In CustomMessageInput component
  // Inside CustomMessageInput component, modify handleSend function
  const handleSend = async () => {
    if (!text.trim() && attachments.length === 0) return;

    try {
      setUploading(true);
      
      // ========== Add debug code start ==========
      console.log('=== 🚀 Starting message sending process ===');
      console.log('Current user ID:', currentUserId); // Now accessible
      console.log('Attachment count:', attachments.length);
      
      // Debug authentication status
      const token = StreamClient.getToken();
      const apiKey = StreamClient.getApiKey();
      console.log('🔍 Authentication status check:');
      console.log('- Has token:', !!token);
      if (token) {
        console.log('- Token preview:', token.substring(0, 30) + '...');
      }
      console.log('- Has API key:', !!apiKey);
      
      // Check Stream client connection status
      const client = StreamClient.getInstance();
      console.log('- Stream user ID:', client.userID);
      console.log('- Is connected:', !!client.userID);
      // ========== Add debug code end ==========

      console.log('📤 Preparing to send message, attachment count:', attachments.length);

      // 1. Upload all attachments to CDN and get remote URLs
      const uploadedAttachments = [];
      for (const [index, attachment] of attachments.entries()) {
        console.log(`\n=== Uploading attachment ${index + 1}/${attachments.length} ===`);
        console.log('Attachment details:', {
          name: attachment.name,
          type: attachment.type,
          mimeType: attachment.mimeType,
          uriPreview: attachment.uri.substring(0, 80) + '...',
        });
        
        try {
          // Call upload service, passing local URI, filename and MIME type
          console.log('Starting upload to Stream CDN...');
          const uploadResult = await uploadToStreamCDN(
            attachment.uri,
            attachment.name,
            attachment.mimeType,
            channel // ✅ Add 4th parameter: channel object
          );
          console.log('✅ Attachment upload successful:');
          console.log('- CDN URL:', uploadResult.url);
          if (uploadResult.thumbnailUrl) {
            console.log('- Thumbnail URL:', uploadResult.thumbnailUrl);
          }

          // Build Stream-required attachment format
          const streamAttachment: any = {
            type: attachment.type || 'file',
            title: attachment.name || `attachment_${Date.now()}`,
            mime_type: attachment.mimeType || 'application/octet-stream',
          };

          // Set correct URL field based on file type
          if (attachment.type === 'image') {
            streamAttachment.image_url = uploadResult.url; // Use CDN URL
            if (uploadResult.thumbnailUrl) {
              streamAttachment.thumb_url = uploadResult.thumbnailUrl;
            }
          } else {
            streamAttachment.asset_url = uploadResult.url; // Use CDN URL
          }
          
          uploadedAttachments.push(streamAttachment);
        } catch (uploadError: any) {
          console.error('❌ Attachment upload failure details:', {
            message: uploadError.message,
            stack: uploadError.stack,
            response: uploadError.response?.data,
          });
          
          Alert.alert(
            'Upload Failed', 
            `File "${attachment.name}" upload failed\n\nError: ${uploadError.message}\n\nPlease ensure:\n1. User is logged in\n2. Network connection is normal\n3. Stream API configuration is correct`
          );
          return;
        }
      }

      // 2. Build final message to send
      const message: any = {
        text: text.trim(),
      };

      if (uploadedAttachments.length > 0) {
        message.attachments = uploadedAttachments;
      }

      console.log('📦 Final message body to send:', JSON.stringify(message, null, 2));

      // 3. Send message via Stream Channel
      if (channel) {
        console.log('📨 Sending message via Channel...');
        await channel.sendMessage(message);
        console.log('✅ Message sent successfully with CDN attachments');
        
        // 4. Clear input and attachments
        setText('');
        setAttachments([]);
        onSend(); // Trigger parent component to refresh message list
        textInputRef.current?.focus();
      }
    } catch (error: any) {
      console.error('❌ Message sending failure details:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data,
      });
      
      // Provide more detailed error information
      let errorMessage = error.message || 'Error occurred while sending message';
      if (error.message?.includes('Network')) {
        errorMessage = 'Network connection failed, please check network and retry';
      } else if (error.message?.includes('token') || error.message?.includes('auth')) {
        errorMessage = 'Authentication failed, please log in again';
      }
      
      Alert.alert('Send Failed', errorMessage);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <View style={styles.messageInputContainer}>
      {attachments.length > 0 && (
        <View style={styles.attachmentsPreview}>
          {attachments.map((attachment, index) => (
            <View key={index} style={styles.attachmentPreview}>
              {attachment.type === 'image' ? (
                <Image 
                  source={{ uri: attachment.uri }}  // ✅ Change from asset_url to uri
                  style={styles.previewImage} 
                />
              ) : (
                <View style={styles.filePreview}>
                  <Ionicons name="document" size={24} color="#007AFF" />
                  <Text style={styles.fileName}>{attachment.name}</Text>  
                </View>
              )}
              
              <TouchableOpacity 
                style={styles.removeAttachmentButton}
                onPress={() => removeAttachment(index)}
              >
                <Ionicons name="close-circle" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={styles.inputRow}>
        <MediaAttachmentButton 
          onMediaSelected={handleMediaSelected}
          disabled={uploading}
          channel={channel}
          onCalendarEventsGenerated={handleCalendarEventsGenerated}
        />
            
        <View style={styles.textInputContainer}>
          <RNTextInput
            ref={textInputRef}
            style={styles.textInput}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            multiline
            maxLength={1000}
            onSubmitEditing={handleSend}
            placeholderTextColor="#999"
          />
        </View>
        
        <TouchableOpacity 
          style={[
            styles.sendButton, 
            (!text.trim() && attachments.length === 0) && styles.sendButtonDisabled
          ]}
          onPress={handleSend}
          disabled={!text.trim() && attachments.length === 0}
        >
          <Ionicons 
            name="send" 
            size={20} 
            color={(!text.trim() && attachments.length === 0) ? "#999" : "#007AFF"} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Main Chat Screen - Fixed version
export default function ChatScreen() {
  const { cid } = useLocalSearchParams<{ cid: string }>();
  const [channel, setChannel] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const { getCurrentUser } = useAuth();
  

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log('🔄 Starting to load user...');
        const userData = await getCurrentUser();
        console.log('✅ User data loaded:', userData);
        
        if (userData?.id) {
          setCurrentUserId(userData.id);
          console.log('✅ Set currentUserId:', userData.id);
        } else {
          const streamClient = StreamClient.getInstance();
          if (streamClient.userID) {
            setCurrentUserId(streamClient.userID);
            console.log('✅ Got user ID from StreamClient:', streamClient.userID);
          } else {
            console.log('⚠️ No user ID found');
            setError('User not logged in, please log in again');
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('❌ Failed to load user:', error);
        setError('Failed to load user information');
        setLoading(false);
      }
    };
    loadUser();
  }, []);


// In [cid].tsx, update the useEffect for loading channel
useEffect(() => {
  console.log('🔄 useEffect triggered:', { cid, currentUserId, loading });
  
  if (!cid) {
    console.log('⚠️ Missing cid');
    setError('Missing channel ID');
    setLoading(false);
    return;
  }
  
  if (!currentUserId) {
    console.log('⏳ Waiting for user ID to load...');
    return;
  }
  
  const loadChannelAndMessages = async () => {
    console.log('🚀 Starting to load channel and messages...');
    
    try {
      setLoading(true);
      setError(null);
      
      const client = StreamClient.getInstance();
      console.log('🔍 Stream client status:', {
        userID: client.userID,
        connected: !!client.userID,
        token: StreamClient.getToken()?.substring(0, 20) + '...'
      });
      
      if (!client.userID) {
        console.error('❌ Stream client not connected');
        setError('Chat service not connected, please log in again');
        setLoading(false);
        return;
      }
      
      // ✅ FIXED: Parse the CID to get the actual channel ID
      // CID comes as: "messaging:chat_maria42_leo31" or "messaging:chat_leo31_abc123"
      console.log('📥 Raw CID from URL:', cid);
      
      let actualChannelId = cid;
      
      // Remove "messaging:" prefix if present
      if (cid.includes(':')) {
        const parts = cid.split(':');
        actualChannelId = parts[1] || parts[0];
        console.log('🔧 Extracted channel ID:', actualChannelId);
      }
      
      // Now we have: "chat_maria42_leo31" or "chat_leo31_abc123"
      console.log('🎯 Actual channel ID to load:', actualChannelId);
      
      // ✅ FIXED: Get the correct opponent ID from channel ID
      // Channel ID format: "chat_user1_user2"
      const channelIdParts = actualChannelId.split('_');
      if (channelIdParts.length >= 3 && channelIdParts[0] === 'chat') {
        const user1 = channelIdParts[1];
        const user2 = channelIdParts[2];
        console.log('👥 Users in channel ID:', { user1, user2 });
      }
      
      // Try to get existing channel
      const channelInstance = client.channel('messaging', actualChannelId);
      
      console.log('👀 Trying to watch channel:', actualChannelId);
      await channelInstance.watch();
      console.log('✅ Channel watch successful');
      
      // ✅ FIXED: Verify channel members
      const members = channelInstance.state.members || {};
      const memberIds = Object.keys(members);
      console.log('👥 Actual channel members:', memberIds.map(id => ({
        id,
        name: members[id]?.user?.name || 'Unknown',
        isOnline: members[id]?.user?.online || false
      })));
      
      // Check if current user is in this channel
      if (!memberIds.includes(currentUserId)) {
        console.error('❌ Current user is not a member of this channel');
        console.log('Current user ID:', currentUserId);
        console.log('Channel member IDs:', memberIds);
        setError('You are not a member of this chat');
        setLoading(false);
        return;
      }
      
      // ✅ FIXED: Set channel state
      setChannel(channelInstance);
      console.log('✅ Channel state set');
      
      // Load messages
      await loadMessages(channelInstance);
      
      // Set up message listener
      const handleNewMessage = (event: any) => {
        console.log('📩 New message event:', event.message?.text?.substring(0, 50));
        if (event.message && event.message.type === 'regular') {
          setMessages(prev => {
            if (!prev.some(m => m.id === event.message.id)) {
              const newMessages = [...prev, event.message].sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
              console.log(`📊 Message count updated: ${prev.length} → ${newMessages.length}`);
              return newMessages;
            }
            return prev;
          });
          
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      };
      
      channelInstance.on('message.new', handleNewMessage);
      console.log('✅ Message listener set');
      
      // Cleanup
      return () => {
        console.log('🧹 Cleaning up channel listeners');
        channelInstance.off('message.new', handleNewMessage);
      };
      
    } catch (error: any) {
      console.error('❌ Failed to load channel:', error);
      console.error('Error details:', error.message);
      
      // More specific error messages
      if (error.message?.includes('not exist') || error.message?.includes('not found')) {
        setError(`Chat not found. Please check if the channel exists.`);
      } else if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
        setError('You do not have permission to access this chat');
      } else {
        setError(`Failed to load chat: ${error.message || 'Unknown error'}`);
      }
    } finally {
      console.log('🏁 Loading complete, setting loading=false');
      setLoading(false);
    }
  };
  
  loadChannelAndMessages();
  
}, [cid, currentUserId]);

  // Function to load messages
  const loadMessages = async (channelInstance: any) => {
    try {
      console.log('📥 Starting to load messages...');
      
      let loadedMessages: any[] = [];
      
      // Get messages from channel state
      if (channelInstance.state?.messages) {
        loadedMessages = [...channelInstance.state.messages];
        console.log(`📋 Got ${loadedMessages.length} messages from channel state`);
      } else {
        // Query messages
        try {
          console.log('🔍 Querying messages...');
          const result = await channelInstance.queryMessages({ limit: 50 });
          loadedMessages = result.messages || [];
          console.log(`📋 Queried ${loadedMessages.length} messages`);
        } catch (queryError) {
          console.warn('⚠️ Failed to query messages:', queryError);
        }
      }
      
      // Sort by time
      const sortedMessages = loadedMessages.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      setMessages(sortedMessages);
      console.log(`✅ Set ${sortedMessages.length} messages to state`);
      
      // Scroll to bottom
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: false });
          console.log('⬇️ Scrolled to bottom');
        }
      }, 300);
      
    } catch (error) {
      console.error('❌ Failed to load messages:', error);
    }
  };
  
  // ========== Add delete message function ==========
  const handleDeleteMessage = async (message: any) => {
    try {
      console.log('🗑️ Starting to delete message:', { 
        id: message.id, 
        text: message.text?.substring(0, 30) + '...',
        isOwn: message.user_id === currentUserId 
      });
      
      // Permission check: can only delete own messages
      const isOwnMessage = message.user_id === currentUserId || 
                          message.user?.id === currentUserId;
      
      if (!isOwnMessage) {
        Alert.alert('Permission Denied', 'Can only delete messages you sent');
        return;
      }
      
      // Show confirmation dialog
      Alert.alert(
        'Delete Message',
        'Are you sure you want to permanently delete this message? This action cannot be undone.',
        [
          { 
            text: 'Cancel', 
            style: 'cancel' 
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await performMessageDeletion(message);
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Delete dialog error:', error);
    }
  };

  const performMessageDeletion = async (message: any) => {
    try {
      if (!channel || !channel.state) {
        throw new Error('Chat channel not connected');
      }
      
      console.log('🔍 Delete message details:', {
        messageId: message.id,
        channelState: !!channel.state,
        hasRemoveMessage: !!channel.state.removeMessage
      });
      
      // 1. Immediately remove from local UI (quick feedback)
      setMessages((prev: any[]) => prev.filter((m: any) => m.id !== message.id));
      console.log('✅ Removed message from local UI');
      
      // 2. Try to remove from channel state
      if (channel.state.removeMessage && typeof channel.state.removeMessage === 'function') {
        try {
          channel.state.removeMessage(message);
          console.log('✅ Removed message from channel state');
        } catch (removeError) {
          console.warn('⚠️ Failed to remove from state:', removeError);
        }
      }
      
      // 3. Try to delete from server (if possible)
      try {
        const client = StreamClient.getInstance() as any;
        
        // Method 1: Try using client's deleteMessage
        if (client?.deleteMessage && typeof client.deleteMessage === 'function') {
          await client.deleteMessage(message.id);
          console.log('✅ Deleted message from server successfully');
        } 
        // Method 2: Try via _client
        else if (channel._client?.deleteMessage) {
          await channel._client.deleteMessage(message.id);
          console.log('✅ Deleted message via _client successfully');
        }
        // Method 3: Send system message indicating deletion
        else {
          console.log('⚠️ Cannot find server deletion method, only local deletion');
          await channel.sendMessage({
            text: 'Original message has been deleted',
            type: 'system',
            parent_id: message.id,
            show_in_channel: false
          });
          console.log('✅ Sent deletion notification');
        }
      } catch (serverError) {
        console.warn('⚠️ Server deletion failed, only local deletion:', serverError);
        // Keep local deletion state even if server deletion fails
      }
      
      Alert.alert('Success', 'Message deleted');
      
    } catch (error: any) {
      console.error('❌ Delete process error:', error);
      Alert.alert('Deletion Failed', error.message || 'Operation failed, please try again');
    }
  };

  const handleSendMessage = () => {
    loadMessages(channel);
  };
  // ========== End addition ==========
  
  // Render message
const renderMessage = ({ item }: { item: any }) => {
  const isOwn = item.user_id === currentUserId || 
                item.user?.id === currentUserId;
  
  // Get channel members for participation tracking
  const channelMembers = channel?.state?.members ? 
    Object.values(channel.state.members).map((member: any) => ({
      id: member.user_id,
      name: member.user?.name || member.user_id,
    })) : [];
  
      return (
    <MessageBubble 
      message={item} 
      isOwn={isOwn}
      onLongPress={handleDeleteMessage}
      channelMembers={channelMembers}
      currentUserId={currentUserId}
      channel={channel}  // Pass channel
      messages={messages} // Pass messages
    />
  );
  };

  // Loading state
  if (loading) {
    console.log('⏳ Showing loading screen...');
    return (
      <View style={styles.fullScreenContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1b72ff" />
        <ActivityIndicator size="large" color="#FFF" />
        <Text style={[styles.loadingText, { color: '#FFF' }]}>
          {currentUserId ? 'Loading chat...' : 'Authenticating user...'}
        </Text>
        {currentUserId && (
          <Text style={{ color: '#FFF', marginTop: 10, fontSize: 12 }}>
            User: {currentUserId} | Channel: {cid}
          </Text>
        )}
      </View>
    );
  }

  // Error state
  if (error || !channel) {
    console.log('❌ Showing error screen:', { error, hasChannel: !!channel });
    return (
      <View style={styles.fullScreenContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1b72ff" />
        <Text style={styles.errorText}>Unable to load chat</Text>
        <Text style={styles.errorDetail}>{error || 'Channel loading failed'}</Text>
        
        {error?.includes('not found') && (
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: '#34C759', marginTop: 10 }]}
            onPress={() => router.push('/(tabs)/add-contact')}
          >
            <Text style={styles.retryButtonText}>Create New Chat</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            console.log('🔄 Reloading...');
            setError(null);
            setChannel(null);
            setMessages([]);
            setLoading(true);
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: '#666', marginTop: 10 }]}
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>Back to Messages</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Normal rendering
  console.log('✅ Rendering chat interface, message count:', messages.length);
  
// Then fix your return statement:
return (
  <>
    <Stack.Screen 
      options={{ 
        headerShown: true,
        header: () => <CustomHeader channel={channel} />,
        headerStyle: { backgroundColor: '#1b72ff' },
      }} 
    />
    
    {/* WRAP EVERYTHING IN ONE KEYBOARD AVOIDING VIEW */}
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.fullScreenContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1b72ff" />
        

        
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id || Math.random().toString()}
          contentContainerStyle={[
            styles.messagesListContainer,
            { paddingBottom: 100 } // Extra padding for input
          ]}
          inverted={false}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
          ListEmptyComponent={
            <View style={styles.emptyMessagesContainer}>
              <Ionicons name="chatbubble-outline" size={48} color="#8E8E93" />
              <Text style={styles.emptyMessagesText}>
                No messages yet, start a conversation!
              </Text>
            </View>
          }
          style={{ flex: 1 }}
        />
        
        {/* Message Input - This will stick to keyboard */}
        <CustomMessageInput 
          channel={channel} 
          onSend={() => loadMessages(channel)}
          currentUserId={currentUserId}
        />
      </View>
    </KeyboardAvoidingView>
  </>
);
}

const styles = StyleSheet.create({
  // Calendar message styles
  calendarContainer: {
    maxWidth: 320,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  
  ownCalendarContainer: {
    backgroundColor: '#007AFF',
  },
  
  otherCalendarContainer: {
    backgroundColor: '#E9E9EB',
  },
  
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
  },
  
  calendarTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  ownCalendarText: {
    color: '#FFFFFF',
  },
  
  otherCalendarText: {
    color: '#000000',
  },
  
  eventCount: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  
  // Join button styles
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  
  ownJoinButton: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  
  otherJoinButton: {
    backgroundColor: '#007AFF',
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  
  joinButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  
  ownJoinButtonText: {
    color: '#007AFF',
  },
  
  otherJoinButtonText: {
    color: '#FFFFFF',
  },
  
  eventsPreview: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
  },
  
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 1,
  },
  
  eventColorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  
  eventText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    flex: 1,
  },
  
  moreEventsText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  // Full Screen
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  
  // Header
  headerContainer: {

    backgroundColor: '#1b72ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 25,
    paddingBottom: 12,
    height: Platform.OS === 'ios' ? 100 : 70,
    borderBottomWidth: 1,
    borderBottomColor: '#1565d8',
  },
  
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  
  opponentInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginRight: 12,
  },
  

  
  opponentTextInfo: {
    flex: 1,
  },
  
  opponentName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  
  onlineDot: {
    backgroundColor: '#4CD964',
  },
  
  offlineDot: {
    backgroundColor: '#8E8E93',
  },
  
  statusText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
  },
  
  moreButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  
  // Chat Content
  chatContentContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  
  // Messages List
  messagesListContainer: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    flexGrow: 1,
  },
  
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  
  emptyMessagesText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  
  // Message Bubbles
  messageBubbleContainer: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  
  ownMessageContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  
  otherMessageContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  
  ownMessage: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  
  otherMessage: {
    backgroundColor: '#E9E9EB',
    borderBottomLeftRadius: 4,
  },
  
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  
  ownMessageText: {
    color: '#FFFFFF',
  },
  
  otherMessageText: {
    color: '#000000',
  },
  
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
    marginLeft: 12,
  },
  
  messageTime: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 4,
    marginHorizontal: 4,
  },
  
  // Message Input
  messageInputContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C6C6C8',
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  
  attachmentsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  
  attachmentPreview: {
    position: 'relative',
    marginRight: 10,
    marginBottom: 10,
  },
  
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: '#F8F8F8',
  },
  
  filePreview: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  
  removeAttachmentButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    marginBottom: Platform.OS === 'ios' ? 5 : 10,
  },
  
  textInputContainer: {
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  
  textInput: {
    fontSize: 16,
    color: '#000000',
    paddingVertical: 8,
    minHeight: 28,
    maxHeight: 100,
    lineHeight: 20,
  },
  
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  
  sendButtonDisabled: {
    opacity: 0.5,
  },
  
  // Loading & Error States
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 12,
    textAlign: 'center',
  },
  
  errorDetail: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 24,
    fontSize: 15,
    lineHeight: 22,
  },
  
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Multimedia Attachment Styles
  attachmentBubble: {
    padding: 8,
  },
  
  attachmentContainer: {
    marginTop: 8, // Fixed value, conditional margin handled in component
  },
  
  imageAttachment: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#00000010',
  },
  
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  
  attachmentCaption: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    paddingHorizontal: 8,
    fontStyle: 'italic',
  },
  
  videoAttachment: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#00000010',
    padding: 16,
    alignItems: 'center',
  },
  
  videoPlaceholder: {
    alignItems: 'center',
    padding: 20,
  },
  
  videoText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  
  fileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  
  fileInfo: {
    flex: 1,
    marginRight: 12,
  },
  
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  
  fileType: {
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
  },
  
  onlyAttachments: {
    minHeight: 20, // Ensure bubble has some height even without text
  },
  
  // Add to your styles
  mediaPreviewContainer: {
    //marginTop: message.text ? 8 : 0,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#00000010',
  },

  mediaPreviewImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },

  mediaCaption: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    paddingHorizontal: 4,
    fontStyle: 'italic',
  },

  videoPreview: {
    width: 200,
    height: 120,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },

  videoPreviewText: {
    color: '#FFFFFF',
    marginTop: 8,
    fontSize: 14,
  },

  filePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 12,
    //marginTop: message.text ? 8 : 0,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },

  multipleFilesText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },

  // Long press visual feedback styles
  messagePressed: {
    opacity: 0.8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)', // Semi-transparent blue background
    borderRadius: 12, // Match your message bubble corner radius
  },
  
  // If more obvious long press effect is needed, add:
  deleteHint: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#FF3B30',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  
  deleteHintText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Conflict warning styles
  conflictWarningContainer: {
    marginHorizontal: 12,
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  
  ownConflictWarning: {
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderColor: 'rgba(255, 149, 0, 0.3)',
  },
  
  otherConflictWarning: {
    backgroundColor: 'rgba(255, 149, 0, 0.2)',
    borderColor: 'rgba(255, 149, 0, 0.4)',
  },
  
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  
  conflictHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  
  ownConflictText: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  
  otherConflictText: {
    color: '#FF9500',
  },
  
  conflictMessage: {
    fontSize: 11,
    lineHeight: 14,
  },
  
  conflictDetails: {
    fontSize: 10,
    marginTop: 4,
    color: 'rgba(255, 149, 0, 0.8)',
    fontStyle: 'italic',
  },

  // Join button with conflict styles
  joinButtonWithConflict: {
    borderColor: '#FF9500',
    borderWidth: 1,
  },

  joinButtonDisabled: {
    opacity: 0.5,
  },

  // Event statistics
  eventStats: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },

  eventStatsText: {
    fontSize: 10,
    opacity: 0.8,
  },
  
  // Calendar title container
  calendarTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
 
  
  // Large add all events button
  addAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  
  ownAddAllButton: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  
  otherAddAllButton: {
    backgroundColor: '#007AFF',
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  
  addAllButtonDisabled: {
    opacity: 0.5,
  },
  
  addAllButtonInfo: {
    marginLeft: 8,
    alignItems: 'flex-start',
  },
  
  addAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  ownAddAllButtonText: {
    color: '#007AFF',
  },
  
  otherAddAllButtonText: {
    color: '#FFFFFF',
  },
  
  addAllButtonSubtext: {
    fontSize: 10,
    marginTop: 2,
    opacity: 0.8,
  },
  
  ownAddAllButtonSubtext: {
    color: '#007AFF',
  },
  
  otherAddAllButtonSubtext: {
    color: '#FFFFFF',
  },
  // Add Members Button
  addMembersButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 44,
  },

  searchIcon: {
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    height: 44,
  },

  loadingIndicator: {
    marginVertical: 20,
  },

  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },

  userItemSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
  },

  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },

  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  userAvatarInitial: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  userDetails: {
    flex: 1,
  },

  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },

  userId: {
    fontSize: 12,
    color: '#666',
  },

  emptyList: {
    padding: 20,
    alignItems: 'center',
  },

  emptyListText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },

  modalActions: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  addButtonDisabled: {
    opacity: 0.5,
  },

  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
    // Member Info Container
  memberInfoContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },

  memberAvatarsContainer: {
    marginRight: 12,
  },

  singleAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  multipleAvatarsContainer: {
    width: 70,
    height: 40,
    position: 'relative',
  },

  stackedAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#1b72ff',
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  stackedAvatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },

  stackedAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  stackedAvatarInitial: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },

  extraCountAvatar: {
    backgroundColor: '#8E8E93',
  },

  extraCountText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },

  memberTextInfo: {
    flex: 1,
  },

  memberName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },

  // Update existing avatar styles to be more generic
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  avatarInitial: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
   // Participation Tracking Styles
  participationSummary: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },

  ownParticipationSummary: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  otherParticipationSummary: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },

  participationStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  participationIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  participationCount: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },

  ownParticipationText: {
    color: 'rgba(255, 255, 255, 0.9)',
  },

  otherParticipationText: {
    color: 'rgba(0, 0, 0, 0.8)',
  },

  participationProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    marginHorizontal: 10,
    overflow: 'hidden',
  },

  ownParticipationProgressBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  participationProgressFill: {
    height: '100%',
    borderRadius: 2,
  },

  participationDetails: {
    marginTop: 12,
  },

  participationHeader: {
    marginBottom: 10,
  },

  participationTitle: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.9,
  },

  participationLists: {
    marginBottom: 10,
  },

  participationList: {
    marginBottom: 12,
  },

  participationListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  participationListTitle: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
    opacity: 0.9,
  },

  participationMember: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },

  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  memberStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },

  memberTime: {
    fontSize: 10,
    color: 'rgba(0, 0, 0, 0.5)',
  },

  ownMemberTime: {
    color: 'rgba(255, 255, 255, 0.5)',
  },

  participationFooter: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },

  ownParticipationFooter: {
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },

  participationFooterText: {
    fontSize: 10,
    textAlign: 'center',
    opacity: 0.7,
  },

  ownParticipationFooterText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },

  otherParticipationFooterText: {
    color: 'rgba(0, 0, 0, 0.7)',
  },
  eventParticipationSummary: {
  marginHorizontal: 12,
  marginTop: 6,
  marginBottom: 4,
  padding: 8,
  borderRadius: 8,
  borderWidth: 1,
},

eventParticipationHeader: {
  flexDirection: 'column',
},

eventTitleContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 6,
},
joinedEventSummary: {
  borderWidth: 2,
  borderColor: '#34C759',
},

joinedEventButton: {
  backgroundColor: '#34C759',
  borderColor: '#2CA64C',
},
eventName: {
  fontSize: 12,
  fontWeight: '600',
  marginRight: 8,
  flex: 1,
},

eventTime: {
  fontSize: 10,
  opacity: 0.8,
},

eventParticipationDetails: {
  marginTop: 8,
},

addEventButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 12,
  paddingVertical: 6,
  marginTop: 8,
  borderRadius: 6,
  borderWidth: 1,
},

addEventButtonText: {
  fontSize: 11,
  fontWeight: '600',
  marginLeft: 4,
},
});