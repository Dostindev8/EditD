"use client";

import { useCallback, useRef, useState } from "react";
import { assetUrl, uploadAsset, type Asset } from "@/lib/api";

type Props = {
  workspaceId: string;
  projectId: string;
  locale: "es" | "en";
  onUploaded: (asset: Asset) => void;
  onClear: () => void;
  current?: Asset | null;
  disabled?: boolean;
};

export function CreatorUpload({
  workspaceId,
  projectId,
  locale,
  onUploaded,
  onClear,
  current,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const t = (es: string, en: string) => (locale === "es" ? es : en);

  const handleFile = useCallback(
    async (file: File) => {
      if (!workspaceId || !projectId) return;
      setError("");
      setBusy(true);
      try {
        const asset = await uploadAsset(workspaceId, projectId, file);
        onUploaded(asset);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [workspaceId, projectId, onUploaded],
  );

  return (
    <div className="space-y-2">
      {current ? (
        <div className="flex items-center gap-3 rounded-[16px] bg-[#0C1712] p-3">
          <img
            src={assetUrl(current.url)}
            alt=""
            className="h-14 w-14 shrink-0 rounded-[8px] object-contain"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-[#E7EFE9]">{current.filename}</p>
            <p className="text-xs text-[#2FA84F]">{t("Imagen lista", "Image ready")}</p>
          </div>
          <button
            type="button"
            disabled={disabled || busy}
            onClick={onClear}
            className="text-xs text-[#C7CDD1] hover:text-[#E7EFE9]"
          >
            {t("Quitar", "Remove")}
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files[0];
            if (f) void handleFile(f);
          }}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-[16px] border border-dashed px-4 py-6 text-center transition ${
            drag ? "border-[#2FA84F] bg-[#13251C]" : "border-[#C7CDD1]/25 bg-[#0C1712]/50"
          } ${disabled || busy ? "pointer-events-none opacity-50" : ""}`}
        >
          <p className="text-sm text-[#E7EFE9]">
            {busy
              ? t("Subiendo…", "Uploading…")
              : t("Arrastra una imagen o toca para subir", "Drop an image or tap to upload")}
          </p>
          <p className="mt-1 text-xs text-[#C7CDD1]/70">JPG · PNG · WebP · GIF · máx 5 MB</p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      {error ? (
        <p className="text-xs text-[#2FA84F]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
