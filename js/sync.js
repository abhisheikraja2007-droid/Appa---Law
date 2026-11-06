import { exportEncryptedBackup, importEncryptedBackup, getAllItems, putItem } from './storage.js';

export async function syncWithLanServer(serverUrl, passcode) {
  const url = serverUrl.replace(/\/+$/, "") + "/sync";

  const localBackupBlob = await exportEncryptedBackup(passcode);
  const localBackupJson = JSON.parse(await localBackupBlob.text());

  const pushRes = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(localBackupJson)
  });

  if (!pushRes.ok) {
    throw new Error(`Server returned HTTP ${pushRes.status}`);
  }

  const pullRes = await fetch(url);
  if (!pullRes.ok) {
    throw new Error(`Failed to fetch from server: HTTP ${pullRes.status}`);
  }

  const serverData = await pullRes.json();
  if (serverData && serverData.ciphertext) {
    const serverBlob = new Blob([JSON.stringify(serverData)], { type: "application/json" });
    const restoreResult = await importEncryptedBackup(serverBlob, passcode);
    return {
      status: "synced",
      details: restoreResult
    };
  }

  return { status: "uploaded" };
}

