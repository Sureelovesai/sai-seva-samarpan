/** Public folder URL for a Google Drive folder id. */
export function driveFolderUrlFromId(folderId: string | null | undefined): string | null {
  if (!folderId || typeof folderId !== "string" || !folderId.trim()) return null;
  const id = folderId.trim();
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null;
  return `https://drive.google.com/drive/folders/${id}`;
}
