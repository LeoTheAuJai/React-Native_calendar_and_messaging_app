// utils/fileUploadService.ts - UPDATED WITH MODERN API
import { File } from 'expo-file-system';
import { Alert } from 'react-native';

// Import the legacy API ONLY if you absolutely need it for other functions
// import * as LegacyFileSystem from 'expo-file-system/legacy';

export const getFileInfo = async (fileUri: string) => {
  try {
    // 1. Create a File instance from the URI
    const file = new File(fileUri);

    // 2. Get the file's info (exists, size, etc.)
    // The properties are accessed directly; not all need an async call.
    const exists = file.exists; // This is a synchronous property

    if (!exists) {
      throw new Error('File does not exist or cannot be accessed');
    }

    // 3. Get the file size in MB (as a number)
    const sizeInMB = file.size ? file.size / (1024 * 1024) : 0;

    // 4. Extract filename and guess mime type
    const fileName = fileUri.split('/').pop() || `file_${Date.now()}`;

    // Helper to guess mime type from file extension
    const getMimeType = (filename: string) => {
      const ext = filename.toLowerCase().split('.').pop();
      const mimeTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'mp4': 'video/mp4',
        'mov': 'video/quicktime',
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
      return mimeTypes[ext || ''] || 'application/octet-stream';
    };

    const mimeType = getMimeType(fileName);

    return {
      uri: fileUri,
      name: fileName,
      size: file.size || 0,
      sizeMB: sizeInMB, // Keep as a number for comparisons
      mimeType: mimeType,
      type: mimeType.split('/')[0] as 'image' | 'video' | 'application'
    };
  } catch (error) {
    console.error('Error getting file info with new API:', error);
    throw error;
  }
};

// Keep your existing `uploadFile` function; it doesn't need to change.
export const uploadFile = async (
  fileUri: string, 
  fileName: string, 
  mimeType: string
): Promise<{ url: string; thumbnailUrl?: string }> => {
  console.log('Uploading file:', { fileUri, fileName, mimeType });
  
  try {
    // Check if it's already a URL (not a local file)
    if (!fileUri.startsWith('file://')) {
      return { url: fileUri };
    }
    
    // For development: Create placeholder URLs
    // ⚠️ In production, upload to your own server/CDN
    if (__DEV__) {
      Alert.alert(
        'Development Mode',
        'Files are stored locally. In production, upload to a server/CDN.',
        [{ text: 'OK' }]
      );
      
      // Generate a mock URL for development
      const mockUrl = `https://mock-cdn.com/${Date.now()}/${fileName}`;
      
      // For images, create a thumbnail URL too
      if (mimeType.startsWith('image/')) {
        return { 
          url: mockUrl,
          thumbnailUrl: `https://mock-cdn.com/thumb/${Date.now()}/${fileName}`
        };
      }
      
      return { url: mockUrl };
    }
    
    // Production upload logic would go here:
    // Example: Upload to your backend server
    /*
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      type: mimeType,
      name: fileName,
    } as any);
    
    const response = await fetch('https://your-server.com/upload', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${yourToken}`,
      },
    });
    
    const result = await response.json();
    return {
      url: result.url,
      thumbnailUrl: result.thumbnailUrl
    };
    */
    
    throw new Error('Upload service not implemented for production');
    
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};