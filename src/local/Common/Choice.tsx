import { useContext, useState } from "react";
import { DeviceProvider } from "../../App";
import Navigation from "./Navigation";
import SendDesktop from "../Send/SendDesktop";
import Recieve from "../Receive/Recieve";
import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { SendLogic } from "../Send/SendLogic";
import { SharedText, SharedFiles } from "../types";
// import { SendMobile } from "../Send/SendMobile";

export default function Choice({ children }: { children: React.ReactNode }) {
  const isMobile = useContext(DeviceProvider)?.isMobile;

  // Indicates active tab
  const [tab, setTab] = useState("send");

  // Indicates whether we can switch tabs
  const [canSwitch, setCanSwitch] = useState(true);

  const hasRun = useRef(false);

  // Checks if files were shared through the share menu of mobile
  const { proceedWithSend } = SendLogic();
  useEffect(() => {
    if (!hasRun.current && isMobile) {
      (async () => {
        hasRun.current = true;
        let data = await invoke<SharedText | SharedFiles>("get_shared_data");
        console.log("data start");
        console.log(data);
        if (data && "SharedText" in data) {
          // Text was shared
          console.log((data.SharedText ?? "").split("\n")[0].trim() || "");
          let sharedText =
            (data.SharedText ?? "")
              .split("\n")[0]
              .replace(/^"|"$/g, "")
              .trim() || "";
          proceedWithSend(null, sharedText);
        } else if (data && "URIList" in data && data.URIList) {
          // File(s) were shared
          try {
            const uriString = data.URIList.toString();
            // Remove the brackets and split by comma-space
            const uriArray = uriString
              .replace(/^\[|\]$/g, "")
              .split(", ")
              .filter((uri) => uri.trim() !== "");
            console.log("Parsed URIs:", uriArray);
            proceedWithSend(uriArray, null);
          } catch (err) {
            console.error("Failed to parse URIList:", err);
            proceedWithSend(null, null);
          }
        }
        console.log("data end");
      })();
    }
  }, []);

  return (
    <div>
      <nav>
        <Navigation
          tab={tab}
          setTab={setTab}
          canSwitch={canSwitch}
          setCanSwitch={setCanSwitch}
        />
        {tab === "send" ? <SendDesktop /> : <Recieve />}
      </nav>
      {children}
    </div>
  );
}
