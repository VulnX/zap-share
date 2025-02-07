import logo from '../images/a6cc6028300b7e1165a46f9b41bec24c.png'
import { useTheme } from './Theme';



export function ToggleThemeButton() {

    const { isTheme, toggleTheme } = useTheme();

    return (
        <div>
            <label
                htmlFor="AcceptConditions"
                className="relative inline-block h-10 w-20 cursor-pointer rounded-full bg-gray-200 transition [-webkit-tap-highlight-color:_transparent] has-[:checked]:bg-neutral-700"
            >
                <input
                    type="checkbox"
                    id="AcceptConditions"
                    className="peer sr-only"
                    checked={isTheme}
                    onChange={toggleTheme}
                />

                <span
                    className="absolute inset-y-0 start-0 z-10 m-1 inline-flex size-8 items-center justify-center rounded-full bg-white text-gray-400 transition-all shadow-xl  peer-checked:start-10 peer-checked:text-black  peer-checked:bg-neutral-900"
                >

                    <svg className={`dark-mode-icon ${isTheme ? 'block' : 'hidden'}`} xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF">
                        <path d="M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q14 0 27.5 1t26.5 3q-41 29-65.5 75.5T444-660q0 90 63 153t153 63q55 0 101-24.5t75-65.5q2 13 3 26.5t1 27.5q0 150-105 255T480-120Zm0-80q88 0 158-48.5T740-375q-20 5-40 8t-40 3q-123 0-209.5-86.5T364-660q0-20 3-40t8-40q-78 32-126.5 102T200-480q0 116 82 198t198 82Zm-10-270Z" />
                    </svg>
                    <svg
                        className={`light-mode-icon ${isTheme ? 'hidden' : 'block'}`} xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#000000">
                        <path d="M480-360q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Zm0 80q-83 0-141.5-58.5T280-480q0-83 58.5-141.5T480-680q83 0 141.5 58.5T680-480q0 83-58.5 141.5T480-280ZM200-440H40v-80h160v80Zm720 0H760v-80h160v80ZM440-760v-160h80v160h-80Zm0 720v-160h80v160h-80ZM256-650l-101-97 57-59 96 100-52 56Zm492 496-97-101 53-55 101 97-57 59Zm-98-550 97-101 59 57-100 96-56-52ZM154-212l101-97 55 53-97 101-59-57Zm326-268Z"
                        />
                    </svg>


                </span>
            </label>
        </div>
    )
}




export function LogoTitle() {

    const { isTheme } = useTheme();

    return (
        <div className='flex'>
            <img src={logo} alt="Zap Share" className='h-36 w-36' />
            <div className="flex flex-col pt-5">
                <p className={`text-5xl font-bold ${isTheme ? '  text-neutral-100' : 'text-black '}`}>ZAP SHARE</p>
                <p className={`text-2xl italic ${isTheme ? ' text-neutral-100' : 'text-black '}`}>Lightning-fast sharing, minus the drama!</p>
            </div>
        </div>
    )
}





export default function Navigation() {

    return (
        <div>
            <nav className='flex w-full'>
                <div className="flex w-10/12">
                    <LogoTitle />
                </div>
                <div className="flex w-2/12 items-center justify-center">
                    <ToggleThemeButton />
                </div>
            </nav>
        </div>
    )
}
