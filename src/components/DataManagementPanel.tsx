"use client";

import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { downloadDataExport, readImportFile, importLocalStorageExport } from "@/src/lib/dataExport";

type Props = {
  onImported: () => void;
};

export function DataManagementPanel({ onImported }: Props) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [importing, setImporting] = useState(false);

  const handleExport = () => {
    downloadDataExport();
    setMessage(t("dataManagement.exportDone"));
    setTimeout(() => setMessage(""), 3000);
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    setMessage("");
    try {
      const payload = await readImportFile(file);
      const { imported, errors } = importLocalStorageExport(payload);
      if (errors.length) throw new Error(errors.join(", "));
      setMessage(t("dataManagement.importDone", { count: imported }));
      onImported();
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("dataManagement.importFailed"));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 15,
          fontWeight: "bold",
          color: "#3d3228",
          marginBottom: 4,
          paddingTop: 12,
          borderTop: "1px solid rgba(60,40,20,0.12)",
          marginTop: 8,
        }}
      >
        💾 {t("dataManagement.title")}
      </div>
      <div
        style={{
          background: "#f5f0e8",
          borderRadius: 12,
          padding: 14,
          border: "1px solid rgba(60,40,20,0.1)",
        }}
      >
        <div style={{ fontSize: 12, color: "#3d3228", lineHeight: 1.7, marginBottom: 12 }}>
          {t("dataManagement.description")}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleExport}
            style={{
              flex: 1,
              minWidth: 140,
              padding: "10px 12px",
              borderRadius: 10,
              border: "none",
              background: "#1a1410",
              color: "#f5f0e8",
              fontSize: 13,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {t("dataManagement.export")}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            style={{
              flex: 1,
              minWidth: 140,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1.5px solid rgba(60,40,20,0.15)",
              background: "white",
              color: "#3d3228",
              fontSize: 13,
              fontWeight: "bold",
              cursor: importing ? "default" : "pointer",
              opacity: importing ? 0.6 : 1,
            }}
          >
            {importing ? t("common.loading") : t("dataManagement.import")}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) void handleImport(file);
            e.target.value = "";
          }}
        />
        {message && (
          <div
            style={{
              fontSize: 11,
              color: message.includes("失敗") || message.includes("Invalid") ? "#c44a4a" : "#4a6741",
              marginTop: 10,
              lineHeight: 1.5,
            }}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
