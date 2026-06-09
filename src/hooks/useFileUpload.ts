'use client';

import { useState } from 'react';

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const uploadFile = async (
    file: File,
    bucket: 'receipts' | 'medical-certs' | 'avatars' | 'documents',
    email: string,
    prefix?: string
  ): Promise<{ fileName: string | null; error: string | null }> => {
    setUploading(true);
    setError('');
    try {
      const fileExt = file.name.split('.').pop();
      const base = email.replace(/[@.]/g, '_');
      const fileName = prefix
        ? `${base}_${prefix}_${Date.now()}.${fileExt}`
        : `${base}_${Date.now()}.${fileExt}`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', bucket);
      formData.append('filename', fileName);

      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Upload failed with status ${res.status}`);
      }

      return { fileName, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al subir el archivo';
      setError(message);
      return { fileName: null, error: message };
    } finally {
      setUploading(false);
    }
  };

  return { uploadFile, uploading, error, setError };
}


