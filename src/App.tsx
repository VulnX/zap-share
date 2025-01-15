// import { useState } from "react";
// import reactLogo from "./assets/react.svg";
// import { invoke } from "@tauri-apps/api/core";

import "./App.css";
import Choice from "./assets/Choice";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Send from "./assets/Send";
import Recieve from "./assets/Recieve";
import { ThemeProvider } from './assets/Theme';
function App() {

  return (
    <div>
      <ThemeProvider>
        <Router>
          <Routes>
            {/* <Route path='/' element={}></Route> */}
            <Route path='/' element={<Choice />}></Route>
            <Route path='/send' element={<Send />}></Route>
            <Route path='/receive' element={<Recieve />}></Route>
          </Routes>
        </Router>
      </ThemeProvider>
    </div>
  );
}

export default App;
