export default function VideoEditorPlaceholder() {
  return (
    <div className="elevation-card p-4">
      <p className="text-sm text-[#C7CDD1]">Timeline (Fase 2)</p>
      <p className="mt-1 text-xs text-[#E7EFE9]/70">
        En móvil: revisión y aprobación. El editor completo carga como chunk aparte.
      </p>
      <div className="mt-3 flex gap-2 overflow-x-auto">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 w-28 shrink-0 rounded-[8px] bg-[#0C1712]" />
        ))}
      </div>
    </div>
  );
}
