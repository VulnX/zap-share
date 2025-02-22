import send from './Send.svg'
import receive from './Receive.svg'
import lightBack from '../images/lightBack.svg'
import darkBack from '../images/darkBack.svg'
import { ToggleThemeButton } from "./Navigation";
import { useTheme } from './Theme';


export default function ChoiceMobile() {

    const { isTheme } = useTheme()

    return (
        <div className={`${isTheme ? `bg-mobile-dark-background` : `bg-mobile-light-background`} || min-h-screen ${isTheme ? `text-[#C9C9C9]` : `text-black`}
        `}>
            <nav className="flex justify-between p-6">
                <img src={isTheme ? darkBack : lightBack} alt="back" className="h-[40px]" />
                <ToggleThemeButton />
            </nav>

            <div className="flex flex-col justify-evenly items-center h-[82vh]">
                <div className="text-center font-bold text-[35px] font-[Secular One]">
                    Share Files
                </div>
                <div>
                    <div className={`${isTheme ? `bg-[#577E6E]` : `bg-[#8DEDC280]`} ||
                w-[25vh] h-[25vh] rounded-[25vh] | flex flex-col justify-center items-center
                ${isTheme ? `border-[#64C19780]` : `border-[#8DEDC280]`} border-8
                `}>
                        <img src={send} alt="" className="h-3/5 w-3/5" />
                    </div>
                    <div className="text-center mt-1">
                        <p className="font-semibold text-[18px]">Send</p>
                        <p className="font-light">Share Files with Ease</p>
                    </div>
                </div>
                <div>
                    <div className={`${isTheme ? `bg-[#5B688E]` : `bg-[#A4B7EF]`} ||
                w-[25vh] h-[25vh] rounded-[25vh] | flex justify-center items-center
                ${isTheme ? `border-[#8095E780]` : `border-[#ABC6EB80]`} border-8
                `}

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
    )
}
