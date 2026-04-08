import { useContext, useState, useEffect, useRef } from "react";
import { DeviceProvider } from "../../App";
import Navigation from "./Navigation";
import SendDesktop from "../Send/Send";
import Recieve from "../Receive/Recieve";
import { invoke } from "@tauri-apps/api/core";
import { SharedText, SharedFiles } from "../types";
import { useTheme } from "../Context/Theme";

export default function Choice({ children }: { children: React.ReactNode }) {
  const isMobile = useContext(DeviceProvider)?.isMobile;
  const { isTheme } = useTheme();

  // Indicates active tab
  const [tab, setTab] = useState("send");
  const [sharedData, setSharedData] = useState<SharedText | SharedFiles | null>(
    null,
  );

  // Checks if files were shared through the share menu of mobile
  const lastHandledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isMobile) return;

    let isChecking = false;

    const checkSharedData = async () => {
      if (isChecking) return;
      isChecking = true;

      try {
        const data = await invoke<SharedText | SharedFiles>("get_shared_data");

        if (!data) return;

        const currentContent = JSON.stringify(data);

        if (currentContent === lastHandledRef.current) return;

        let hasText =
          "SharedText" in data &&
          typeof data.SharedText === "string" &&
          data.SharedText.trim().length > 0;

        let hasFiles =
          "URIList" in data &&
          data.URIList &&
          (Array.isArray(data.URIList)
            ? data.URIList.length > 0
            : data.URIList.trim().length > 2);

        if (hasText || hasFiles) {
          lastHandledRef.current = currentContent;

          // ✅ IMPORTANT: flush sync to avoid race
          setTab("send");
          setSharedData(data);
        }
      } catch (err) {
        console.error("Error checking shared data:", err);
      } finally {
        isChecking = false;
      }
    };

    // ✅ ONLY trigger on resume
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setTimeout(checkSharedData, 300); // let UI settle
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    // initial run
    setTimeout(checkSharedData, 300);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isMobile]);
  return (
    <div
      className={`h-screen w-screen flex flex-col overflow-hidden transition-colors duration-300 ${
        isTheme ? "bg-[#13151f] text-white" : "bg-[#f8f9fc] text-black"
      }`}
    >
      <Navigation tab={tab} setTab={setTab} />
      <main
        className={`flex-1 overflow-hidden relative ${isTheme ? "bg-[#13151f]" : "bg-[#f8f9fc]"}`}
      >
        <div className="h-full overflow-y-auto">
          {tab === "send" ? (
            <SendDesktop
              sharedData={sharedData}
              onProcessed={() => setSharedData(null)}
            />
          ) : (
            <Recieve />
          )}
        </div>
      </main>
      {children}
    </div>
  );
}
