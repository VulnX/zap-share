import { listen, TauriEvent } from "@tauri-apps/api/event";
import Navigation, { ToggleThemeButton } from "../Choice/Navigation";
import { useNavigate } from "react-router-dom";
import ProgressBar from "./ProgressBar";
import { useContext, useEffect, useState } from "react";
import { DeviceProvider } from "../../App";
import lightBack from "../images/lightBack.svg";
import darkBack from "../images/darkBack.svg";
import darksend from "../images/darksend.svg";
import lightsend from "../images/lightsend.svg";
import { GetIP } from "./IP";
import SendConfirmation from "./SendConfirmation";
interface SendUIProps {
  isTheme: boolean;
  qrCode: string | null;
  openFileSelector: () => void;
  setQrCode: (arg0: string) => void;
}

export function SendDesktop({
  isTheme,
  qrCode,
  openFileSelector,
  setQrCode,
}: SendUIProps) {
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState<boolean>(false);

  useEffect(() => {
    const setupDragEvents = async () => {
      const dragEnterUnlisten = await listen<TauriEvent>(
        TauriEvent.DRAG_ENTER,
        (event) => {
          console.log("Drag entered", event.payload);
        }
      );
      const dragLeaveUnlisten = await listen<TauriEvent>(
        TauriEvent.DRAG_LEAVE,
        (event) => {
          console.log("Drag left", event.payload);
        }
      );
      const dragOverUnlisten = await listen<TauriEvent>(
        TauriEvent.DRAG_OVER,
        (event) => {
          console.log("Dragging over", event.payload);
        }
      );
      const dragDropUnlisten = await listen<TauriEvent>(
        TauriEvent.DRAG_DROP,
        (event) => {
          console.log("File dropped", event.payload);

          // idk why error occurs here
          const { paths } = event.payload;
          setConfirm(true);
          GetIP(paths[0], setQrCode);
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
        {qrCode ? (
          // <div className="flex flex-col items-center mt-[15vh]">
          //   <div
          //     className={`${
          //       isTheme ? "bg-dark-qrBg" : "bg-light-qrBg"
          //     } mb-10 rounded-2xl`}
          //   >
          //     <img
          //       src={qrCode}
          //       alt="QR Code"
          //       className="w-64 h-64 mix-blend-multiply"
          //     />
          //   </div>
          //   <ProgressBar />
          // </div>
          <SendConfirmation/>
        ) : confirm ? (
          <div className={` ${isTheme ? `text-[#C9C9C9]` : `text-black`}`}>
            <p>File Name : {}</p>
            <p>File Size : {}</p>
            <div className="flex">
              <button className="bg-red-300">Cancel</button>
              <button className="bg-green-300">Proceed</button>
            </div>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}

export function SendMobile({ isTheme, qrCode, openFileSelector }: SendUIProps) {
  const navigate = useNavigate();
  return (
    <div
      className={`${
        isTheme ? `bg-mobile-dark-background` : `bg-mobile-light-background`
      } || min-h-screen ${isTheme ? `text-[#C9C9C9]` : `text-black`}
        `}
    >
      <nav className="flex justify-between p-6">
        <img
          src={isTheme ? darkBack : lightBack}
          alt="back"
          className="h-[40px]"
          onClick={() => navigate("/", { replace: true })}
        />
        <ToggleThemeButton />
      </nav>

      {qrCode ? (
        <div className="flex flex-col items-center mt-[15vh]">
          <div
            className={`${
              isTheme ? "bg-dark-qrBg" : "bg-light-qrBg"
            } mb-10 rounded-2xl`}
          >
            <img
              src={qrCode}
              alt="QR Code"
              className="w-64 h-64 mix-blend-multiply"
            />
          </div>
          <ProgressBar />
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <p className="text-[24px] mt-[12vh]">Click here to Select Files</p>
          <div
            className={`h-[30vh] w-[54vw] flex items-center justify-center || ${
              isTheme ? `bg-[#3C3C3C]` : `bg-[#D6FEFF]`
            } ${
              isTheme ? `border-[#919191]` : `border-[#A1F3FF]`
            } border-4 rounded-[20px] mt-[4vh]`}
            onClick={openFileSelector}
          >
            <div
              className={`h-[25vh] w-[45vw] ${
                isTheme ? `bg-[#A1A1A1]` : `bg-[#A1F3FF]`
              } || flex items-center justify-center rounded-[12px]`}
            >
              <img
                src={isTheme ? darksend : lightsend}
                alt=""
                className="w-[37vw]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SendUI({
  isTheme,
  qrCode,
  openFileSelector,
  setQrCode,
}: SendUIProps) {
  const isMobile = useContext(DeviceProvider)?.isMobile;

  return isMobile ? (
    <SendMobile
      isTheme={isTheme}
      qrCode={qrCode}
      openFileSelector={openFileSelector}
      setQrCode={setQrCode}
    />
  ) : (
    <SendDesktop
      isTheme={isTheme}
      qrCode={qrCode}
      openFileSelector={openFileSelector}
      setQrCode={setQrCode}
    />
  );
}
