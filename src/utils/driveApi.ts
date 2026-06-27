 
// src/utils/driveApi.ts

const CLIENT_ID     = import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID || '';
const SCOPES        = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_FILES   = 'https://www.googleapis.com/drive/v3/files';

let tokenClient:    any    = null;
let accessToken:    string | null = null;
let tokenExpiresAt: number = 0;
let _authPromise:   Promise<string> | null = null; // serialises concurrent auth calls

const clearToken = () => { accessToken = null; tokenExpiresAt = 0; };

export const initDriveAuth = () => {
  if (typeof window === 'undefined' || !(window as any).google) return;
  tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (tokenResponse: any) => {
      if (tokenResponse?.access_token) {
        accessToken    = tokenResponse.access_token;
        tokenExpiresAt = Date.now() + ((tokenResponse.expires_in ?? 3600) - 60) * 1000;
      }
    },
  });
};

// Serialised: concurrent callers share the same in-flight promise.
export const authorizeDrive = (): Promise<string> => {
  if (accessToken && Date.now() < tokenExpiresAt) return Promise.resolve(accessToken);
  if (_authPromise) return _authPromise;

  clearToken();
  if (!tokenClient) initDriveAuth();
  if (!tokenClient) return Promise.reject(new Error('Google Identity Services not loaded'));

  _authPromise = new Promise<string>((resolve, reject) => {
    tokenClient.callback = (tokenResponse: any) => {
      _authPromise = null;
      if (tokenResponse?.access_token) {
        accessToken    = tokenResponse.access_token;
        tokenExpiresAt = Date.now() + ((tokenResponse.expires_in ?? 3600) - 60) * 1000;
        resolve(tokenResponse.access_token);
      } else {
        reject(new Error('Drive authorization failed'));
      }
    };
    // Empty prompt = silent if already consented, shows selector otherwise
    tokenClient.requestAccessToken({ prompt: '' });
  });

  return _authPromise;
};

// Single retry on 401 — refreshes token and re-runs the request once.
async function driveRequest(url: string, init: RequestInit): Promise<Response> {
  const headers = (token: string) => ({
    ...init.headers,
    Authorization: `Bearer ${token}`,
  });

  let token = await authorizeDrive();
  let res   = await fetch(url, { ...init, headers: headers(token) });

  if (res.status === 401) {
    clearToken();
    token = await authorizeDrive();
    res   = await fetch(url, { ...init, headers: headers(token) });
  }
  return res;
}

// Grants anyone-with-link read access. Non-critical — swallows failures.
async function grantPublicRead(fileId: string): Promise<void> {
  try {
    await driveRequest(`${DRIVE_FILES}/${fileId}/permissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    });
  } catch { /* non-critical */ }
}

export const createDriveFolder = async (
  folderName: string,
): Promise<{ id: string; link: string }> => {
  const res = await driveRequest(`${DRIVE_FILES}?fields=id,webViewLink`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: folderName, mimeType: 'application/vnd.google-apps.folder' }),
  });
  if (!res.ok) throw new Error('Failed to create Drive folder');

  const data = await res.json();
  await grantPublicRead(data.id);
  return { id: data.id, link: data.webViewLink };
};

const xhrUpload = (
  token: string,
  form: FormData,
  onProgress: (p: number) => void,
): Promise<{ status: number; body: string }> =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload  = () => resolve({ status: xhr.status, body: xhr.responseText });
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(form);
  });

export const uploadFileToDrive = async (
  file: File,
  folderId: string,
  onProgress: (progress: number) => void,
): Promise<{ id: string; link: string }> => {
  const makeForm = (token: string): [FormData, string] => {
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify({ name: file.name, parents: folderId ? [folderId] : [] })], { type: 'application/json' }));
    form.append('file', file);
    return [form, token];
  };

  let token  = await authorizeDrive();
  let result = await xhrUpload(token, makeForm(token)[0], onProgress);

  if (result.status === 401) {
    clearToken();
    token  = await authorizeDrive();
    result = await xhrUpload(token, makeForm(token)[0], onProgress);
  }
  if (result.status !== 200) throw new Error(`Upload failed: ${result.body}`);

  const data = JSON.parse(result.body);
  await grantPublicRead(data.id);
  return { id: data.id, link: data.webViewLink };
};

export const deleteDriveFile = async (fileId: string): Promise<void> => {
  const res = await driveRequest(`${DRIVE_FILES}/${fileId}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error('Failed to delete Drive file');
};
