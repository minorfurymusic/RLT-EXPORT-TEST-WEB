/**
 * Compress and scale down image data URLs on client-side canvas
 * to prevent V8 memory heap overflow and network payload timeouts on mobile devices.
 */
export async function compressImageIfNeeded(dataUrl: string, maxDimension = 1200, quality = 0.82): Promise<string> {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return dataUrl;
  }

  // Only compress images (JPEG, PNG, WEBP, etc.). PDFs and TXT files stay untouched.
  if (!dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      let { width, height } = img;
      
      // If the image is already small, return original
      if (width <= maxDimension && height <= maxDimension) {
        resolve(dataUrl);
        return;
      }

      // Calculate scale
      if (width > height) {
        if (width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG with specified quality
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };

    img.onerror = () => {
      resolve(dataUrl); // Fallback to original
    };

    img.src = dataUrl;
  });
}
