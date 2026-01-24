// utils/streamUploadService.ts - Updated version

export const uploadToStreamCDN = async (
  fileUri: string,
  fileName: string,
  mimeType: string,
  channel: any // Pass current channel object from chat component
): Promise<{ url: string; thumbnailUrl?: string }> => {
  try {
    console.log('🔄 Starting Stream CDN upload...');
    console.log('File:', { fileName, mimeType });

    // Check if already a URL
    if (!fileUri.startsWith('file://')) {
      console.log('📦 Already a URL, skipping upload');
      return { url: fileUri };
    }

    const finalFileName = fileName || fileUri.split('/').pop() || `file_${Date.now()}`;
    console.log('📤 Uploading to Stream CDN via channel API...');

    // Prepare file data: Need to convert local URI to file object
    // Using image as example, you need to implement getFileFromUri function according to your actual situation
    const fileData = await getFileFromUri(fileUri, finalFileName, mimeType); 

    let uploadResponse;
    if (mimeType.startsWith('image/')) {
      // Use channel's sendImage method
      uploadResponse = await channel.sendImage(fileData, finalFileName, mimeType);
    } else {
      // Use channel's sendFile method
      uploadResponse = await channel.sendFile(fileData, finalFileName, mimeType);
    }

    console.log('✅ Stream upload response:', uploadResponse);

    // Process response - SDK usually returns an object containing 'file' property
    if (uploadResponse && uploadResponse.file) {
      return {
        url: uploadResponse.file,
        thumbnailUrl: uploadResponse.thumb_url, // Images may have thumbnails
      };
    } else {
      throw new Error('Invalid upload response from Stream');
    }

  } catch (error: any) {
    console.error('❌ Stream CDN upload failed:', error);
    // ... Error handling part remains unchanged
    throw error;
  }
};

// Helper function: Convert React Native's file:// URI to uploadable format
// This is a crucial step, you need to implement it according to your environment
async function getFileFromUri(uri: string, name: string, type: string): Promise<any> {
  // Option 1: Use fetch to get blob (suitable for network images or accessible local files)
  // const response = await fetch(uri);
  // const blob = await response.blob();
  // return new File([blob], name, { type });

  // Option 2: For expo-file-system, read as base64 then convert
  // import * as FileSystem from 'expo-file-system';
  // const base64 = await FileSystem.readAsStringAsync(uri, { 
  //   encoding: FileSystem.EncodingType.Base64 
  // });
  // Then convert base64 to Blob or File object

  // Note: This is pseudo-code, need to implement according to your project's actual situation
  console.warn('⚠️ Need to implement getFileFromUri function to convert file format');
  // Simplest way (if SDK supports): directly return an object containing uri, name, type
  // But some SDK versions may require stricter format
  return {
    uri: uri,
    name: name,
    type: type,
  };
}