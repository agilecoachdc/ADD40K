// Sélecteur d'image générique (miniature cliquable + input file caché) —
// même pattern que le portrait de personnage (IdentityHeader,
// CharacterSheetPanels.tsx) et le PNJ (GmTracker.tsx), factorisé ici pour
// les entités plateforme (jeux/règles/groupes, pages admin + Profil) qui en
// ont besoin à l'identique. Redimensionne côté client via
// resizePortraitToDataUrl — pas de bucket R2, stocké en data URL (cf. ce
// helper pour le plafond de taille).

import { useRef } from "react";
import { resizePortraitToDataUrl } from "../lib/image";

export function ImagePicker({
  value,
  onChange,
  sizePx = 80,
  label = "Image",
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  sizePx?: number;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    onChange(await resizePortraitToDataUrl(file));
  }

  return (
    <div className="inline-flex shrink-0 flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center justify-center overflow-hidden rounded-lg bg-slate-800 text-slate-500 hover:bg-slate-700"
        style={{ height: sizePx, width: sizePx }}
      >
        {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <span className="text-xs">{label}</span>}
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      {value && (
        <button type="button" onClick={() => onChange(null)} className="text-xs text-slate-500 hover:text-red-400">
          Retirer
        </button>
      )}
    </div>
  );
}
