"use client";

import { useMemo, useState } from "react";
import { diagnosePsych, getPsychTest, type PsychResult } from "@/src/lib/psychTests";

type Props = {
  moduleId: string | undefined;
  /** 全問回答後に診断結果を返す */
  onComplete: (result: PsychResult) => void;
};

/**
 * オンボーディングの「心理テスト」ステップ専用UI。
 * 選択中のAI（moduleId）に対応した数問のセルフチェックを順に出し、
 * 全問回答したら診断結果を親に返す。
 */
export default function PsychTestStep({ moduleId, onComplete }: Props) {
  const test = useMemo(() => getPsychTest(moduleId), [moduleId]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const question = test.questions[index];
  const total = test.questions.length;

  const handleChoose = (tag: string) => {
    const nextAnswers = { ...answers, [question.id]: tag };
    setAnswers(nextAnswers);
    if (index + 1 < total) {
      setIndex(index + 1);
      return;
    }
    setDone(true);
    onComplete(diagnosePsych(moduleId, nextAnswers));
  };

  if (done) return null;

  return (
    <div
      style={{
        background: "white",
        border: "1px solid rgba(60,40,20,0.12)",
        borderRadius: 16,
        padding: "16px 16px 18px",
        marginTop: 4,
      }}
    >
      {index === 0 && (
        <div style={{ fontSize: 13, color: "#4a6741", lineHeight: 1.7, marginBottom: 14 }}>
          {test.intro}
        </div>
      )}
      <div style={{ fontSize: 11, color: "#9a8b7a", marginBottom: 8 }}>
        質問 {index + 1} / {total}
      </div>
      <div style={{ fontSize: 15, fontWeight: "bold", color: "#1a1410", lineHeight: 1.6, marginBottom: 14 }}>
        {question.text}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {question.choices.map((c, i) => (
          <button
            key={`${question.id}-${i}`}
            type="button"
            onClick={() => handleChoose(c.tag)}
            style={{
              textAlign: "left",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1.5px solid rgba(60,40,20,0.15)",
              background: "#f7f3ec",
              color: "#3d3228",
              fontSize: 14,
              lineHeight: 1.5,
              cursor: "pointer",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 10, color: "#b0a596", marginTop: 12, lineHeight: 1.5 }}>
        ※これは医療診断ではなく、養生の入口としての簡単なセルフチェックです。
      </div>
    </div>
  );
}
