import React from "react"; 
import { SendLogic } from "./SendFunction"; 
import { listen } from "@tauri-apps/api/event";

export function DragDrop() {
  const {
    qrCode,
    openFileSelector,
    dragOver,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleFileDrop,
  } = SendLogic(); 

  function callme() {
    listen('tauri://drag-enter', (event) => {
        console.log('drag enter');
        console.log(event);
      });
    
      listen('tauri://drag-drop', (event) => {
        console.log('drag drop');
        console.log(event);
      });
    
      listen('tauri://drag-leave', (event) => {
        console.log('drag leave');
        console.log(event);
      });
    
      listen('tauri://drag-over', (event) => {
        console.log('drag over');
        console.log(event);
      });
  }

  return (
    <div
      className="drag-drop-area"
    //   onDragEnter={handleDragEnter}
    //   onDragOver={handleDragOver}
    //   onDragLeave={handleDragLeave}
    //   onDrop={handleFileDrop}
      style={{
        padding: "20px",
        textAlign: "center",
        border: dragOver ? "2px dashed #007bff" : "2px solid transparent", // Visual cue for drag over
        borderRadius: "8px",
      }}
    >
      <h3>Drag & Drop your file here</h3>
      {qrCode ? (
        <img src={qrCode} alt="Generated QR code" />
      ) : (
        <p>No QR code generated yet.</p> // Show a fallback message until QR code is generated
      )}
      <button onClick={callme}>Select a file</button>
    </div>
  );
}
