"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MoodleCourse, MoodleStatus } from "../types.ts";
import {
  moodlePost,
  readMoodleCourses,
  readMoodleStatus,
} from "../helpers/moodle-api.ts";

const message = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

/** Owners discard remote selections/previews synchronously, before a connection request awaits. */
export function useMoodle(options: { onSessionChange?: () => void } = {}) {
  const [status, setStatus] = useState<MoodleStatus | null>(null);
  const [courses, setCourses] = useState<MoodleCourse[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const transition = useRef(false);
  const acceptedSession = useRef<MoodleStatus | null>(null);
  const onSessionChange = useRef(options.onSessionChange);
  onSessionChange.current = options.onSessionChange;

  function changeSession() {
    generation.current++;
    acceptedSession.current = null;
    setStatus(null);
    setCourses([]);
    setBusy(false);
    onSessionChange.current?.();
    return generation.current;
  }

  function acceptStatus(next: MoodleStatus) {
    const previous = acceptedSession.current;
    if (
      previous?.authenticated &&
      (!next.authenticated ||
        previous.connectedUrl !== next.connectedUrl ||
        previous.name !== next.name)
    )
      changeSession();
    acceptedSession.current = next;
    setStatus(next);
  }

  const refresh = useCallback(async () => {
    const expected = generation.current;
    try {
      const next = await readMoodleStatus();
      if (expected !== generation.current) return;
      acceptStatus(next);
      setError("");
    } catch (failure) {
      if (expected !== generation.current) return;
      setError(message(failure, "Conexão Moodle indisponível."));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function login(username: string, password: string, url?: string) {
    if (transition.current) return;
    transition.current = true;
    const expected = changeSession();
    setBusy(true);
    setError("");
    try {
      await moodlePost("/api/moodle/login", {
        username,
        password,
        ...(url ? { url } : {}),
      });
      const next = await readMoodleStatus();
      if (expected !== generation.current) return;
      acceptStatus(next);
    } catch (failure) {
      if (expected !== generation.current) return;
      // A failed target change can invalidate the earlier session. Refresh it without losing the login error.
      try {
        const next = await readMoodleStatus();
        if (expected !== generation.current) return;
        acceptStatus(next);
      } catch {
        if (expected === generation.current) setStatus(null);
      }
      if (expected !== generation.current) return;
      setError(message(failure, "Não foi possível entrar no Moodle."));
    } finally {
      transition.current = false;
      if (expected === generation.current) setBusy(false);
    }
  }

  async function logout() {
    if (transition.current) return;
    transition.current = true;
    const expected = changeSession();
    setBusy(true);
    setError("");
    try {
      await moodlePost("/api/moodle/logout", {});
      const next = await readMoodleStatus();
      if (expected !== generation.current) return;
      acceptStatus(next);
    } catch (failure) {
      if (expected !== generation.current) return;
      setError(message(failure, "Não foi possível encerrar a sessão."));
    } finally {
      transition.current = false;
      if (expected === generation.current) setBusy(false);
    }
  }

  async function loadCourses() {
    if (transition.current) return;
    const expected = generation.current;
    setBusy(true);
    setError("");
    try {
      const next = await readMoodleCourses();
      if (expected !== generation.current) return;
      setCourses(next);
    } catch (failure) {
      if (expected !== generation.current) return;
      // Catalogue authentication failures may be the first observation of an expired session.
      await refresh();
      if (expected !== generation.current) return;
      setError(message(failure, "Não foi possível ler os cursos."));
    } finally {
      if (expected === generation.current) setBusy(false);
    }
  }

  return { status, courses, busy, error, login, logout, loadCourses, refresh };
}
