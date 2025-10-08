import { listen, TauriEvent } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "../Choice/Navigation";
import { SendLogic } from "./SendLogic";
import { useTheme } from "../Choice/Theme";

interface DragDropPayload {
  paths: string[];
}

const FilePicker = () => {
  const { isTheme } = useTheme();
  const { openFileSelector } = SendLogic();
  return (
    <div className="mt-[10vh] min-w-screen flex justify-center items-center">
      <div
        className={`h-[60vh] w-[40vw] flex flex-col justify-center items-center ${
          isTheme ? "bg-dark-filepicker" : "bg-light-filepicker"
        } rounded-[10vh] drop-shadow-xl shadow-xl clickable
                      `}
        onClick={openFileSelector}
      >
        <div
          className={`border-[1px] border-dashed border-black rounded-[8vh] w-[35vw] h-[50vh] flex flex-col items-center`}
        >
          <svg
            width="30vw"
            height="40vh"
            viewBox="0 0 268 260"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M203.679 80.5422C193.985 63.7571 174.904 54.1292 154.443 57.299C146.411 40.9421 129.608 30.5552 110.713 30.5552C83.9683 30.5552 62.2083 51.6645 62.2083 77.6152C62.2083 78.6863 62.2519 79.7902 62.351 80.9398C39.2682 86.0429 22.3342 106.262 22.3342 129.547C22.3342 157.064 45.4086 179.446 73.7721 179.446H114.43V171.205H73.7721C50.0919 171.205 30.8339 152.518 30.8339 129.548C30.8339 108.988 46.6553 91.2798 67.645 88.3657C68.7708 88.2109 69.7829 87.6231 70.4577 86.7327C71.1288 85.847 71.419 84.7337 71.2364 83.6474C70.8773 81.4138 70.6959 79.4453 70.6959 77.6187C70.6959 56.2103 88.6552 38.7953 110.714 38.7953C127.284 38.7953 141.899 48.4853 147.962 63.4779C148.723 65.3795 150.804 66.4506 152.869 65.9883C171.521 61.8026 189.047 70.5436 197.131 86.1286C197.745 87.3334 198.948 88.1651 200.325 88.354C221.326 91.2551 237.183 108.965 237.183 129.545C237.183 152.515 217.911 171.201 194.231 171.201H140.102V179.443H194.228C222.595 179.443 245.666 157.06 245.666 129.544C245.666 105.599 227.762 84.9003 203.679 80.5422Z"
              fill={isTheme ? "#000000" : "#626060"}
              stroke="#808080"
              strokeWidth="0.00189097"
            />
            <path
              d="M153.639 127.485C155.339 125.839 155.339 123.177 153.639 121.531L129.4 98.0124C128.552 97.1935 127.448 96.7864 126.336 96.7864L126.258 96.7993C126.237 96.7993 126.215 96.7864 126.193 96.7864C125.067 96.7864 123.956 97.2099 123.129 98.0124L98.8901 121.532C97.1936 123.178 97.1936 125.84 98.8901 127.486C100.587 129.135 103.33 129.135 105.027 127.486L121.848 111.165V225.225C121.848 227.56 123.787 229.445 126.193 229.445C128.586 229.445 130.534 227.56 130.534 225.225V111.019L147.503 127.485C149.194 129.135 151.942 129.135 153.639 127.485Z"
              fill={isTheme ? "#000000" : "#626060"}
              stroke="#808080"
              strokeWidth="0.00189097"
            />
          </svg>
          <p className="text-[18px] text-center mb-4 w-[30vw]">
            Click to Browse or Drag Files Here to Start Sharing
          </p>
        </div>
      </div>
    </div>
  );
};

