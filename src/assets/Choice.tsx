import { useState } from 'react'
import send from '../images/send.png'
import receive from '../images/receive.png'
import Navigation from './Navigation';

export default function Choice() {

    const [isDarkMode, setIsDarkMode] = useState(false);




    return (
        <div>
            <div className={`min-h-screen flex flex-col  ${isDarkMode ? ' bg-zinc-900' : ' bg-neutral-300 '}`}>

                {/* Navigation Bar */}
                <Navigation isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />


                {/* Send-Recieve Button */}
                <div className="flex items-center justify-evenly  flex-grow">
                    <div className={`send || 
                        bg-gray-200 w-[40vh] h-[40vh] rounded-full || flex items-center justify-center
                         ${isDarkMode ? ' bg-neutral-700' : ' bg-gray-300'} 
                         border-4 ${isDarkMode ? ' border-neutral-300' : ' border-gray-400'}`}>
                        <img src={send} alt="Send" className='mr-3 mt-3' />
                    </div>
                    <div className={`recieve ||  bg-gray-200 w-[40vh] h-[40vh] rounded-full || flex items-center justify-center ${isDarkMode ? ' bg-neutral-700' : ' bg-gray-300'} 
                     border-4  ${isDarkMode ? ' border-neutral-300' : ' border-gray-400'}`}>
                        <img src={receive} alt="Receive" className=' h-[28vh] ml-4' />
                    </div>
                </div>

                <div className={`h-[5vh] ${isDarkMode ? ' bg-neutral-700' : ' bg-gray-400'}`}></div>
            </div>
        </div>
    )
}
