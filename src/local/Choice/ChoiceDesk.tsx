import { useNavigate } from "react-router-dom";
import send from '../images/send.png'
import receive from '../images/receive.png'
import Navigation from './Navigation';
import { useTheme } from './Theme';




export default function ChoiceDesk() {

    const { isTheme } = useTheme();
    const navigate = useNavigate();

    return (
        <div>
            <div className={`min-h-screen flex flex-col  ${isTheme ? ' bg-dark-background' : ' bg-light-background '}`}>

                {/* Navigation Bar */}
                <Navigation />


                {/* Send-Recieve Button */}
                <div className="flex mt-[10vh] justify-evenly  flex-grow">
                    <div className={`send || clickable
    bg-gray-200 w-[40vh] h-[40vh] rounded-full || flex items-center justify-center
     ${isTheme ? ' bg-gray-700' : ' bg-light-choiceBg'} 
     border-4 ${isTheme ? ' border-gray-300' : ' border-light-choiceBorder'}`}
                        onClick={() => navigate('/send', { replace: true })}
                    >
                        <img src={send} alt="Send" className='mr-3 mt-3' />
                    </div>
                    <div className={`recieve clickable ||  bg-gray-200 w-[40vh] h-[40vh] rounded-full || flex items-center justify-center ${isTheme ? ' bg-gray-700' : ' bg-light-choiceBg'} 
 border-4  ${isTheme ? ' border-gray-300' : ' border-light-choiceBorder'}`}
                        onClick={() => navigate('/receive', { replace: true })}
                    >
                        <img src={receive} alt="Receive" className=' h-[28vh] ml-4' />
                    </div>
                </div>

                <div className={`h-[5vh] ${isTheme ? ' bg-dark-footer' : ' bg-light-footer'}`}></div>
            </div>
        </div>
    )
}
