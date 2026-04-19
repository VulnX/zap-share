export type ProgressUpdatePayload = {
  id: string;
  filename: string;
  progress: number;
};

export type ServerConfiguration = {
  ip: string;
  port: number;
  name: string;
  type: string;
  encryption: boolean;
};

export type AppConfig = {
  fingerprint: string;
  device_name: string;
  preferred_port: number;
  encryption: boolean;
  nearby_share: boolean;
};

export type DeviceConfig = {
  fingerprint: string;
  name: string;
};

export interface SendFileResponse {
  Success: {
    ip: string | null;
    port: number;
    encryption: boolean;
  };
}
export interface SendTextResponse {
  Success: {
    ip: string | null;
    port: number;
    encryption: boolean;
  };
}

export interface SharedText {
  SharedText: string | null;
}
export interface SharedFiles {
  URIList: string | string[] | null;
}

export type TransferRequest = {
  id: string;
  device_name: string;
  type: "text"; // text only — files use BatchTransferRequest
  filename?: string;
  filesize?: number;
};

export type FileInfo = {
  id: string;
  filename: string;
  filesize: number;
};

export type BatchTransferRequest = {
  batch_id: string;
  device_name: string;
  files: FileInfo[];
};
