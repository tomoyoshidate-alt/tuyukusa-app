import type { KeyboardEvent } from "react";

export function isImeComposing(e: KeyboardEvent): boolean {
  return e.nativeEvent.isComposing || e.keyCode === 229;
}

/** Enter = newline; Cmd/Ctrl+Enter = send. IME composition Enter is ignored. */
export function handleChatTextareaKeyDown(
  e: KeyboardEvent<HTMLTextAreaElement>,
  onSend: () => void,
  isComposing = false,
): void {
  if (isImeComposing(e) || isComposing) return;

  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    onSend();
  }
}

export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return true;
  return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
}
