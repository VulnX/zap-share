// import { useState } from "react";
// import reactLogo from "./assets/react.svg";
// import { invoke } from "@tauri-apps/api/core";
import logo from './images/a6cc6028300b7e1165a46f9b41bec24c.png';
import send from './images/send.png'
import receive from './images/receive.png'
import "./App.css";

function App() {

  return (
    <div className='min-h-screen flex flex-col bg-stone-100'>

      {/* Navigation Bar */}
      <nav className='flex w-full'>
        <div className="flex w-10/12">
          <img src={logo} alt="Zap Share" className='h-36 w-36' />
          <div className="flex flex-col pt-5">
            <p className='text-5xl font-bold'>ZAP SHARE</p>
            <p className='text-2xl italic'>Lightning-fast sharing, minus the drama!</p>
          </div>
        </div>
        <div className="flex w-2/12 items-center justify-center">
          <button className='bg-black text-white h-10 w-1/2 rounded'>Theme</button>
        </div>
      </nav>



      {/* Send-Recieve Button */}
      <div className="flex items-center justify-evenly  flex-grow mt-16">
        <div className="send ||  bg-gray-200 w-[40vh] h-[40vh] rounded-full || flex items-center justify-center"><img src={send} alt="Send" className='mr-3 mt-3' /></div>
        <div className="recieve ||  bg-gray-200 w-[40vh] h-[40vh] rounded-full || flex items-center justify-center"><img src={receive} alt="Receive" className=' h-[28vh] ml-4' /></div>
      </div>

      <div className="h-[5vh] bg-gray-300"></div>
    </div>
  );
}

export default App;
