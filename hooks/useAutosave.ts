// ============================================================
// useAutosave — debounced localStorage persistence for form drafts
// ============================================================
import { useState, useEffect, useRef, useCallback } from 'react';

const AUTOSAVE_PREFIX = 'nps-draft-';

interface UseAutosaveOptions<T> {
  /** Unique key for this form (e.g. 'new-analysis') */
  key: string;
  /** The current state to persist */
  data: T;
  /** Debounce delay in ms (default: 1000) */
  delayMs?: number;
  /** Only save when this condition is met (e.g. at least one field filled) */
  shouldSave?: (data: T) => boolean;
}

interface UseAutosaveReturn<T> {
  /** Restored draft on mount, or null */
  restoredDraft: T | null;
  /** Clear the saved draft (call on successful submit) */
  clearDraft: () => void;
  /** Whether a draft exists for this key */
  draftExists: boolean;
  /** Whether auto-save is pending */
  isSaving: boolean;
}

export function useAutosave<T>({
  key,
  data,
  delayMs = 1000,
  shouldSave,
}: UseAutosaveOptions<T>): UseAutosaveReturn<T> {
  const [restoredDraft, setRestoredDraft] = useState<T | null>(null);
  const [draftExists, setDraftExists] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageKey = `${AUTOSAVE_PREFIX}${key}`;

  // Restore draft on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as T;
        setRestoredDraft(parsed);
        setDraftExists(true);
      }
    } catch {
      // Corrupted draft — ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced save on data change
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Skip saving if shouldSave returns false
    if (shouldSave && !shouldSave(data)) {
      return;
    }

    setIsSaving(true);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
        setDraftExists(true);
      } catch {
        // localStorage full or blocked — ignore silently
      }
      setIsSaving(false);
    }, delayMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [data, delayMs, key, shouldSave, storageKey]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setDraftExists(false);
      setRestoredDraft(null);
    } catch {
      // ignore
    }
  }, [storageKey]);

  return { restoredDraft, clearDraft, draftExists, isSaving };
}
