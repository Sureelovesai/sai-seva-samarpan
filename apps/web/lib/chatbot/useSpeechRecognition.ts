"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Minimal shape for the Web Speech API (not always present in TS `lib.dom`). */
type SpeechRecCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onresult: ((ev: SpeechResultEvent) => void) | null;
};

type SpeechResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

function getSpeechRecognitionCtor(): SpeechRecCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window &
    typeof globalThis & {
      SpeechRecognition?: SpeechRecCtor;
      webkitSpeechRecognition?: SpeechRecCtor;
    };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isBrowserSpeechRecognitionSupported(): boolean {
  return Boolean(getSpeechRecognitionCtor());
}

/**
 * One-shot voice capture: user taps mic, speaks, result is passed to the callback (then sent as a normal chat message).
 */
export function useSpeechRecognitionChat(onFinalTranscript: (text: string) => void) {
  const recRef = useRef<InstanceType<SpeechRecCtor> | null>(null);
  const onFinalRef = useRef(onFinalTranscript);
  onFinalRef.current = onFinalTranscript;

  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* noop */
    }
    recRef.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError("Voice input is not supported in this browser.");
      return;
    }
    setError(null);
    try {
      recRef.current?.stop();
    } catch {
      /* noop */
    }
    recRef.current = null;

    const r = new Ctor();
    r.lang = typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US";
    r.interimResults = false;
    r.continuous = false;
    r.maxAlternatives = 1;

    r.onstart = () => setListening(true);
    r.onend = () => {
      setListening(false);
      recRef.current = null;
    };
    r.onerror = (e: { error: string }) => {
      setListening(false);
      recRef.current = null;
      if (e.error === "aborted") return;
      if (e.error === "no-speech") return;
      if (e.error === "not-allowed") {
        setError(
          "Microphone access is blocked. Allow the microphone in your browser settings, or type your question."
        );
        return;
      }
      setError("Voice input failed. Try again or type your question.");
    };
    r.onresult = (e: SpeechResultEvent) => {
      const text = e.results[0]?.[0]?.transcript?.trim();
      if (text) onFinalRef.current(text);
    };

    recRef.current = r;
    try {
      r.start();
    } catch {
      setError("Could not start the microphone.");
      setListening(false);
    }
  }, []);

  useEffect(() => () => stop(), [stop]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  const supported = typeof window !== "undefined" && isBrowserSpeechRecognitionSupported();

  return { supported, listening, error, setError, start, stop, toggle };
}
