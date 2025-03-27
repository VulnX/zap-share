import { ToggleThemeButton } from "../Choice/Navigation";
import { useNavigate } from "react-router-dom";
import lightBack from "../images/lightBack.svg";
import darkBack from "../images/darkBack.svg";
import darksend from "../images/darksend.svg";
import lightsend from "../images/lightsend.svg";
import { SendLogic } from "./SendLogic";
import { useTheme } from "../Choice/Theme";

export function SendMobile() {
  const navigate = useNavigate();
  const { openFileSelector } = SendLogic();
  const { isTheme } = useTheme();
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
    </div>
  );
}
