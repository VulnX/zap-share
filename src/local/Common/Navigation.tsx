import { useTheme } from "../Context/Theme";
import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { DeviceConfig } from "../types";
import {
  Switch,
} from "@material-tailwind/react";
import { SidePanel } from "./SidePanel";
import { StatusSource } from "./StatusSource";

export function ToggleThemeButton() {
  const { isTheme, toggleTheme } = useTheme();

  return (
    <Switch
      checked={isTheme}
      onChange={toggleTheme}
      id="custom-switch-component"
      ripple={false}
      className="h-full w-full  bg-blue-gray-400 checked:bg-blue-gray-800"
      circleProps={{
        className: "before:hidden",
      }}
      {...({} as any)}
    />
  );
}

export function ProfileButton() {
  const { isTheme } = useTheme();
  const [showDeviceName, setShowDeviceName] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    async function getDeviceName() {
      const config: DeviceConfig = await invoke("get_device_config");
      setDeviceName(config.name);
    }

    getDeviceName();
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setShowDeviceName(!showDeviceName)}
        className={`p-2 rounded-xl ${
          isTheme
            ? "bg-[#2a2d3e] text-slate-200 hover:bg-[#343748]"
            : "bg-[#f1f3f8] text-[#5b6178] hover:bg-[#e8ebf2]"
        } transition-all flex items-center justify-center`}
        title={deviceName}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      </button>
      {showDeviceName && (
        <div
          className={`absolute right-0 mt-2 py-2 px-4 rounded-xl shadow-lg z-50 ${
            isTheme
              ? "bg-[#2a2d3e] white border border-[#3a3f55] shadow-black/40"
              : "bg-white text-[#1a1d2e] border border-[#e2e5ef] shadow-md"
          }`}
        >
          {deviceName}
        </div>
      )}
    </div>
  );
}

export interface NavigationProps {
  tab: string;
  setTab: (tab: string) => void;
}

export default function Navigation({
  tab,
  setTab,
}: NavigationProps) {
  const { isTheme } = useTheme();
  const [openSettings, setOpenSettings] = useState(false);

  const handleTabSwitch = (newTab: string) => {
    if (tab !== newTab) {
      setTab(newTab);
    }
  };

  return (
    <>
      <nav
        className={`flex w-full items-stretch ${
          isTheme
            ? "bg-[#13151f] border-b border-[#2a2d3e]"
            : "bg-white border-b border-[#e2e5ef]"
        }`}
      >
        {/* Settings Icon */}
        <div
          className={`w-12 flex items-center justify-center cursor-pointer transition-all ${
            isTheme ? "hover:bg-[#1e2130]" : "hover:bg-[#f1f3f8]"
          }`}
          onClick={() => setOpenSettings(!openSettings)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke={isTheme ? "#8b92b3" : "#9097b0"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-settings"
          >
            <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>

        {/* Send Tab */}
        <div
          className={`flex py-3.5 justify-center items-center w-1/2 border-l cursor-pointer transition-all duration-200 select-none relative ${
            tab === "send"
              ? isTheme
                ? "bg-[#1e2130] text-white border-l-[#2a2d3e]"
                : "bg-indigo-50 text-indigo-700 border-l-[#e2e5ef]"
              : isTheme
                ? "bg-[#13151f] text-[#c4c9de] border-l-[#2a2d3e] hover:bg-[#1a1d2a] hover:text-white"
                : "bg-white text-[#9097b0] border-l-[#e2e5ef] hover:bg-[#f8f9fc] hover:text-[#5b6178]"
          }`}
          onClick={() => handleTabSwitch("send")}
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          <span className="text-sm font-semibold">Send</span>
          {tab === "send" && (
            <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-indigo-500 rounded-full" />
          )}
        </div>

        {/* Receive Tab */}
        <div
          className={`flex py-3.5 justify-center items-center w-1/2 border-l cursor-pointer transition-all duration-200 select-none relative ${
            tab === "recv"
              ? isTheme
                ? "bg-[#1e2130] text-white border-l-[#2a2d3e]"
                : "bg-indigo-50 text-indigo-700 border-l-[#e2e5ef]"
              : isTheme
                ? "bg-[#13151f] text-[#c4c9de] border-l-[#2a2d3e] hover:bg-[#1a1d2a] hover:text-white"
                : "bg-white text-[#9097b0] border-l-[#e2e5ef] hover:bg-[#f8f9fc] hover:text-[#5b6178]"
          }`}
          onClick={() => handleTabSwitch("recv")}
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          <span className="text-sm font-semibold">Receive</span>
          {tab === "recv" && (
            <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-indigo-500 rounded-full" />
          )}
        </div>

        <SidePanel
          setOpenSettings={setOpenSettings}
          openSettings={openSettings}
        />
      </nav>

      <StatusSource />
    </>
  );
}
