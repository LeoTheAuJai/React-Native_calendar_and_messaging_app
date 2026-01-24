// app/_layout.web.tsx (Web-specific layout) (but since many component are not for web, it may not be used)
import { useEffect, useState } from 'react';

export default function WebLayout() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Return empty content before client-side rendering
  if (!isClient) {
    return null;
  }

  // Dynamically import main layout (only executed on client)
  const DynamicLayout = require('./_layout').default;
  return <DynamicLayout />;
}