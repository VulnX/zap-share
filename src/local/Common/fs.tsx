import { invoke } from "@tauri-apps/api/core";

async function fileName(filepath: string | URL): Promise<string> {
    return await invoke('plugin:fs|file_name', {filepath});
}

export default fileName;