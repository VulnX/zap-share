import { useTheme } from "../Context/Theme";
import { basename } from "@tauri-apps/api/path";
import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-fs";
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Button,
  Typography,
} from "@material-tailwind/react";
import { formatBytes } from "../Utils/format";

interface SendConfirmationDialogProps {
  isOpen: boolean;
  fileList: string[];
  onCancel: () => void;
  onProceed: () => void;
  isLoading?: boolean;
}

const SendConfirmationDialog: React.FC<SendConfirmationDialogProps> = ({
  isOpen,
  fileList,
  onCancel,
  onProceed,
  isLoading = false,
}) => {
  const { isTheme } = useTheme();
  const [fileNames, setFileNames] = useState("");
  const [totalSize, setTotalSize] = useState("");

  useEffect(() => {
    if (!isOpen || fileList.length === 0) return;

    const getNameAndSize = async () => {
      const names = await Promise.all(
        fileList.map(async (filePath) => await basename(filePath)),
      );
      setFileNames(names.join(", "));
      const sizes = await Promise.all(
        fileList.map(async (filePath) => {
          const file = await open(filePath);
          const stat = await file.stat();
          return stat.size;
        }),
      );
      const total = sizes.reduce((sum, size) => sum + size, 0);
      setTotalSize(formatBytes(total));
    };

    getNameAndSize();
  }, [isOpen, fileList]);

  return (
    <Dialog
      open={isOpen}
      handler={isLoading ? () => { } : onCancel}
      className={
        isTheme
          ? "!bg-[#1a1d2a] text-white border border-[#2a2d3e]"
          : "bg-white text-[#1a1d2e]"
      }
      {...({} as any)}
    >
      <DialogHeader
        className={isTheme ? "text-white" : "text-[#1a1d2e]"}
        {...({} as any)}
      >
        Confirm File Transfer
      </DialogHeader>
      <DialogBody
        className={`space-y-4 ${isTheme ? "!text-[#c4c9de]" : "text-[#5b6178]"}`}
        {...({} as any)}
      >
        <div className="space-y-3">
          <div>
            <Typography
              className={`font-medium ${isTheme ? "text-slate-200" : "text-[#1a1d2e]"}`}
              color="inherit"
              placeholder={undefined}
              {...({} as any)}
            >
              File name:{" "}
            </Typography>
            <Typography
              className={isTheme ? "text-[#c4c9de]" : "text-[#5b6178]"}
              color="inherit"
              {...({} as any)}
            >
              {fileNames}
            </Typography>
          </div>
          <div>
            <Typography
              className={`font-medium ${isTheme ? "text-slate-200" : "text-[#1a1d2e]"}`}
              color="inherit"
              {...({} as any)}
            >
              File size:{" "}
            </Typography>
            <Typography
              className={isTheme ? "text-[#c4c9de]" : "text-[#5b6178]"}
              color="inherit"
              {...({} as any)}
            >
              {totalSize}
            </Typography>
          </div>
          <div>
            <Typography
              className={`font-medium ${isTheme ? "text-slate-200" : "text-[#1a1d2e]"}`}
              color="inherit"
              placeholder={undefined}
              {...({} as any)}
            >
              Estimated transfer time:{" "}
            </Typography>
            <Typography
              className={isTheme ? "text-[#c4c9de]" : "text-[#5b6178]"}
              color="inherit"
              {...({} as any)}
            >
              A few seconds
            </Typography>
          </div>
        </div>
      </DialogBody>
      <DialogFooter className="space-x-2" {...({} as any)}>
        <Button
          color="red"
          onClick={onCancel}
          disabled={isLoading}
          placeholder={undefined}
          {...({} as any)}
        >
          Cancel
        </Button>
        <Button
          color="blue"
          onClick={onProceed}
          disabled={isLoading}
          loading={isLoading}
          {...({} as any)}
        >
          Proceed
        </Button>
      </DialogFooter>
    </Dialog>
  );
};

export default SendConfirmationDialog;
