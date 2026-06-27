/** Upload a compressed avatar File to Firebase Storage and return the download URL. */
export async function uploadAvatarToStorage(uid: string, file: File): Promise<string> {
  const [{ ref, uploadBytes, getDownloadURL }, { storage }] = await Promise.all([
    import('firebase/storage'),
    import('../lib/firebase'),
  ]);
  const avatarRef = ref(storage, `avatars/${uid}/avatar.jpg`);
  await uploadBytes(avatarRef, file);
  return getDownloadURL(avatarRef);
}

const blobToResult = (
  canvas: HTMLCanvasElement,
  filename: string,
  quality: number
): Promise<{ file: File; dataUrl: string }> => {
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve({
            file: new File([blob], filename.replace(/\.[^/.]+$/, '') + '.jpg', {
              type: 'image/jpeg',
              lastModified: Date.now(),
            }),
            dataUrl,
          });
        } else {
          reject(new Error('Canvas to Blob failed'));
        }
      },
      'image/jpeg',
      quality
    );
  });
};

const scaleSize = (w: number, h: number, maxWidth: number, maxHeight: number) => {
  if (w > h) {
    if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
  } else {
    if (h > maxHeight) { w = Math.round((w * maxHeight) / h); h = maxHeight; }
  }
  return { w, h };
};

export const compressImage = async (
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.8
): Promise<{ file: File; dataUrl: string }> => {
  try {
    // createImageBitmap with imageOrientation respects EXIF rotation data
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as any);
    const { w, h } = scaleSize(bitmap.width, bitmap.height, maxWidth, maxHeight);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    return blobToResult(canvas, file.name, quality);
  } catch {
    // Fallback for browsers that don't support imageOrientation option
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const { w, h } = scaleSize(img.width, img.height, maxWidth, maxHeight);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Failed to get canvas context')); return; }
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve({
                  file: new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                  }),
                  dataUrl,
                });
              } else {
                reject(new Error('Canvas to Blob failed'));
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  }
};
