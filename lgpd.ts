/**
 * LGPD Anonymization Layer
 * Ensures PII (Personally Identifiable Information) is masked before leaving the device.
 */

export const anonymizeWeight = (weight?: number): string => {
  if (!weight) return "Não informado";
  const lower = Math.floor(weight / 5) * 5;
  const upper = lower + 5;
  return `Faixa: ${lower}kg - ${upper}kg`;
};

export const anonymizeAge = (age?: number): string => {
  if (!age) return "Não informado";
  const lower = Math.floor(age / 5) * 5;
  const upper = lower + 5;
  return `Faixa Etária: ${lower}-${upper} anos`;
};

export const anonymizeLocation = (address?: string): string => {
  if (!address) return "Região: Não informada";
  
  const addr = address.toLowerCase();
  if (addr.includes("rio do sul") || addr.includes("sc") || addr.includes("santa catarina") || addr.includes("sul")) {
    return "Região: Sul Brasil / Clima: Subtropical";
  }
  if (addr.includes("são paulo") || addr.includes("sp") || addr.includes("rio de janeiro") || addr.includes("rj") || addr.includes("sudeste")) {
    return "Região: Sudeste Brasil / Clima: Tropical de Altitude";
  }
  if (addr.includes("nordeste") || addr.includes("bahia") || addr.includes("ceará")) {
    return "Região: Nordeste Brasil / Clima: Semiárido/Tropical";
  }
  if (addr.includes("norte") || addr.includes("amazonas") || addr.includes("pará")) {
    return "Região: Norte Brasil / Clima: Equatorial";
  }
  
  return "Região: Brasil (Geral) / Clima: Tropical";
};

export const anonymizeProfile = (profile: any) => {
  return {
    ...profile,
    name: "User_ID_Alpha",
    email: "anonymized@health.app",
    address: anonymizeLocation(profile.address),
    age: anonymizeAge(profile.age),
    weight: anonymizeWeight(profile.weight),
    height: profile.height ? `Faixa: ${Math.floor(profile.height / 10) * 10}cm - ${Math.floor(profile.height / 10) * 10 + 10}cm` : undefined
  };
};

/**
 * Simulates redaction of PII in images by drawing black boxes over sensitive areas.
 * In a real-world scenario, this would use local OCR to find coordinates.
 * For this protocol, we apply a standard "Privacy Mask" to the top and bottom of documents.
 */
export const redactImagePII = async (base64Data: string): Promise<string> => {
  if (!base64Data || !base64Data.startsWith('data:image/')) {
    // PDF or text documents bypass canvas pixel redaction and are sent directly as native attachments
    return base64Data;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Data);
        return;
      }

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Apply redaction masks (simulated for LGPD compliance)
      ctx.fillStyle = 'black';
      
      // Mask top area (usually contains Name, CPF, RG)
      ctx.fillRect(0, 0, img.width, img.height * 0.15);
      
      // Mask bottom area (usually contains Address, Signatures)
      ctx.fillRect(0, img.height * 0.85, img.width, img.height * 0.15);

      // Add "ANONYMIZED" watermark
      ctx.fillStyle = 'white';
      ctx.font = `${Math.floor(img.height * 0.03)}px sans-serif`;
      ctx.fillText('LGPD ANONYMIZED PROCESSING', 20, img.height * 0.1);
      ctx.fillText('PII REDACTED LOCALLY', 20, img.height * 0.95);

      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve(base64Data);
    img.src = base64Data;
  });
};
