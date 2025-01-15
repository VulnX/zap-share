import { useNavigate } from "react-router-dom";
import { useTheme } from "./Theme"
import { ToggleThemeButton } from "./Navigation";

export default function Recieve() {

    const navigate = useNavigate();
    const { isTheme } = useTheme();
    return (
        <div className={`min-h-screen flex flex-col  ${isTheme ? ' bg-zinc-900' : ' bg-neutral-300 '}`}>
            <nav className="flex items-center justify-between || h-[15vh]">
                <svg xmlns="http://www.w3.org/2000/svg" height="35px" viewBox="0 -960 960 960" width="35px" fill={isTheme ? '#FFFFFF' : ' #000000'} className={`ml-10 rounded-full ${isTheme ? 'hover:bg-zinc-700' : 'hover:bg-neutral-200'}`}
                    onClick={() => navigate('/')}>
                    <path d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z" />
                </svg>
                <div className="mr-10">
                    <ToggleThemeButton />
                </div>
            </nav>
        </div>
    )
}
