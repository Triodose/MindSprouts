/**
 * Google Drive REST API Client for MindSprouts
 * Handles directory creation, listing, reading, and writing .sprout files.
 */

const BASE_URL = 'https://www.googleapis.com/drive/v3';
const UPLOAD_BASE_URL = 'https://www.googleapis.com/upload/drive/v3';

export interface GoogleDriveFile {
  id: string;
  name: string;
  createdTime?: string;
  modifiedTime?: string;
}

/**
 * Get the Google Drive folder named "MindSprouts".
 * If it doesn't exist, create it.
 */
export async function getOrCreateAppFolder(token: string): Promise<string> {
  const q = "name = 'MindSprouts' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
  const url = `${BASE_URL}/files?q=${encodeURIComponent(q)}&fields=files(id)`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to query MindSprouts folder: ${res.status} ${res.statusText} - ${errorText}`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // Create folder
  const createUrl = `${BASE_URL}/files`;
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'MindSprouts',
      mimeType: 'application/vnd.google-apps.folder'
    })
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Failed to create MindSprouts folder: ${createRes.status} ${createRes.statusText} - ${errorText}`);
  }

  const newFolder = await createRes.json();
  return newFolder.id;
}

/**
 * List all .sprout files inside the MindSprouts folder.
 */
export async function listSproutFiles(token: string, folderId: string): Promise<GoogleDriveFile[]> {
  const q = `'${folderId}' in parents and name contains '.sprout' and trashed = false`;
  const url = `${BASE_URL}/files?q=${encodeURIComponent(q)}&fields=files(id,name,createdTime,modifiedTime)&orderBy=modifiedTime desc`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to list files: ${res.status} ${res.statusText} - ${errorText}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Download the content of a specific file.
 */
export async function downloadSproutFile(token: string, fileId: string): Promise<any> {
  const url = `${BASE_URL}/files/${fileId}?alt=media`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to download file content: ${res.status} ${res.statusText} - ${errorText}`);
  }

  return await res.json();
}

/**
 * Create a new .sprout file inside the MindSprouts folder.
 */
export async function createSproutFile(
  token: string,
  folderId: string,
  title: string,
  contentData: any
): Promise<string> {
  // Step 1: Create File Metadata
  const metadataUrl = `${BASE_URL}/files`;
  const metadataRes = await fetch(metadataUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: `${title}.sprout`,
      mimeType: 'application/json',
      parents: [folderId]
    })
  });

  if (!metadataRes.ok) {
    const errorText = await metadataRes.text();
    throw new Error(`Failed to create file metadata: ${metadataRes.status} ${metadataRes.statusText} - ${errorText}`);
  }

  const fileInfo = await metadataRes.json();
  const fileId = fileInfo.id;

  // Step 2: Upload content
  await updateSproutFile(token, fileId, contentData);

  return fileId;
}

/**
 * Upload content to an existing file.
 */
export async function updateSproutFile(token: string, fileId: string, contentData: any): Promise<void> {
  const uploadUrl = `${UPLOAD_BASE_URL}/files/${fileId}?uploadType=media`;

  const res = await fetch(uploadUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(contentData)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to upload file content: ${res.status} ${res.statusText} - ${errorText}`);
  }
}

/**
 * Rename a .sprout file.
 */
export async function renameSproutFile(token: string, fileId: string, newTitle: string): Promise<void> {
  const url = `${BASE_URL}/files/${fileId}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: `${newTitle}.sprout`
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to rename file: ${res.status} ${res.statusText} - ${errorText}`);
  }
}

/**
 * Move a .sprout file to trash.
 */
export async function deleteSproutFile(token: string, fileId: string): Promise<void> {
  const url = `${BASE_URL}/files/${fileId}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      trashed: true
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to trash file: ${res.status} ${res.statusText} - ${errorText}`);
  }
}


/**
 * Get or create the mindsprout_config.json file inside the MindSprouts folder.
 */
export async function getOrCreateConfigFile(token: string, folderId: string): Promise<{ fileId: string; data: any }> {
  const q = `'${folderId}' in parents and name = 'mindsprout_config.json' and trashed = false`;
  const url = `${BASE_URL}/files?q=${encodeURIComponent(q)}&fields=files(id)`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to query config file: ${res.status} ${res.statusText} - ${errorText}`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    const fileId = data.files[0].id;
    const content = await downloadSproutFile(token, fileId);
    return { fileId, data: content };
  }

  // Create empty config file
  const metadataUrl = `${BASE_URL}/files`;
  const metadataRes = await fetch(metadataUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'mindsprout_config.json',
      mimeType: 'application/json',
      parents: [folderId]
    })
  });

  if (!metadataRes.ok) {
    const errorText = await metadataRes.text();
    throw new Error(`Failed to create config file metadata: ${metadataRes.status} ${metadataRes.statusText} - ${errorText}`);
  }

  const fileInfo = await metadataRes.json();
  const fileId = fileInfo.id;
  const defaultConfig = { folders: [], mapFolderMap: {}, updated_at: new Date().toISOString() };
  await updateSproutFile(token, fileId, defaultConfig);

  return { fileId, data: defaultConfig };
}

/**
 * Save / Update the mindsprout_config.json file on Google Drive.
 */
export async function saveConfigFile(token: string, folderId: string, configData: any): Promise<void> {
  const { fileId } = await getOrCreateConfigFile(token, folderId);
  await updateSproutFile(token, fileId, {
    ...configData,
    updated_at: new Date().toISOString()
  });
}
