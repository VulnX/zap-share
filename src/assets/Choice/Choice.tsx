import send from '../images/send.png'
import receive from '../images/receive.png'
import Navigation from './Navigation';
import { useNavigate } from 'react-router-dom';
import { useTheme } from './Theme';


export default function Choice() {

    const { isTheme } = useTheme();
    const navigate = useNavigate();

    return (
        <div>
            <div className={`min-h-screen flex flex-col  ${isTheme ? ' bg-zinc-900' : ' bg-neutral-300 '}`}>

                {/* Navigation Bar */}
                <Navigation />


                {/* Send-Recieve Button */}
                <div className="flex mt-[10vh] justify-evenly  flex-grow">
                    <div className={`send || 
                        bg-gray-200 w-[40vh] h-[40vh] rounded-full || flex items-center justify-center
                         ${isTheme ? ' bg-neutral-700' : ' bg-gray-300'} 
                         border-4 ${isTheme ? ' border-neutral-300' : ' border-gray-400'}`}
                        onClick={() => navigate('/send', { replace: true })}
                    >
                        <img src={send} alt="Send" className='mr-3 mt-3' />
                    </div>
                    <div className={`recieve ||  bg-gray-200 w-[40vh] h-[40vh] rounded-full || flex items-center justify-center ${isTheme ? ' bg-neutral-700' : ' bg-gray-300'} 
                     border-4  ${isTheme ? ' border-neutral-300' : ' border-gray-400'}`}
                        onClick={() => navigate('/receive', { replace: true })}
                    >
                        <img src={receive} alt="Receive" className=' h-[28vh] ml-4' />
                    </div>
                </div>

                <div className={`h-[5vh] ${isTheme ? ' bg-neutral-700' : ' bg-gray-400'}`}></div>
            </div>
        </div>
    )
}