const TextSender = () => {
  const { proceedWithSend } = SendLogic();
  const { isTheme } = useTheme();
  const [text, setText] = useState<string>("");
  const navigate = useNavigate();

  return (
    <div className="mt-[10vh] min-w-screen mx-auto flex flex-col items-center">
      <div className="w-[80vw]">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={`w-full h-[50vh] p-4 rounded-lg resize-none outline-none  ${
            isTheme ? "focus:ring-0" : "focus:ring-0"
          }`}
          placeholder="Type your message here..."
        />
      </div>
      <button
        onClick={() => {
          proceedWithSend(null, text);
          navigate("/send/qrcode", { replace: true });
        }}
        className={`mt-4 px-8 py-3 bg-gray-600 text-white rounded-lg font-medium hover:shadow-lg transition-all ${
          isTheme ? "hover:bg-gray-500" : "hover:bg-gray-800"
        }`}
      >
        Send
      </button>
    </div>
  );
};

export default function SendDesktop() {
  const { proceedWithSend } = SendLogic();
  const { isTheme } = useTheme();
  const navigate = useNavigate();
  const hasRun = useRef(false);
  const [sendFile, setSendFile] = useState<boolean>(false);

  useEffect(() => {
    if (!hasRun.current) {
      const setupDragEvents = async () => {
        const dragEnterUnlisten = await listen<TauriEvent>(
          TauriEvent.DRAG_ENTER,
          () => {
            //   console.log("Drag entered", event.payload);
          }
        );
        const dragLeaveUnlisten = await listen<TauriEvent>(
          TauriEvent.DRAG_LEAVE,
          () => {
            //   console.log("Drag left", event.payload);
          }
        );
        const dragOverUnlisten = await listen<TauriEvent>(
          TauriEvent.DRAG_OVER,
          () => {
            //   console.log("Dragging over", event.payload);
          }
        );
        const dragDropUnlisten = await listen<DragDropPayload>(
          TauriEvent.DRAG_DROP,
          (event) => {
            console.log("File dropped", event.payload);

            // idk why error occurs here
            const { paths } = event.payload;
            proceedWithSend(paths, null);
            navigate("/send/confirm", { replace: true });
          }
        );

        return () => {
          dragEnterUnlisten();
          dragLeaveUnlisten();
          dragOverUnlisten();
          dragDropUnlisten();
        };
      };

      setupDragEvents();
      hasRun.current = true;
    }
  }, []);

  return (
    <div>
      <div
        className={`min-h-screen flex flex-col  ${
          isTheme ? "bg-dark-background" : "bg-light-background"
        }`}
      >
        {/* Navigation Bar */}
        <nav className="flex items-center  h-[20vh]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="35px"
            viewBox="0 -960 960 960"
            width="35px"
            fill={isTheme ? "#FFFFFF" : "#000000"}
            className={`ml-10 rounded-full ${
              isTheme ? "hover:bg-zinc-700" : "hover:bg-neutral-200"
            }  clickable`}
            onClick={() => navigate("/", { replace: true })}
          >
            <path d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z" />
          </svg>
          <div className="w-full">
            <Navigation />
          </div>
        </nav>

        {/* QR Code or File Picker */}

        {/* Switch for text and file sending */}
        <div
          className={`flex space-x-6 ${
            isTheme ? "bg-gray-300" : "bg-gray-100"
          } rounded-full p-2 shadow-md mb-2 w-40 mx-auto font-semibold`}
        >
          <div
            className={`cursor-pointer px-4 py-1 rounded-full transition-colors ${
              sendFile ? "bg-gray-200 text-gray-800" : "text-gray-500"
            }`}
            onClick={() => setSendFile(true)}
          >
            File
          </div>
          <div
            className={`cursor-pointer px-4 py-1 rounded-full transition-colors ${
              !sendFile ? "bg-gray-200 text-gray-800" : "text-gray-500"
            }`}
            onClick={() => setSendFile(false)}
          >
            Text
          </div>
        </div>

        {sendFile ? <FilePicker /> : <TextSender />}
      </div>
    </div>
  );
}
