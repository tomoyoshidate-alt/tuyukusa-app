"use client";

import { useCallback, useState, type CSSProperties } from "react";
import {
  HOME_SECTION_LABELS,
  HOME_SECTION_TOGGLE_OPTIONS,
  HOME_WEATHER_TOGGLE_OPTIONS,
  type HomeDisplaySettings,
  type HomeSectionId,
} from "@/src/lib/homeDisplay";
import { REGION_OPTIONS, type LocationSettings } from "@/src/lib/regions";

type UserProfile = {
  name: string;
  nickname: string;
  nameConfigured: boolean;
};

type Props = {
  userProfile: UserProfile;
  onUserProfileChange: (next: UserProfile) => void;
  defaultUserName: string;
  locationSettings: LocationSettings;
  onLocationChange: (next: LocationSettings) => void;
  homeDisplay: HomeDisplaySettings;
  onHomeDisplayChange: (next: HomeDisplaySettings) => void;
};

export default function ScreenSettingsTab({
  userProfile,
  onUserProfileChange,
  defaultUserName,
  locationSettings,
  onLocationChange,
  homeDisplay,
  onHomeDisplayChange,
}: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const moveSection = useCallback(
    (from: number, to: number) => {
      if (from === to || from < 0 || to < 0) return;
      const order = [...homeDisplay.sectionOrder];
      const [item] = order.splice(from, 1);
      order.splice(to, 0, item);
      onHomeDisplayChange({ ...homeDisplay, sectionOrder: order });
    },
    [homeDisplay, onHomeDisplayChange]
  );

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 15, fontWeight: "bold", color: "#3d3228", marginBottom: 4 }}>👤 プロフィール設定</div>
      <div style={{ fontSize: 11, color: "#9a8b7a", marginBottom: 12, lineHeight: 1.5 }}>
        ホーム画面の挨拶とAI相談での呼び名に使います
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>お名前</div>
        <input
          type="text"
          placeholder={defaultUserName}
          value={userProfile.name}
          onChange={e => onUserProfileChange({ ...userProfile, name: e.target.value })}
          onBlur={() => {
            const trimmed = userProfile.name.trim() || defaultUserName;
            onUserProfileChange({ ...userProfile, name: trimmed, nameConfigured: true });
          }}
          style={{ ...inputStyle, marginBottom: 12 }}
        />
        <div style={labelStyle}>ニックネーム</div>
        <input
          type="text"
          placeholder="例：たろう、太郎さん"
          value={userProfile.nickname}
          onChange={e => onUserProfileChange({ ...userProfile, nickname: e.target.value })}
          onBlur={() => onUserProfileChange({ ...userProfile, nickname: userProfile.nickname.trim(), nameConfigured: true })}
          style={inputStyle}
        />
      </div>

      <div style={sectionTitleStyle}>📍 在住地域</div>
      <div style={cardStyle}>
        <div style={labelStyle}>地域を選択</div>
        <select
          value={locationSettings.regionId}
          onChange={e => onLocationChange({ regionId: e.target.value })}
          style={{ ...inputStyle, appearance: "auto" }}
        >
          {REGION_OPTIONS.map(region => (
            <option key={region.id} value={region.id}>{region.label}</option>
          ))}
        </select>
      </div>

      <div style={sectionTitleStyle}>🏠 ホーム画面の表示項目</div>
      <div style={{ fontSize: 11, color: "#9a8b7a", marginBottom: 8 }}>天気グラフ（内訳）</div>
      {HOME_WEATHER_TOGGLE_OPTIONS.map(opt => (
        <ToggleRow
          key={opt.key}
          label={opt.label}
          checked={homeDisplay[opt.key]}
          onChange={v => onHomeDisplayChange({ ...homeDisplay, [opt.key]: v })}
        />
      ))}
      {HOME_SECTION_TOGGLE_OPTIONS.map(opt => (
        <ToggleRow
          key={opt.key}
          label={opt.label}
          checked={homeDisplay[opt.key]}
          onChange={v => onHomeDisplayChange({ ...homeDisplay, [opt.key]: v })}
        />
      ))}

      <div style={sectionTitleStyle}>↕️ 表示順の並び替え</div>
      <div style={{ fontSize: 11, color: "#9a8b7a", marginBottom: 8, lineHeight: 1.5 }}>
        ドラッグ＆ドロップでホーム画面の表示順を変更できます
      </div>
      <div style={cardStyle}>
        {homeDisplay.sectionOrder.map((sectionId, index) => (
          <div
            key={sectionId}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null) moveSection(dragIndex, index);
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 8px",
              marginBottom: 4,
              borderRadius: 8,
              background: dragIndex === index ? "#fdf0e4" : "#f5f0e8",
              border: "1px solid rgba(60,40,20,0.08)",
              cursor: "grab",
            }}
          >
            <span style={{ fontSize: 16, opacity: 0.5 }}>⠿</span>
            <span style={{ fontSize: 13, color: "#3d3228", flex: 1 }}>{HOME_SECTION_LABELS[sectionId]}</span>
            <span style={{ fontSize: 10, color: "#9a8b7a" }}>{index + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(60,40,20,0.06)", cursor: "pointer" }}>
      <span style={{ fontSize: 13, color: "#3d3228" }}>{label}</span>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#c17f4a" }} />
    </label>
  );
}

const cardStyle: CSSProperties = {
  background: "white",
  borderRadius: 12,
  padding: "14px",
  marginBottom: 12,
  border: "1px solid rgba(60,40,20,0.1)",
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: "bold",
  color: "#3d3228",
  marginBottom: 4,
  paddingTop: 12,
  borderTop: "1px solid rgba(60,40,20,0.12)",
  marginTop: 8,
};

const labelStyle: CSSProperties = {
  fontSize: 11,
  color: "#9a8b7a",
  marginBottom: 6,
};

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "#f5f0e8",
  border: "1.5px solid rgba(60,40,20,0.12)",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14,
};
