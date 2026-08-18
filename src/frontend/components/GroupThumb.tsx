// Miniature d'un groupe de joueurs — image si définie (cf. migrations/
// 0004_images.sql), sinon initiale du nom sur fond neutre. Utilisé par
// Home.tsx (liste des groupes) et Profile.tsx (groupe actuel + groupes à
// rejoindre).

export function GroupThumb({ url, name, sizePx = 48 }: { url: string | null; name: string; sizePx?: number }) {
  return url ? (
    <img
      src={url}
      alt=""
      className="shrink-0 rounded-lg object-cover"
      style={{ height: sizePx, width: sizePx }}
    />
  ) : (
    <div
      className="flex shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-600"
      style={{ height: sizePx, width: sizePx }}
    >
      {name.charAt(0)}
    </div>
  );
}
