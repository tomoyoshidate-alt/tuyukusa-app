"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  buildOnboardingProposalPrompt,
  GENDER_CHOICES,
  ONBOARDING_GOAL_CHOICES,
  ONBOARDING_LIFESTYLE_STEPS,
  ONBOARDING_WELCOME_MESSAGE,
  parseOnboardingGoalChoice,
  type OnboardingFlowData,
  type OnboardingStep,
} from "@/src/lib/onboarding";
import type { ScheduleReflection } from "@/src/lib/scheduleReflection";
import { createAiChatMessageFromReply, type ChatReply } from "@/src/lib/chatReply";

type OnboardingMessage = {
  type: "ai" | "user";
  text: string;
  choices?: string[];
  scheduleReflection?: ScheduleReflection;
};

type Props = {
  fetchProposal: (prompt: string) => Promise<ChatReply>;
  onComplete: (data: OnboardingFlowData, reflection: ScheduleReflection | null) => void;
};

export function OnboardingScreen({ fetchProposal, onComplete }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [flowData, setFlowData] = useState<OnboardingFlowData>({});
  const [messages, setMessages] = useState<OnboardingMessage[]>([
    { type: "ai", text: ONBOARDING_WELCOME_MESSAGE, choices: [t("onboarding.start")] },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [freeGoalMode, setFreeGoalMode] = useState(false);
  const [freeNameMode, setFreeNameMode] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const pushUser = (text: string) => {
    setMessages(prev => [...prev, { type: "user", text }]);
  };

  const pushAi = (text: string, choices?: string[]) => {
    setMessages(prev => [...prev, { type: "ai", text, choices }]);
  };

  const goToLifestyle = (nextStep: OnboardingStep) => {
    const config = ONBOARDING_LIFESTYLE_STEPS[nextStep as keyof typeof ONBOARDING_LIFESTYLE_STEPS];
    if (!config) return;
    setStep(nextStep);
    pushAi(config.question, config.choices);
  };

  const handleLifestyleAnswer = async (answer: string, currentStep: keyof typeof ONBOARDING_LIFESTYLE_STEPS) => {
    const config = ONBOARDING_LIFESTYLE_STEPS[currentStep];
    const updated = { ...flowData, [config.field]: answer };
    setFlowData(updated);
    pushUser(answer);

    if (config.next === "proposal") {
      setStep("proposal");
      pushAi(`${config.hint}\n\n${t("onboarding.generating")}`);
      setIsLoading(true);
      try {
        const prompt = buildOnboardingProposalPrompt(updated);
        const reply = await fetchProposal(prompt);
        const aiMsg = createAiChatMessageFromReply(reply.content, reply);
        setMessages(prev => [
          ...prev.slice(0, -1),
          { type: "ai", text: aiMsg.text, scheduleReflection: aiMsg.scheduleReflection },
        ]);
        if (aiMsg.scheduleReflection) {
          setMessages(prev => [
            ...prev,
            {
              type: "ai",
              text: t("onboarding.applyPrompt"),
              choices: [t("onboarding.applyAndHome")],
            },
          ]);
        } else {
          setMessages(prev => [
            ...prev,
            {
              type: "ai",
              text: t("onboarding.completeFallback"),
              choices: [t("onboarding.goHome")],
            },
          ]);
        }
      } catch {
        setMessages(prev => [
          ...prev.slice(0, -1),
          {
            type: "ai",
            text: t("onboarding.proposalFailed"),
            choices: [t("onboarding.goHome")],
          },
        ]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const nextConfig = ONBOARDING_LIFESTYLE_STEPS[config.next as keyof typeof ONBOARDING_LIFESTYLE_STEPS];
    setStep(config.next);
    pushAi(`${config.hint}\n\n${nextConfig.question}`, nextConfig.choices);
  };

  const handleChoice = async (choice: string) => {
    if (choice === t("onboarding.start")) {
      pushUser(choice);
      setStep("birthdate");
      pushAi(t("onboarding.birthdateQuestion"));
      return;
    }

    if (choice === t("onboarding.applyAndHome") || choice === t("onboarding.goHome")) {
      const lastReflection = [...messages].reverse().find(m => m.scheduleReflection)?.scheduleReflection ?? null;
      onComplete(flowData, lastReflection);
      return;
    }

    if (step === "gender") {
      const updated = { ...flowData, gender: choice };
      setFlowData(updated);
      pushUser(choice);
      setStep("goal");
      pushAi(t("onboarding.goalQuestion"), ONBOARDING_GOAL_CHOICES);
      return;
    }

    if (step === "goal" && !freeGoalMode) {
      if (choice === "💬 自由に入力する") {
        pushUser(choice);
        setFreeGoalMode(true);
        pushAi(t("onboarding.goalFreeHint"));
        return;
      }
      const goal = parseOnboardingGoalChoice(choice);
      if (goal) {
        const updated = { ...flowData, goal };
        setFlowData(updated);
        pushUser(choice);
        setStep("name");
        pushAi(t("onboarding.nameQuestion"), [t("onboarding.skip")]);
        return;
      }
    }

    if (step === "name" && choice === t("onboarding.skip")) {
      pushUser(choice);
      setStep("return_home");
      goToLifestyle("return_home");
      return;
    }

    if (step === "return_home" || step === "dinner" || step === "bath" || step === "wake") {
      await handleLifestyleAnswer(choice, step);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");

    if (step === "birthdate") {
      const updated = { ...flowData, birthDate: text };
      setFlowData(updated);
      pushUser(text);
      setStep("gender");
      pushAi(t("onboarding.genderQuestion"), [...GENDER_CHOICES]);
      return;
    }

    if (step === "goal" && freeGoalMode) {
      const updated = { ...flowData, goal: text };
      setFlowData(updated);
      pushUser(text);
      setFreeGoalMode(false);
      setStep("name");
      pushAi(t("onboarding.nameQuestion"), [t("onboarding.skip")]);
      return;
    }

    if (step === "name" || freeNameMode) {
      const updated = { ...flowData, nickname: text, name: text };
      setFlowData(updated);
      pushUser(text);
      setFreeNameMode(false);
      setStep("return_home");
      goToLifestyle("return_home");
      return;
    }

    if (step === "welcome") {
      await handleChoice(t("onboarding.start"));
    }
  };

  const showInput = step === "birthdate" || freeGoalMode || step === "name";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20000,
        background: "#f5f0e8",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "16px 20px 12px",
          background: "#1a1410",
          color: "#f5f0e8",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: "bold" }}>🌿 {t("onboarding.title")}</div>
        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{t("onboarding.subtitle")}</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((msg, i) => (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: msg.type === "user" ? "flex-end" : "flex-start" }}>
              <div
                style={{
                  maxWidth: "88%",
                  padding: "12px 14px",
                  borderRadius: 18,
                  fontSize: 14,
                  lineHeight: 1.75,
                  background: msg.type === "user" ? "#1a1410" : "white",
                  color: msg.type === "user" ? "#f5f0e8" : "#1a1410",
                  border: msg.type === "ai" ? "1px solid rgba(60,40,20,0.1)" : "none",
                  whiteSpace: "pre-line",
                }}
              >
                {msg.text}
              </div>
            </div>
            {msg.scheduleReflection && (
              <div style={{ marginTop: 10, maxWidth: "88%" }}>
                {msg.scheduleReflection.schedule.map((item, j) => (
                  <div
                    key={`${item.time}-${j}`}
                    style={{
                      background: "#fdf0e4",
                      border: "1.5px solid #c17f4a",
                      borderRadius: 10,
                      padding: "8px 12px",
                      fontSize: 12,
                      color: "#8b5a2b",
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ fontWeight: "bold" }}>
                      {item.time} {item.title}
                    </div>
                    {item.memo && <div style={{ opacity: 0.75, marginTop: 2 }}>{item.memo}</div>}
                  </div>
                ))}
              </div>
            )}
            {msg.choices && !isLoading && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {msg.choices.map((c, j) => (
                  <button
                    key={j}
                    type="button"
                    onClick={() => void handleChoice(c)}
                    style={{
                      background: "#ede5d4",
                      border: "1.5px solid rgba(60,40,20,0.12)",
                      borderRadius: 20,
                      padding: "8px 16px",
                      fontSize: 13,
                      cursor: "pointer",
                      color: "#3d3228",
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div style={{ fontSize: 13, color: "#8b7355", padding: "8px 0" }}>{t("onboarding.generating")}</div>
        )}
        <div ref={endRef} />
      </div>

      {showInput && (
        <div
          style={{
            padding: "12px 16px 24px",
            background: "white",
            borderTop: "1px solid rgba(60,40,20,0.1)",
            display: "flex",
            gap: 8,
          }}
        >
          <input
            type={step === "birthdate" ? "text" : "text"}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={
              step === "birthdate"
                ? t("onboarding.birthdatePlaceholder")
                : freeGoalMode
                  ? t("onboarding.goalPlaceholder")
                  : t("onboarding.namePlaceholder")
            }
            onKeyDown={e => {
              if (e.key === "Enter") void handleSend();
            }}
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: 12,
              border: "1.5px solid rgba(60,40,20,0.12)",
              fontSize: 14,
            }}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!input.trim()}
            style={{
              padding: "12px 18px",
              borderRadius: 12,
              border: "none",
              background: input.trim() ? "#1a1410" : "#9a8b7a",
              color: "#f5f0e8",
              fontSize: 14,
              fontWeight: "bold",
              cursor: input.trim() ? "pointer" : "default",
            }}
          >
            {t("onboarding.next")}
          </button>
        </div>
      )}
    </div>
  );
}
