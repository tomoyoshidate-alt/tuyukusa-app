"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChatMarkdown } from "@/src/components/ChatMarkdown";
import { handleAiChatEnterSendKeyDown } from "@/src/lib/chatSubmitKeyboard";
import {
  buildOnboardingProposalPrompt,
  getOnboardingFreeInputHint,
  isOnboardingFreeInputChoice,
  parseOnboardingGoalChoice,
  type OnboardingFlowData,
  type OnboardingStep,
} from "@/src/lib/onboarding";
import {
  getNextStepInCourse,
  getStructuredStepConfig,
  isStructuredOnboardingStep,
  parseCourseChoice,
  saveQuestionnaireCourse,
} from "@/src/lib/onboardingCourse";
import {
  buildOnboardingTransition,
  buildWelcomeMessage,
  buildWelcomeMessageFromIntro,
  getOnboardingStepPrompt,
} from "@/src/lib/onboardingResponses";
import { loadIntroDraft } from "@/src/lib/introStorage";
import {
  applyStoredProfileToProgress,
  hasVoiceHintBeenShown,
  INITIAL_ONBOARDING_PROGRESS,
  isLifestyleStep,
  isQuestionAnswered,
  loadOnboardingProgress,
  markVoiceHintShown,
  ONBOARDING_PROFILE_STEPS,
  recordAnswer,
  recordDefer,
  recordSkipToHome,
  resolveActiveQuestionStep,
  resolveNextStepAfter,
  saveOnboardingProgress,
  type OnboardingProgress,
} from "@/src/lib/onboardingProgress";
import type { ScheduleReflection } from "@/src/lib/scheduleReflection";
import { createAiChatMessageFromReply, type ChatReply } from "@/src/lib/chatReply";

type OnboardingMessage = {
  type: "ai" | "user";
  text: string;
  scheduleReflection?: ScheduleReflection;
};

type Props = {
  fetchProposal: (prompt: string) => Promise<ChatReply>;
  onQuestionnaireDone: (data: OnboardingFlowData, reflection: ScheduleReflection | null) => void;
  onDeferToHome: (data: OnboardingFlowData) => void;
};

function buildWelcomeMessages(t: (k: string) => string): OnboardingMessage[] {
  const introDraft = loadIntroDraft();
  const welcome = introDraft
    ? buildWelcomeMessageFromIntro(introDraft, t)
    : buildWelcomeMessage(t);
  return [{ type: "ai", text: welcome.text }];
}

function buildInitialFlowState(): {
  step: OnboardingStep;
  progress: OnboardingProgress;
  flowData: OnboardingFlowData;
} {
  const savedProgress = loadOnboardingProgress();
  const progress = applyStoredProfileToProgress(savedProgress ?? INITIAL_ONBOARDING_PROGRESS);
  const step = resolveActiveQuestionStep(progress);
  return { step, progress, flowData: progress.flowData };
}

function buildInitialMessages(step: OnboardingStep, t: (k: string) => string): OnboardingMessage[] {
  if (step === "goal") return buildWelcomeMessages(t);
  const prompt = getOnboardingStepPrompt(step, t);
  if (!prompt.question) return buildWelcomeMessages(t);
  return [{ type: "ai", text: prompt.question }];
}

