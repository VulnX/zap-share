import React, { createContext, useContext, useState } from "react";

interface FileListContextType {
  fileList: string[];
  setFileList: React.Dispatch<React.SetStateAction<string[]>>;
}

const FileListContext = createContext<FileListContextType | undefined>(
  undefined,
);

export const FileListProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [fileList, setFileList] = useState<string[]>([]);

  return (
    <FileListContext.Provider value={{ fileList, setFileList }}>
      {children}
    </FileListContext.Provider>
  );
};

export function useFileListContext() {
  const ctx = useContext(FileListContext);
  if (!ctx)
    throw new Error(
      "useFileListContext must be used within a FileListProvider",
    );
  return ctx;
}
