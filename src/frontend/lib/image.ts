// Utilitaire image partagé — upload de portrait (fiche personnage,
// formulaire de création de PNJ).

/**
 * Redimensionne + compresse une image choisie par l'utilisateur en JPEG
 * data URL, avant de la stocker dans `portraitUrl`. Le portrait vit dans le
 * JSON `data` du personnage (colonne D1 unique) — pas de bucket R2 dans ce
 * MVP — donc on plafonne à 480px / qualité 0.82 pour rester largement sous
 * les limites de taille de ligne D1 (quelques dizaines de Ko en pratique).
 */
export function resizePortraitToDataUrl(file: File, maxDim = 480, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Fichier image invalide"));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Traitement d'image indisponible"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
