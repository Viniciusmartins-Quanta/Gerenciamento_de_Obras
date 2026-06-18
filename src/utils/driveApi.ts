/**
 * Utility functions for interacting with the Google Drive API v3.
 * Authenticated via client-side OAuth access tokens.
 */

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  webViewLink: string;
  webContentLink?: string;
}

/**
 * Searches for a folder with a specific name in the user's Google Drive.
 */
export const searchFolder = async (token: string, folderName: string): Promise<{ id: string; name: string; webViewLink: string } | null> => {
  try {
    const query = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName.replace(/'/g, "\\'")}' and trashed = false`;
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,webViewLink)`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error("Erro ao buscar pasta no Drive:", errText);
      throw new Error(`Erro na busca do Drive: ${errText}`);
    }
    const data = await response.json();
    return data.files && data.files.length > 0 ? data.files[0] : null;
  } catch (err) {
    console.error("Exceção ao buscar pasta no Drive:", err);
    throw err;
  }
};

/**
 * Creates a folder with the given name in Google Drive.
 */
export const createFolder = async (token: string, folderName: string): Promise<{ id: string; name: string }> => {
  try {
    const response = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: "application/vnd.google-apps.folder"
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error("Erro ao criar pasta no Drive:", errText);
      throw new Error(`Erro ao criar pasta: ${errText}`);
    }
    return response.json();
  } catch (err) {
    console.error("Exceção ao criar pasta no Drive:", err);
    throw err;
  }
};

/**
 * Lists all non-folder files inside a specific Google Drive folder.
 */
export const listFiles = async (token: string, folderId: string): Promise<DriveFile[]> => {
  try {
    const query = `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`;
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,createdTime,webViewLink,webContentLink)&orderBy=name_natural,createdTime desc`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error("Erro ao listar arquivos do Drive:", errText);
      throw new Error(`Erro ao listar arquivos: ${errText}`);
    }
    const data = await response.json();
    return data.files || [];
  } catch (err) {
    console.error("Exceção ao listar arquivos do Drive:", err);
    throw err;
  }
};

/**
 * Uploads a file to a specific Google Drive folder using binary multipart upload.
 */
export const uploadFileToFolder = async (
  token: string,
  folderId: string,
  file: File
): Promise<DriveFile> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const boundary = "codemar_drive_upload_boundary";
        const metadata = {
          name: file.name,
          parents: [folderId]
        };

        const headerBlob = new Blob([
          `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n\r\n--${boundary}\r\nContent-Type: ${file.type || "application/octet-stream"}\r\n\r\n`
        ]);
        const footerBlob = new Blob([`\r\n--${boundary}--`]);

        const multipartBlob = new Blob([headerBlob, file, footerBlob], {
          type: `multipart/related; boundary=${boundary}`
        });

        const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,webViewLink,webContentLink", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": `multipart/related; boundary=${boundary}`
          },
          body: multipartBlob
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error("Erro ao enviar arquivo para o Google Drive:", errText);
          reject(new Error(`Erro de envio do Drive: ${errText}`));
        } else {
          resolve(await response.json());
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Deletes a file from Google Drive.
 */
export const deleteFile = async (token: string, fileId: string): Promise<void> => {
  try {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error("Erro ao excluir arquivo no Drive:", errText);
      throw new Error(`Erro ao deletar arquivo: ${errText}`);
    }
  } catch (err) {
    console.error("Exceção ao deletar arquivo no Drive:", err);
    throw err;
  }
};
