import { useTheme } from "../Context/Theme";
import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { DeviceConfig } from "../types";
import {
  Button,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Switch,
} from "@material-tailwind/react";
import { SidePanel } from "./SidePanel";

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
  canSwitch: boolean;
  setCanSwitch: (canSwitch: boolean) => void;
}

export default function Navigation({
  tab,
  canSwitch,
  setTab,
  setCanSwitch,
}: NavigationProps) {
  const [open, setOpen] = useState(false);
  const { isTheme } = useTheme();
  const [openSettings, setOpenSettings] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  const handleTabSwitch = (newTab: string) => {
    if (canSwitch) {
      setTab(newTab);
      return;
    }
    if (tab !== newTab) {
      setPendingTab(newTab);
      setOpen(true);
    }
  };

  const handleConfirm = () => {
    if (pendingTab) {
      setTab(pendingTab);
      setCanSwitch(true);
      setPendingTab(null);
    }
    setOpen(false);
  };

  const handleCancel = () => {
    setPendingTab(null);
    setOpen(false);
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 640 640"
            fill={
              tab === "send"
                ? isTheme
                  ? "white"
                  : "#6366f1"
                : isTheme
                  ? "#c4c9de"
                  : "#9097b0"
            }
            className="size-4 mr-2"
          >
            <path d="M568.4 37.7C578.2 34.2 589 36.7 596.4 44C603.8 51.3 606.2 62.2 602.7 72L424.7 568.9C419.7 582.8 406.6 592 391.9 592C377.7 592 364.9 583.4 359.6 570.3L295.4 412.3C290.9 401.3 292.9 388.7 300.6 379.7L395.1 267.3C400.2 261.2 399.8 252.3 394.2 246.7C388.6 241.1 379.6 240.7 373.6 245.8L261.2 340.1C252.1 347.7 239.6 349.7 228.6 345.3L70.1 280.8C57 275.5 48.4 262.7 48.4 248.5C48.4 233.8 57.6 220.7 71.5 215.7L568.4 37.7z" />
          </svg>
          <span className="text-sm font-semibold">Send</span>
          {/* Active indicator bar */}
          {tab === "send" && (
            <span
              className={`absolute bottom-0 left-[0%] right-[0%] h-[2.5px] rounded-full ${
                isTheme ? "bg-indigo-500" : "bg-indigo-500"
              }`}
            />
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke={
              tab === "recv"
                ? isTheme
                  ? "white"
                  : "#6366f1"
                : isTheme
                  ? "#c4c9de"
                  : "#9097b0"
            }
            className="size-4 mr-2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 3.75H6.912a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859M12 3v8.25m0 0-3-3m3 3 3-3"
            />
          </svg>
          <span className="text-sm font-semibold">Receive</span>
          {/* Active indicator bar */}
          {tab === "recv" && (
            <span
              className={`absolute bottom-0 left-[0%] right-[0%] h-[2.5px] rounded-full ${
                isTheme ? "bg-indigo-500" : "bg-indigo-500"
              }`}
            />
          )}
        </div>

        <SidePanel
          setOpenSettings={setOpenSettings}
          openSettings={openSettings}
        />
      </nav>

      <Dialog
        open={open}
        handler={handleCancel}
        className={
          isTheme
            ? "!bg-[#1a1d2a] text-white border border-[#2a2d3e]"
            : "bg-white text-[#1a1d2e]"
        }
        {...({} as any)}
      >
        <DialogHeader
          className={isTheme ? "text-white" : "text-[#1a1d2e]"}
          {...({} as any)}
        >
          Are you sure you want to stop{" "}
          {tab === "send" ? "Sharing" : "Receiving"}
        </DialogHeader>
        <DialogBody
          className={isTheme ? "!text-[#c4c9de]" : "text-[#5b6178]"}
          {...({} as any)}
        >
          Clicking confirm will stop {tab === "send" ? "Sharing" : "Receiving"}{" "}
          and you will have to restart the server
        </DialogBody>
        <DialogFooter {...({} as any)}>
          <Button
            variant="text"
            color="red"
            onClick={handleCancel}
            className="mr-1"
            {...({} as any)}
          >
            <span>Cancel</span>
          </Button>
          <Button
            variant="gradient"
            color="green"
            onClick={handleConfirm}
            {...({} as any)}
          >
            <span>Confirm</span>
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
