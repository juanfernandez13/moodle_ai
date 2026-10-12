"use client";

import { useCallback, useEffect, useState } from "react";
import type { MoodleCourse, MoodleStatus } from "../types.ts";
import {
  moodlePost,
  readMoodleCourses,
  readMoodleStatus,
} from "../helpers/moodle-api.ts";

const message = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function useMoodle() {
  const [status, setStatus] = useState<MoodleStatus | null>(null);
  const [courses, setCourses] = useState<MoodleCourse[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setStatus(await readMoodleStatus());
      setError("");
    } catch (failure) {
      setError(message(failure, "Conexão Moodle indisponível."));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function login(username: string, password: string, url?: string) {
    setBusy(true);
    setError("");
    setCourses([]);
    try {
      await moodlePost("/api/moodle/login", {
        username,
        password,
        ...(url ? { url } : {}),
      });
      setStatus(await readMoodleStatus());
    } catch (failure) {
      // A failed target change can invalidate the earlier session. Refresh it without losing the login error.
      try {
        setStatus(await readMoodleStatus());
      } catch {
        setStatus(null);
      }
      setError(message(failure, "Não foi possível entrar no Moodle."));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setError("");
    try {
      await moodlePost("/api/moodle/logout", {});
      setCourses([]);
      setStatus(await readMoodleStatus());
    } catch (failure) {
      setError(message(failure, "Não foi possível encerrar a sessão."));
    } finally {
      setBusy(false);
    }
  }

  async function loadCourses() {
    setBusy(true);
    setError("");
    try {
      setCourses(await readMoodleCourses());
    } catch (failure) {
      setError(message(failure, "Não foi possível ler os cursos."));
    } finally {
      setBusy(false);
    }
  }

  return { status, courses, busy, error, login, logout, loadCourses, refresh };
}
