"use client";

import { useCallback, useRef, useState } from "react";
import { isSupabaseConfigured } from "@mac/lib/presetClient";
import { uploadAudioToStorage } from "@mac/lib/audioStorage";

type Props = {
  onUploaded: (filename: string) => void;
  disabled?: boolean;
};

export function AudioUploader({ onUploaded, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFiles = useCallback(
    async (files: FileList | File[] | null) => {
      if (!files?.length || disabled || uploading) return;
      setError("");
      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          const { filename } = await uploadAudioToStorage(file);
          onUploaded(filename);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setUploading(false);
        setDragOver(false);
      }
    },
    [disabled, uploading, onUploaded]
  );

  if (!isSupabaseConfigured()) {
    return (
      <p className="text-[10px] text-[#888] mb-3 font-mono leading-relaxed">
        クラウドアップロードには Supabase 環境変数が必要です。ローカル音源は public/audio/ に配置できます。
      </p>
    );
  }

  return (
    <div className="mb-4">
      <div
        role="button"
        tabIndex={0}
        onDragOver={e => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault();
          void handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={`rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-[#5DCAA5] bg-[#5DCAA5]/10"
            : "border-[#444] hover:border-[#5DCAA5]/60 hover:bg-[#2a2a2a]"
        } ${uploading || disabled ? "opacity-60 pointer-events-none" : ""}`}
      >
        <div className="text-2xl mb-2">🎵</div>
        <div className="text-sm text-[#e8e8e8]">
          {uploading ? "アップロード中…" : "MP3 / WAV をドロップ"}
        </div>
        <div className="text-[10px] text-[#888] mt-2 font-mono">またはクリックしてファイルを選択（最大 50MB）</div>
        <div className="text-[10px] text-[#5DCAA5] mt-1 font-mono">Supabase Storage · audio バケット</div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.wav,audio/mpeg,audio/wav"
        multiple
        className="hidden"
        onChange={e => void handleFiles(e.target.files)}
      />
      {error && <p className="text-xs text-red-400 mt-2 font-mono">{error}</p>}
    </div>
  );
}
