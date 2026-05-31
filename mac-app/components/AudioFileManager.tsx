"use client";

import { useCallback, useRef, useState } from "react";
import {
  deleteAudioFromStorage,
  type StudioAudioEntry,
  uploadAudioToStorage,
} from "@mac/lib/audioStorage";
import { isSupabaseConfigured } from "@mac/lib/presetClient";

type Props = {
  catalog: StudioAudioEntry[];
  selectedUrl: string;
  onUploaded: (entry: StudioAudioEntry) => void;
  onSelect: (url: string) => void;
  onDeleted: (url: string) => void;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
};

export function AudioFileManager({
  catalog,
  selectedUrl,
  onUploaded,
  onSelect,
  onDeleted,
  onRefresh,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleFiles = useCallback(
    async (files: FileList | File[] | null) => {
      if (!files?.length || disabled || uploading) return;
      setError("");
      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          const { filename, publicUrl } = await uploadAudioToStorage(file);
          const entry: StudioAudioEntry = { name: filename, url: publicUrl, source: "storage" };
          onUploaded(entry);
        }
        await onRefresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setUploading(false);
        setDragOver(false);
      }
    },
    [disabled, uploading, onUploaded, onRefresh]
  );

  const handleDelete = useCallback(
    async (entry: StudioAudioEntry) => {
      if (entry.source !== "storage" || deleting) return;
      if (!window.confirm(`「${entry.name}」を Storage から削除しますか？`)) return;
      setError("");
      setDeleting(entry.url);
      try {
        await deleteAudioFromStorage(entry.name);
        onDeleted(entry.url);
        await onRefresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setDeleting(null);
      }
    },
    [deleting, onDeleted, onRefresh]
  );

  if (!isSupabaseConfigured()) {
    return (
      <div className="mb-4">
        <p className="text-[10px] text-[#888] mb-3 font-mono leading-relaxed">
          クラウドアップロードには Supabase 環境変数が必要です。ローカル音源は public/audio/ に配置できます。
        </p>
        {catalog.length > 0 && (
          <ul className="space-y-1">
            {catalog.map(entry => (
              <li key={entry.url}>
                <button
                  type="button"
                  onClick={() => onSelect(entry.url)}
                  className={`w-full text-left px-3 py-2 rounded text-xs font-mono ${
                    selectedUrl === entry.url ? "bg-[#5DCAA5]/20 text-[#5DCAA5]" : "hover:bg-[#333] text-[#ccc]"
                  }`}
                >
                  {entry.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const storageEntries = catalog.filter(e => e.source === "storage");

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
        className={`rounded-lg border-2 border-dashed p-5 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-[#5DCAA5] bg-[#5DCAA5]/10"
            : "border-[#444] hover:border-[#5DCAA5]/60 hover:bg-[#2a2a2a]"
        } ${uploading || disabled ? "opacity-60 pointer-events-none" : ""}`}
      >
        <div className="text-xl mb-1">🎵</div>
        <div className="text-sm text-[#e8e8e8]">
          {uploading ? "アップロード中…" : "MP3 / WAV をドロップ"}
        </div>
        <div className="text-[10px] text-[#888] mt-1 font-mono">クリックで選択 · 最大 50MB · audio バケット</div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.wav,audio/mpeg,audio/wav"
        multiple
        className="hidden"
        onChange={e => void handleFiles(e.target.files)}
      />

      <div className="mt-4">
        <div className="text-[10px] uppercase tracking-wider text-[#666] mb-2 font-mono">
          アップロード済み音源 ({storageEntries.length})
        </div>
        {storageEntries.length === 0 ? (
          <p className="text-[10px] text-[#666] font-mono">まだアップロードされていません</p>
        ) : (
          <ul className="space-y-1 max-h-48 overflow-y-auto">
            {storageEntries.map(entry => (
              <li
                key={entry.url}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                  selectedUrl === entry.url ? "bg-[#5DCAA5]/15 border border-[#5DCAA5]/40" : "bg-[#1a1a1a] border border-[#333]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(entry.url)}
                  className="flex-1 text-left min-w-0"
                  title={entry.url}
                >
                  <div className="text-xs text-[#e8e8e8] truncate">{entry.name}</div>
                  <div className="text-[9px] text-[#666] truncate font-mono">{entry.url}</div>
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(entry)}
                  disabled={deleting === entry.url}
                  className="shrink-0 px-2 py-1 text-[10px] rounded bg-[#3a2020] text-red-300 hover:bg-[#502828] disabled:opacity-50"
                  aria-label={`${entry.name} を削除`}
                >
                  {deleting === entry.url ? "…" : "削除"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {catalog.some(e => e.source === "local") && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wider text-[#666] mb-2 font-mono">ローカル音源</div>
          <ul className="space-y-1">
            {catalog
              .filter(e => e.source === "local")
              .map(entry => (
                <li key={entry.url}>
                  <button
                    type="button"
                    onClick={() => onSelect(entry.url)}
                    className={`w-full text-left px-3 py-2 rounded text-xs font-mono ${
                      selectedUrl === entry.url ? "bg-[#5DCAA5]/20 text-[#5DCAA5]" : "hover:bg-[#333] text-[#ccc]"
                    }`}
                  >
                    {entry.name}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}

      {error && <p className="text-xs text-red-400 mt-2 font-mono">{error}</p>}
    </div>
  );
}
