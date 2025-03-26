import { ToggleThemeButton } from "../Choice/Navigation";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../Choice/Theme";
import lightBack from "../images/lightBack.svg";
import darkBack from "../images/darkBack.svg";

const SendConfirmation: React.FC = () => {
  const navigate = useNavigate();
  const { isTheme } = useTheme();

  return (
    <div
      className={`min-h-screen flex flex-col  ${
        isTheme ? "bg-dark-background" : "bg-light-background"
      }`}
    >
      <nav className="flex justify-between p-6">
        <img
          src={isTheme ? darkBack : lightBack}
          alt="back"
          className="h-[40px]"
          onClick={() => navigate("/send", { replace: true })}
        />
        <ToggleThemeButton />
      </nav>
      <div className=" flex flex-col items-center justify-center mt-24">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">
            The following file will be sent:
          </h2>
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
              <span className="text-gray-700">A few seconds</span>
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-4">
            <button
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition duration-300"
              onClick={() => navigate("/send", { replace: true })}
            >
              Cancel
            </button>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition duration-300"
              onClick={() => navigate("/send/qrcode", { replace: true })}
            >
              Proceed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendConfirmation;
