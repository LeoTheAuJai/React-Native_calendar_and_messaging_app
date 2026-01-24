// app/utils/screen-utils.ts
import { Dimensions } from 'react-native';

// get size
export const getScreenDimensions = () => {
  return Dimensions.get('window');
};

// determine type
export const screenType = () => {
  const { width, height } = getScreenDimensions();
  
  if (width >= 768) {
    return 'tablet'; 
  } else if (width >= 375) {
    return 'phone-large'; 
  } else {
    return 'phone-small'; 
  }
};

// responsive
export const responsiveSize = (phone: number, tablet: number) => {
  const type = screenType();
  return type === 'tablet' ? tablet : phone;
};

// constant
export const SCREEN = {
  width: Dimensions.get('window').width,
  height: Dimensions.get('window').height,
  isSmall: Dimensions.get('window').width < 375,
  isMedium: Dimensions.get('window').width >= 375 && Dimensions.get('window').width < 414,
  isLarge: Dimensions.get('window').width >= 414 && Dimensions.get('window').width < 768,
  isTablet: Dimensions.get('window').width >= 768,
};