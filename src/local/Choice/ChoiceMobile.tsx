import send from "./Send.svg";
import receive from "./Receive.svg";
import lightBack from "../images/lightBack.svg";
import darkBack from "../images/darkBack.svg";
import { ToggleThemeButton, ProfileButton } from "./Navigation";
import { useTheme } from "./Theme";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { SendLogic } from "../Send/SendLogic";
import { SharedText, SharedFiles } from "../types";

export default function ChoiceMobile() {
  const { isTheme } = useTheme();
  const navigate = useNavigate();
  const { proceedWithSend } = SendLogic();

  const hasRun = useRef(false);

  useEffect(() => {
    if (!hasRun.current) {
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
    <div
      className={`${
        isTheme ? `bg-mobile-dark-background` : `bg-mobile-light-background`
      } || min-h-screen ${isTheme ? `text-[#C9C9C9]` : `text-black`}
        `}
    >
      <nav className="flex justify-between items-center p-6">
        <img
          src={isTheme ? darkBack : lightBack}
          alt="back"
          className="h-[40px]"
        />
        <div className="flex items-center gap-4">
          <ProfileButton />
          <ToggleThemeButton />
        </div>
      </nav>

      <div className="flex flex-col justify-evenly items-center h-[82vh]">
        <div className="text-center font-bold text-[35px] font-[Secular One]">
          Share Files
        </div>
        <div>
          <div
            className={`${isTheme ? `bg-[#577E6E]` : `bg-[#8DEDC280]`} ||
                w-[25vh] h-[25vh] rounded-[25vh] | flex flex-col justify-center items-center
                ${
                  isTheme ? `border-[#64C19780]` : `border-[#8DEDC280]`
                } border-8
                `}
            onClick={() => navigate("/send", { replace: true })}
          >
            <img src={send} alt="" className="h-3/5 w-3/5" />
          </div>
          <div className="text-center mt-1">
            <p className="font-semibold text-[18px]">Send</p>
            <p className="font-light">Share Files with Ease</p>
          </div>
        </div>
        <div>
          <div
            className={`${isTheme ? `bg-[#5B688E]` : `bg-[#A4B7EF]`} ||
                w-[25vh] h-[25vh] rounded-[25vh] | flex justify-center items-center
                ${
                  isTheme ? `border-[#8095E780]` : `border-[#ABC6EB80]`
                } border-8
                `}
            onClick={() => navigate("/receive", { replace: true })}
          >
            <img src={receive} alt="" className="h-3/5 w-3/5" />
          </div>
          <div className="text-center mt-1">
            <p className="font-semibold text-[18px]">Receive</p>
            <p className="font-light">Retrieve Files in No Time</p>
          </div>
        </div>
      </div>
    </div>
  );
}
