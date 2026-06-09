'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const uploadFile = async (
    file: File,
    bucket: 'receipts' | 'medical-certs' | 'avatars' | 'documents',
    email: string,
    prefix?: string
  ): Promise<string | null> => {
    setUploading(true);
    setError('');
    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const base = email.replace(/[@.]/g, '_');
      const fileName = prefix
        ? `${base}_${prefix}_${Date.now()}.${fileExt}`
        : `${base}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (uploadError) throw uploadError;
      return fileName;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al subir el archivo';
      setError(message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploadFile, uploading, error, setError };
}
