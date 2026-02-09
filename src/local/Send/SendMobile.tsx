import { ToggleThemeButton } from "../Common/Navigation";
import { useNavigate } from "react-router-dom";
import lightBack from "../images/lightBack.svg";
import darkBack from "../images/darkBack.svg";
import darksend from "../images/darksend.svg";
import lightsend from "../images/lightsend.svg";
import { SendLogic } from "./SendLogic";
import { useTheme } from "../Common/Theme";
import { useState } from "react";

export function SendMobile() {
  const navigate = useNavigate();
  const { openFileSelector, proceedWithSend } = SendLogic();
  const { isTheme } = useTheme();
  const [sendFile, setSendFile] = useState(true);
  const [text, setText] = useState("");
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

      <div className="flex flex-col items-center w-full px-6">
        <div className="flex space-x-6 bg-white rounded-full p-2 shadow-md mb-8">
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

        {sendFile ? (
          <>
            <p className="text-[24px] mt-[8vh]">Click here to Select Files</p>
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
          </>
        ) : (
          <div className="w-full mt-[8vh] flex flex-col items-center">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your message here..."
              className={`w-full h-[40vh] p-4 rounded-lg resize-none outline-none ${
                isTheme ? "bg-[#3C3C3C] text-white" : "bg-[#D6FEFF]"
              }`}
            />
            <button
              onClick={() => {
                proceedWithSend(null, text);
                navigate("/send/qrcode", { replace: true });
              }}
              className={`mt-6 px-8 py-3 bg-blue-500 text-white rounded-lg font-medium hover:shadow-lg transition-all ${
                isTheme ? "hover:bg-blue-600" : "hover:bg-blue-400"
              }`}
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
