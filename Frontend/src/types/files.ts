// src/types/files.ts
export type FileMetadata = {
  id: string;
  originalName: string;
  storedName: string;
  extension: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
};
