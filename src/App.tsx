import "./App.css";
import Choice from "./local/Common/Choice";
import { ThemeProvider } from "./local/Context/Theme";
import { createContext, useEffect, useState } from "react";
import { QrProvider } from "./local/Context/QrContext";
import { SharedDataProvider } from "./local/Context/FileListContext";

interface Device {
  isMobile: boolean;
}

// Fix: Provide proper type for context
export const DeviceProvider = createContext<Device | undefined>(undefined);

function App() {
  // Fix: Proper typing for state
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const os = navigator.userAgent;
    const mobileCheck = /Mobi/i.test(os);
    setIsMobile(mobileCheck);
  }, []);

  // Optional: Show loading state while detecting device
  if (isMobile === null) {
    return <div>Loading...</div>;
  }

  return (
    <DeviceProvider.Provider value={{ isMobile }}>
      <ThemeProvider>
        <QrProvider>
          <SharedDataProvider>
            <Choice children={null} />
          </SharedDataProvider>
        </QrProvider>
      </ThemeProvider>
    </DeviceProvider.Provider>
  );
}

export default App;
