import { useTheme } from "./Theme";
import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { DeviceConfig } from "../types";
import {
  Button,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@material-tailwind/react";

export function ToggleThemeButton() {
  const { isTheme, toggleTheme } = useTheme();

  return (
    <div>
      <label
        htmlFor="AcceptConditions"
        className="relative inline-block h-10 w-20 cursor-pointer rounded-full bg-gray-200 transition [-webkit-tap-highlight-color:_transparent] has-[:checked]:bg-gray-700"
      >
        <input
          type="checkbox"
          id="AcceptConditions"
          className="peer sr-only"
          checked={isTheme}
          onChange={toggleTheme}
        />

        <span className="absolute inset-y-0 start-0 z-10 m-1 inline-flex size-8 items-center justify-center rounded-full bg-white text-gray-400 transition-all shadow-xl  peer-checked:start-10 peer-checked:text-black  peer-checked:bg-gray-900">
          <svg
            className={`dark-mode-icon ${isTheme ? "block" : "hidden"}`}
            xmlns="http://www.w3.org/2000/svg"
            height="24px"
            viewBox="0 -960 960 960"
            width="24px"
            fill="#FFFFFF"
          >
            <path d="M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q14 0 27.5 1t26.5 3q-41 29-65.5 75.5T444-660q0 90 63 153t153 63q55 0 101-24.5t75-65.5q2 13 3 26.5t1 27.5q0 150-105 255T480-120Zm0-80q88 0 158-48.5T740-375q-20 5-40 8t-40 3q-123 0-209.5-86.5T364-660q0-20 3-40t8-40q-78 32-126.5 102T200-480q0 116 82 198t198 82Zm-10-270Z" />
          </svg>
          <svg
            className={`light-mode-icon ${isTheme ? "hidden" : "block"}`}
            xmlns="http://www.w3.org/2000/svg"
            height="20px"
            viewBox="0 -960 960 960"
            width="20px"
            fill="#000000"
          >
            <path d="M480-360q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Zm0 80q-83 0-141.5-58.5T280-480q0-83 58.5-141.5T480-680q83 0 141.5 58.5T680-480q0 83-58.5 141.5T480-280ZM200-440H40v-80h160v80Zm720 0H760v-80h160v80ZM440-760v-160h80v160h-80Zm0 720v-160h80v160h-80ZM256-650l-101-97 57-59 96 100-52 56Zm492 496-97-101 53-55 101 97-57 59Zm-98-550 97-101 59 57-100 96-56-52ZM154-212l101-97 55 53-97 101-59-57Zm326-268Z" />
          </svg>
        </span>
      </label>
    </div>
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
        className={`p-2 rounded-full ${
          isTheme
            ? "bg-gray-700 text-white hover:bg-gray-600"
            : "bg-gray-200 text-black hover:bg-gray-300"
        } transition-colors flex items-center justify-center`}
        title={deviceName}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
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
          className={`absolute right-0 mt-2 py-2 px-4 rounded-lg shadow-lg ${
            isTheme ? "bg-gray-700 text-white" : "bg-white text-black"
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
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const handleTabSwitch = (newTab: string) => {
    if (canSwitch) {
      setTab(newTab);
      setCanSwitch(false);
    } else {
      setPendingTab(newTab);
      setOpen(true);
    }
  };
  const handleConfirm = () => {
    if (pendingTab) {
      setCanSwitch(true);
      setTab(pendingTab);
      setCanSwitch(false);
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
      <nav className="flex w-full">
        <div className=" bg-white py-2 px-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
          </svg>
        </div>
        <div
          className={`flex py-4 justify-center w-1/2 ${tab === "send" ? "bg-black text-white" : "bg-white text-black"}`}
          onClick={() => handleTabSwitch("send")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
            />
          </svg>
          Send
        </div>
        <div
          className={`flex py-4 justify-center w-1/2 ${tab === "recv" ? "bg-black text-white" : "bg-white text-black"}`}
          onClick={() => handleTabSwitch("recv")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            className="size-6"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 3.75H6.912a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859M12 3v8.25m0 0-3-3m3 3 3-3"
            />
          </svg>
          Receive
        </div>
      </nav>
      <Dialog
        open={open}
        handler={handleCancel}
        placeholder=""
        onPointerEnterCapture={() => {}}
        onPointerLeaveCapture={() => {}}
      >
        <DialogHeader
          placeholder=""
          onPointerEnterCapture={() => {}}
          onPointerLeaveCapture={() => {}}
        >
          Are you sure you want to stop{" "}
          {tab === "send" ? "Sharing" : " Receiving"}
        </DialogHeader>
        <DialogBody
          placeholder=""
          onPointerEnterCapture={() => {}}
          onPointerLeaveCapture={() => {}}
        >
          Clicking confirm will stop {tab === "send" ? "Sharing" : " Receiving"}{" "}
          and you will have to restart the server
        </DialogBody>
        <DialogFooter
          placeholder=""
          onPointerEnterCapture={() => {}}
          onPointerLeaveCapture={() => {}}
        >
          <Button
            variant="text"
            color="red"
            onClick={handleCancel}
            className="mr-1"
            placeholder=""
            onPointerEnterCapture={() => {}}
            onPointerLeaveCapture={() => {}}
          >
            <span>Cancel</span>
          </Button>
          <Button
            variant="gradient"
            color="green"
            onClick={handleConfirm}
            placeholder=""
            onPointerEnterCapture={() => {}}
            onPointerLeaveCapture={() => {}}
          >
            <span>Confirm</span>
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
