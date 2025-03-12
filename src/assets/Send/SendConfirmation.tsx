import React from 'react';

const SendConfirmation: React.FC = () => {
  return (
    <div className="bg-gray-100 flex items-center justify-center h-screen">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">The following file will be sent:</h2>
        <div className="space-y-4">
          <div>
            <span className="font-medium">File name:</span>
            <span className="text-gray-700"> banana_chips.exe</span>
          </div>
          <div>
            <span className="font-medium">File size:</span>
            <span className="text-gray-700"> 84 MiB</span>
          </div>
          <div>
            <span className="font-medium">Estimated transfer time:</span>
            <span className="text-gray-700"> A few seconds</span>
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-4">
          <button className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition duration-300">
            Cancel
          </button>
          <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition duration-300">
            Proceed
          </button>
        </div>
      </div>
    </div>
  );
};

export default SendConfirmation;