import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { Progress, Typography } from "@material-tailwind/react";

export default function ProgressBar() {
    const [prog, setProg] = useState<number | undefined>(undefined);

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
            <div className="mb-2 flex items-center justify-between gap-4">
                <Typography color="blue-gray" variant="h6" placeholder={undefined} onPointerEnterCapture={undefined} onPointerLeaveCapture={undefined}>
                    Completed
                </Typography>
                <Typography color="blue-gray" variant="h6" placeholder={undefined} onPointerEnterCapture={undefined} onPointerLeaveCapture={undefined}>
                    {prog}%
                </Typography>
            </div>
            <Progress value={prog} style={{ transition: "0.1s" }} placeholder={undefined} onPointerEnterCapture={undefined} onPointerLeaveCapture={undefined} />

        </div>
    );
}