export function OnboardingScreen({ fetchProposal, onQuestionnaireDone, onDeferToHome }: Props) {
  const { t } = useTranslation();
  const initialState = buildInitialFlowState();
  const initialStep = initialState.step;

  const [step, setStep] = useState<OnboardingStep>(initialStep);
  const [flowData, setFlowData] = useState<OnboardingFlowData>(initialState.flowData);
  const [progress, setProgress] = useState<OnboardingProgress>(initialState.progress);
  const [messages, setMessages] = useState<OnboardingMessage[]>(() => buildInitialMessages(initialStep, t));
  const [input, setInput] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [proposalReady, setProposalReady] = useState(false);
  const [hasScheduleReflection, setHasScheduleReflection] = useState(false);
  const [showVoiceHint, setShowVoiceHint] = useState(() => !hasVoiceHintBeenShown());
  const endRef = useRef<HTMLDivElement>(null);
  const processingRef = useRef(false);
  const awaitingFreeInputRef = useRef<OnboardingStep | null>(null);

  const stepRef = useRef(step);
  const progressRef = useRef(progress);
  const flowDataRef = useRef(flowData);
  const messagesRef = useRef(messages);
  const isLoadingRef = useRef(isLoading);

  stepRef.current = step;
  progressRef.current = progress;
  flowDataRef.current = flowData;
  messagesRef.current = messages;
  isLoadingRef.current = isLoading;

  const persist = useCallback((nextProgress: OnboardingProgress, nextStep: OnboardingStep, nextData: OnboardingFlowData) => {
    const merged = { ...nextProgress, flowData: nextData, currentStep: nextStep };
    setProgress(merged);
    progressRef.current = merged;
    saveOnboardingProgress(merged);
  }, []);

  useEffect(() => {
    const synced = applyStoredProfileToProgress(progressRef.current);
    saveOnboardingProgress(synced);
    setProgress(synced);
    progressRef.current = synced;
    setFlowData(synced.flowData);
    flowDataRef.current = synced.flowData;
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (showVoiceHint) markVoiceHintShown();
  }, [showVoiceHint]);

  const pushUser = useCallback((text: string) => {
    setMessages(prev => {
      const next = [...prev, { type: "user" as const, text }];
      messagesRef.current = next;
      return next;
    });
  }, []);

  const pushAi = useCallback((text: string, extra?: Partial<Pick<OnboardingMessage, "scheduleReflection">>) => {
    setMessages(prev => {
      const next = [...prev, { type: "ai" as const, text, ...extra }];
      messagesRef.current = next;
      return next;
    });
  }, []);

  const pushStepQuestion = useCallback(
    (targetStep: OnboardingStep) => {
      const prompt = getOnboardingStepPrompt(targetStep, t);
      if (!prompt.question) return;
      pushAi(prompt.question);
    },
    [pushAi, t],
  );

  const pushTransition = useCallback(
    (fromStep: OnboardingStep, answer: string, toStep: OnboardingStep, data: OnboardingFlowData) => {
      const { empathyText, questionText } = buildOnboardingTransition(fromStep, answer, toStep, data, t);
      if (empathyText) pushAi(empathyText);
      if (questionText) pushAi(questionText);
      else pushStepQuestion(toStep);
    },
    [pushAi, pushStepQuestion, t],
  );

  const goToLifestyle = useCallback(
    (nextStep: OnboardingStep, fromStep: OnboardingStep, answer: string, data: OnboardingFlowData) => {
      setStep(nextStep);
      stepRef.current = nextStep;
      pushTransition(fromStep, answer, nextStep, data);
    },
    [pushTransition],
  );

  const advanceAfterAnswer = useCallback(
    (fromStep: OnboardingStep, answer: string, nextProgress: OnboardingProgress, updated: OnboardingFlowData) => {
      const nextStep = resolveNextStepAfter(fromStep, nextProgress);
      persist(nextProgress, nextStep, updated);
      pushUser(answer);
      setStep(nextStep);
      stepRef.current = nextStep;
      if (isLifestyleStep(nextStep)) {
        goToLifestyle(nextStep, fromStep, answer, updated);
      } else {
        pushTransition(fromStep, answer, nextStep, updated);
      }
    },
    [goToLifestyle, persist, pushTransition, pushUser],
  );

  const skipAnsweredProfileStep = useCallback(
    (currentStep: OnboardingStep, currentProgress: OnboardingProgress, currentFlow: OnboardingFlowData) => {
      if (!ONBOARDING_PROFILE_STEPS.includes(currentStep)) return false;
      if (!isQuestionAnswered(currentProgress, currentStep)) return false;
      const nextStep = resolveNextStepAfter(currentStep, currentProgress);
      if (nextStep === currentStep) return false;
      setStep(nextStep);
      stepRef.current = nextStep;
      if (isLifestyleStep(nextStep)) {
        goToLifestyle(nextStep, currentStep, "", currentFlow);
      } else {
        const prompt = getOnboardingStepPrompt(nextStep, t);
        if (prompt.question) pushAi(prompt.question);
      }
      return true;
    },
    [goToLifestyle, pushAi, t],
  );

  const startProposalGeneration = useCallback(
    async (answer: string, updated: OnboardingFlowData) => {
      awaitingFreeInputRef.current = null;
      setStep("proposal");
      stepRef.current = "proposal";
      setProposalReady(false);
      setHasScheduleReflection(false);
      const empathy = t("onboarding.empathyLifestyleAnswer", { answer });
      pushAi(`${empathy}\n\n${t("onboarding.generating")}`);
      setIsLoading(true);
      isLoadingRef.current = true;
      try {
        const reply = await fetchProposal(buildOnboardingProposalPrompt(updated));
        const aiMsg = createAiChatMessageFromReply(reply.content, reply);
        const reflection = aiMsg.scheduleReflection ?? null;
        setHasScheduleReflection(!!reflection);
        setMessages(prev => {
          const next: OnboardingMessage[] = [
            ...prev.slice(0, -1),
            {
              type: "ai",
              text: aiMsg.text,
              scheduleReflection: reflection ?? undefined,
            },
            {
              type: "ai",
              text: reflection ? t("onboarding.applyPrompt") : t("onboarding.completeFallback"),
            },
          ];
          messagesRef.current = next;
          return next;
        });
        setProposalReady(true);
      } catch (err) {
        console.error("[Onboarding] proposal fetch failed:", err);
        setMessages(prev => {
          const next: OnboardingMessage[] = [
            ...prev.slice(0, -1),
            { type: "ai", text: t("onboarding.proposalFailed") },
          ];
          messagesRef.current = next;
          return next;
        });
        setProposalReady(true);
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    },
    [fetchProposal, pushAi, t],
  );

  const handleStructuredStepAnswer = useCallback(
    async (answer: string, currentStep: OnboardingStep) => {
      const config = getStructuredStepConfig(currentStep);
      if (!config) return;

      const awaitingFreeInput = awaitingFreeInputRef.current === currentStep;
      if (!awaitingFreeInput && isOnboardingFreeInputChoice(answer)) {
        awaitingFreeInputRef.current = currentStep;
        pushUser(answer);
        pushAi(getOnboardingFreeInputHint(currentStep));
        return;
      }

      awaitingFreeInputRef.current = null;
      const currentProgress = progressRef.current;
      const currentFlow = flowDataRef.current;
      const patch = { [config.field]: answer } as Partial<OnboardingFlowData>;
      const nextProgress = recordAnswer(currentProgress, currentStep, patch);
      const updated = { ...currentFlow, ...patch };
      setFlowData(updated);
      flowDataRef.current = updated;
      persist(nextProgress, currentStep, updated);
      pushUser(answer);

      const nextStep = getNextStepInCourse(currentStep, updated);
      if (nextStep === "proposal") {
        await startProposalGeneration(answer, updated);
        return;
      }

      setStep(nextStep);
      stepRef.current = nextStep;
      pushTransition(currentStep, answer, nextStep, updated);
    },
    [persist, pushAi, pushTransition, pushUser, startProposalGeneration, t],
  );

  const processAnswer = useCallback(
    async (answer: string) => {
      const text = answer.trim();
      if (!text || isLoadingRef.current || processingRef.current) return;

      processingRef.current = true;
      try {
        const currentStep = stepRef.current;
        const currentProgress = progressRef.current;
        const currentFlow = flowDataRef.current;
        const currentMessages = messagesRef.current;

        if (text === t("onboarding.applyAndContinue") || text === t("onboarding.continueToIntegrations")) {
          onQuestionnaireDone(
            currentFlow,
            [...currentMessages].reverse().find(m => m.scheduleReflection)?.scheduleReflection ?? null,
          );
          return;
        }
        if (text === t("onboarding.deferQuestion")) {
          const nextProgress = recordDefer(currentProgress, currentStep);
          persist(nextProgress, currentStep, currentFlow);
          pushUser(text);
          pushAi(t("onboarding.deferredAck"));
          window.setTimeout(() => onDeferToHome(flowDataRef.current), 1800);
          return;
        }
        if (text === t("onboarding.skipQuestionnaire")) {
          const nextProgress = recordSkipToHome(currentProgress, currentStep);
          persist(nextProgress, currentStep, currentFlow);
          pushUser(text);
          pushAi(t("onboarding.skippedAck"));
          window.setTimeout(() => onDeferToHome(flowDataRef.current), 1200);
          return;
        }
        if (skipAnsweredProfileStep(currentStep, currentProgress, currentFlow)) return;
        if (currentStep === "gender") {
          const updated = { ...currentFlow, gender: text };
          const nextProgress = recordAnswer(currentProgress, "gender", { gender: text });
          setFlowData(updated);
          flowDataRef.current = updated;
          advanceAfterAnswer("gender", text, nextProgress, updated);
          return;
        }
        if (currentStep === "goal") {
          const awaitingFreeInput = awaitingFreeInputRef.current === "goal";
          if (!awaitingFreeInput && isOnboardingFreeInputChoice(text)) {
            awaitingFreeInputRef.current = "goal";
            pushUser(text);
            pushAi(getOnboardingFreeInputHint("goal"));
            return;
          }
          awaitingFreeInputRef.current = null;
          const goal = parseOnboardingGoalChoice(text) ?? text;
          const updated = { ...currentFlow, goal };
          const nextProgress = recordAnswer(currentProgress, "goal", { goal });
          setFlowData(updated);
          flowDataRef.current = updated;
          advanceAfterAnswer("goal", text, nextProgress, updated);
          return;
        }
        if (currentStep === "birthdate") {
          const awaitingFreeInput = awaitingFreeInputRef.current === "birthdate";
          if (!awaitingFreeInput && isOnboardingFreeInputChoice(text)) {
            awaitingFreeInputRef.current = "birthdate";
            pushUser(text);
            pushAi(getOnboardingFreeInputHint("birthdate"));
            return;
          }
          awaitingFreeInputRef.current = null;
          const updated = { ...currentFlow, birthDate: text };
          const nextProgress = recordAnswer(currentProgress, "birthdate", { birthDate: text });
          setFlowData(updated);
          flowDataRef.current = updated;
          advanceAfterAnswer("birthdate", text, nextProgress, updated);
          return;
        }
        if (currentStep === "course") {
          const course = parseCourseChoice(text) ?? "standard";
          saveQuestionnaireCourse(course);
          const updated = { ...currentFlow, questionnaireCourse: course };
          const nextProgress = recordAnswer(currentProgress, "course", { questionnaireCourse: course });
          setFlowData(updated);
          flowDataRef.current = updated;
          advanceAfterAnswer("course", text, nextProgress, updated);
          return;
        }
        if (currentStep === "name") {
          if (text === t("onboarding.defaultNicknameChoice")) {
            const nickname = "あなた";
            const updated = { ...currentFlow, nickname, name: nickname };
            const nextProgress = recordAnswer(currentProgress, "name", { nickname, name: nickname });
            setFlowData(updated);
            flowDataRef.current = updated;
            advanceAfterAnswer("name", text, nextProgress, updated);
            return;
          }
          if (text === t("onboarding.skip")) {
            const nextProgress = recordAnswer(currentProgress, "name", currentFlow);
            advanceAfterAnswer("name", text, nextProgress, currentFlow);
            return;
          }
          const updated = { ...currentFlow, nickname: text, name: text };
          const nextProgress = recordAnswer(currentProgress, "name", { nickname: text, name: text });
          setFlowData(updated);
          flowDataRef.current = updated;
          advanceAfterAnswer("name", text, nextProgress, updated);
          return;
        }
        if (isStructuredOnboardingStep(currentStep)) {
          await handleStructuredStepAnswer(text, currentStep);
          return;
        }

        if (currentStep === "proposal") {
          // 自由入力はAIに渡す
          pushUser(text);
          setIsLoading(true);
          isLoadingRef.current = true;
          try {
            const reply = await fetchProposal(text);
            const aiMsg = createAiChatMessageFromReply(reply.content, reply);
            pushAi(aiMsg.text, { scheduleReflection: aiMsg.scheduleReflection });
            setHasScheduleReflection(!!aiMsg.scheduleReflection);
            setProposalReady(true);
          } catch {
            pushAi(t("onboarding.proposalFailed"));
            setProposalReady(true);
          } finally {
            setIsLoading(false);
            isLoadingRef.current = false;
          }
          return;
        }

        if (isStructuredOnboardingStep(currentStep)) {
          await handleStructuredStepAnswer(text, currentStep);
          return;
        }
        console.warn("[Onboarding] Unhandled step:", currentStep, "answer:", text);
      } catch (err) {
        console.error("[Onboarding] processAnswer failed:", err);
      } finally {
        processingRef.current = false;
      }
    },
    [advanceAfterAnswer, fetchProposal, goToLifestyle, handleStructuredStepAnswer, onDeferToHome, onQuestionnaireDone, persist, pushAi, pushTransition, pushUser, skipAnsweredProfileStep, t],
  );

  const handleChoice = useCallback(
    (choice: string) => {
      void processAnswer(choice);
    },
    [processAnswer],
  );

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isLoadingRef.current) return;
    setInput("");
    void processAnswer(text);
  }, [input, processAnswer]);

  const handleDeferQuestion = useCallback(() => {
    void processAnswer(t("onboarding.deferQuestion"));
  }, [processAnswer, t]);

  const currentStepPrompt = getOnboardingStepPrompt(step, t);
  const lastMessage = messages[messages.length - 1];
  const showStepChoices =
    !isLoading &&
    !proposalReady &&
    step !== "proposal" &&
    currentStepPrompt.choices.length > 0 &&
    lastMessage?.type !== "user";

  const footerButtonStyle = (enabled: boolean) => ({
    flex: 1,
    minWidth: 0,
    padding: "10px 8px",
    borderRadius: 10,
    border: "1.5px solid rgba(60,40,20,0.12)",
    background: enabled ? "#ede5d4" : "#f0ebe3",
    color: "#3d3228",
    fontSize: 11,
    fontWeight: "bold",
    cursor: enabled && !isLoading ? "pointer" : "default",
    opacity: enabled && !isLoading ? 1 : 0.45,
    lineHeight: 1.35,
    whiteSpace: "pre-line",
    textAlign: "center",
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 20000, background: "#f5f0e8", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 22, fontWeight: "bold", color: "#1a1410" }}>{t("common.appName")}</div>
        </div>
        {messages.map((msg, i) => (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: msg.type === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "88%", padding: "12px 14px", borderRadius: 18, fontSize: 14, lineHeight: 1.75, background: msg.type === "user" ? "#1a1410" : "white", color: msg.type === "user" ? "#f5f0e8" : "#1a1410", border: msg.type === "ai" ? "1px solid rgba(60,40,20,0.1)" : "none" }}>
                {msg.type === "ai" ? <ChatMarkdown text={msg.text} variant="ai" /> : msg.text}
              </div>
            </div>
            {msg.scheduleReflection && (
              <div style={{ marginTop: 10, maxWidth: "88%" }}>
                {msg.scheduleReflection.schedule.map((item, j) => (
                  <div key={`${item.time}-${j}`} style={{ background: "#fdf0e4", border: "1.5px solid #c17f4a", borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "#8b5a2b", marginBottom: 6 }}>
                    <div style={{ fontWeight: "bold" }}>{item.time} {item.title}</div>
                    {item.memo && <div style={{ opacity: 0.75, marginTop: 2 }}>{item.memo}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {showStepChoices && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            {currentStepPrompt.choices.map((c, j) => (
              <button
                key={`step-choice-${j}`}
                type="button"
                disabled={isLoading}
                onClick={() => handleChoice(c)}
                style={{ background: "#ede5d4", border: "1.5px solid rgba(60,40,20,0.12)", borderRadius: 20, padding: "8px 16px", fontSize: 13, cursor: isLoading ? "default" : "pointer", color: "#3d3228", opacity: isLoading ? 0.6 : 1, whiteSpace: "pre-line", textAlign: "left", maxWidth: "100%" }}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        {isLoading && <div style={{ fontSize: 13, color: "#8b7355", padding: "8px 0" }}>{t("onboarding.generating")}</div>}
        <div ref={endRef} />
      </div>

      {showVoiceHint && (
        <div style={{ padding: "0 20px 8px", fontSize: 12, color: "#6b5c4a", textAlign: "center" }} onClick={() => setShowVoiceHint(false)}>
          {t("onboarding.voiceHint")}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "10px 16px",
          background: "#f5f0e8",
          borderTop: "1px solid rgba(60,40,20,0.1)",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => void processAnswer(t("onboarding.applyAndContinue"))}
          disabled={isLoading || !proposalReady || !hasScheduleReflection}
          style={footerButtonStyle(proposalReady && hasScheduleReflection)}
        >
          {t("onboarding.applyAndContinue")}
        </button>
        <button
          type="button"
          onClick={() => void processAnswer(t("onboarding.continueToIntegrations"))}
          disabled={isLoading || !proposalReady}
          style={footerButtonStyle(proposalReady)}
        >
          {t("onboarding.continueToIntegrations")}
        </button>
        <button
          type="button"
          onClick={handleDeferQuestion}
          disabled={isLoading}
          style={footerButtonStyle(true)}
        >
          {t("onboarding.deferQuestion")}
        </button>
      </div>

      <div style={{ padding: "12px 16px 24px", background: "white", borderTop: "1px solid rgba(60,40,20,0.1)", display: "flex", gap: 8, alignItems: "flex-end" }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={t("onboarding.messagePlaceholder")}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          onKeyDown={e => handleAiChatEnterSendKeyDown(e, handleSend, isComposing)}
          rows={2}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: "12px 14px",
            borderRadius: 12,
            border: "1.5px solid rgba(60,40,20,0.12)",
            fontSize: 14,
            resize: "none",
            minHeight: 44,
            maxHeight: 100,
            lineHeight: 1.5,
            fontFamily: "inherit",
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          style={{
            padding: "12px 14px",
            minHeight: 44,
            borderRadius: 12,
            border: "none",
            background: input.trim() && !isLoading ? "#1a1410" : "#9a8b7a",
            color: "#f5f0e8",
            fontSize: 12,
            fontWeight: "bold",
            cursor: input.trim() && !isLoading ? "pointer" : "default",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {t("chat.send")}
        </button>
      </div>
    </div>
  );
}
