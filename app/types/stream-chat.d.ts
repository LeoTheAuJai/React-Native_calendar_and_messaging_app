// app/types/stream-chat.d.ts
import type {
    DefaultAttachmentData,
    DefaultChannelData,
    DefaultMessageData,
    DefaultUserData,
} from 'stream-chat-expo';
declare module 'stream-chat' {
  interface CustomAttachmentData extends DefaultAttachmentData {}
  interface CustomChannelData extends DefaultChannelData {}
  interface CustomMessageData extends DefaultMessageData {}
  interface CustomUserData extends DefaultUserData {}
}