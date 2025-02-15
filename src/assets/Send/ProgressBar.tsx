import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

export default function ProgressBar() {
    const [prog, setProg] = useState<number | null>(null);

    useEffect(() => {
        // Set up the listener on component mount
        const setupListener = async () => {
            try {
                const unlisten = await listen("progress-update", (event) => {
                    console.log(event.payload);
                    setProg(event.payload as number);
                });

                console.log("Listening for progress updates");

                // Return the cleanup function (unlisten) to be used when the component unmounts
                return unlisten;
            } catch (error) {
                console.error("Error loading progress:", error);
            }
        };

        // Call the async function and handle cleanup correctly
        const unlistenPromise = setupListener();

        // Cleanup listener when the component unmounts
        return () => {
            unlistenPromise.then((unlisten) => {
                if (unlisten) unlisten(); // Remove event listener
            });
        };
    }, []); // Empty dependency array ensures this effect runs only once on mount

    useEffect(() => {
        console.log("Progress updated:", prog); // Log when prog changes
    }, [prog]);

    return (
        <div className="h-10 w-[50vw]">
            <span id="ProgressLabel" className="sr-only">
                Loading
            </span>
            <div
                role="progressbar"
                aria-labelledby="ProgressLabel"
                aria-valuenow={prog ?? 0} // Dynamically set aria-valuenow to the value of prog, fallback to 0 if null
                className="block rounded-full bg-gray-200"
            >
                <div
                    className="block h-4 rounded-full text-center text-[10px]/4 bg-[repeating-linear-gradient(45deg,_var(--tw-gradient-from)_0,_var(--tw-gradient-from)_20px,_var(--tw-gradient-to)_20px,_var(--tw-gradient-to)_40px)] from-gray-500 to-gray-600"
                    style={{ width: `${prog ?? 0}%` }} // Apply the width of the progress bar dynamically based on prog
                >
                    <span className="font-bold text-white text-[12px]"> {prog ?? 0}% </span>
                </div>
            </div>
        </div>
    );
}
