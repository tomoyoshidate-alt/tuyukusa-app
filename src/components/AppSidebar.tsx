"use client";

import { useTranslation } from "react-i18next";

const TAB_KEYS = ["home", "chat", "sound", "history", "display", "settings"] as const;

type TabKey = (typeof TAB_KEYS)[number];

type Props = {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
};

export function AppSidebar({ activeTab, onTabChange }: Props) {
  const { t } = useTranslation();

  return (
    <aside className="app-sidebar">
      <div className="app-sidebar__brand">{t("common.appName")}</div>
      <nav className="app-sidebar__nav" aria-label="Main navigation">
        {TAB_KEYS.map(key => (
          <button
            key={key}
            type="button"
            className={`app-sidebar__item${activeTab === key ? " app-sidebar__item--active" : ""}`}
            onClick={() => onTabChange(key)}
          >
            {t(`tabs.${key}`)}
          </button>
        ))}
      </nav>
    </aside>
  );
}
