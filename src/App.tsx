import "./App.css";
import Choice from "./local/Choice/Choice";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Send from "./local/Send/Send";
import Recieve from "./local/Receive/Recieve";
import { ThemeProvider } from "./local/Choice/Theme";
import { createContext, useEffect, useState } from "react";
import SendConfirmation from "./local/Send/SendConfirmation";

interface Device {
  isMobile: boolean;
}
export const DeviceProvider = createContext<Device | undefined>(undefined);

function App() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const os = navigator.userAgent;
    const mobileCheck = /Mobi/i.test(os);
    setIsMobile(mobileCheck);
    // console.log(mobileCheck);
  }, []);
  return (
    <div>
      <DeviceProvider.Provider value={{ isMobile: isMobile ?? false }}>
        <ThemeProvider>
          <Router>
            <Routes>
              {/* <Route path='/' element={}></Route> */}
              <Route path="/" element={<Choice />}></Route>
              <Route path="/send" element={<Send />}></Route>
              <Route
                path="/send/confirm"
                element={<SendConfirmation />}
              ></Route>
              <Route path="/send/qrcode" element={<Send />}></Route>
              <Route path="/receive" element={<Recieve />}></Route>
            </Routes>
          </Router>
        </ThemeProvider>
      </DeviceProvider.Provider>
    </div>
  );
}

export default App;
