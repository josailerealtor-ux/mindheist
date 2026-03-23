import { create } from 'zustand';
import { TrapStep, TrapDifficulty } from '../types/trap';
import { TrapSolution, StepConfig, StepSolution } from '../types/engine';
import { trapsApi } from '../api/traps';
import { track } from '../lib/analytics';
import { supabase } from '../lib/supabase';

const FREE_DRAFT_LIMIT = 3;

export interface BuilderDraft {
  id: string | null;
  title: string;
  description: string;
  difficulty: TrapDifficulty;
  steps: TrapStep[];
  solution: TrapSolution;
}

interface BuilderState {
  draft: BuilderDraft;
  saving: boolean;
  publishing: boolean;
  publishErrors: Array<{ stepId: string | null; message: string }>;
  autosaveTimer: ReturnType<typeof setTimeout> | null;

  initDraft: () => Promise<{ blocked: boolean }>;
  draftLimitReached: boolean;
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  setDifficulty: (difficulty: TrapDifficulty) => void;
  addStep: (type: TrapStep['type']) => string;
  removeStep: (stepId: string) => void;
  reorderSteps: (steps: TrapStep[]) => void;
  updateStepConfig: (stepId: string, config: StepConfig) => void;
  updateStepPrompt: (stepId: string, prompt: string) => void;
  updateStepSolution: (stepId: string, solution: StepSolution) => void;
  save: () => Promise<void>;
  publish: () => Promise<boolean>;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function defaultDraft(): BuilderDraft {
  return {
    id: null,
    title: '',
    description: '',
    difficulty: 'medium',
    steps: [],
    solution: {},
  };
}

function defaultConfigForType(type: TrapStep['type']): StepConfig {
  switch (type) {
    case 'logic':
      return { expression: '', variables: {} };
    case 'sequence':
      return { items: [] };
    case 'cipher':
      return { encoded: '', cipherType: 'caesar' };
    case 'pattern':
      return { sequence: [null], gapIndex: 0 };
    case 'timing':
      return { prompt: '', targetMs: 3000, windowMs: 500 };
  }
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  draft: defaultDraft(),
  saving: false,
  publishing: false,
  publishErrors: [],
  autosaveTimer: null,
  draftLimitReached: false,

  initDraft: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { blocked: false };

    const { data: profile } = await supabase
      .from('users')
      .select('is_pro')
      .eq('id', user.id)
      .single();

    if (!profile?.is_pro) {
      const { count } = await supabase
        .from('traps')
        .select('id', { count: 'exact', head: true })
        .eq('creator_id', user.id);
      if ((count ?? 0) >= FREE_DRAFT_LIMIT) {
        set({ draftLimitReached: true });
        return { blocked: true };
      }
    }

    set({ draft: defaultDraft(), publishErrors: [], draftLimitReached: false });
    return { blocked: false };
  },

  setTitle: (title) => {
    set((s) => ({ draft: { ...s.draft, title } }));
    scheduleAutosave(get, set);
  },

  setDescription: (description) => {
    set((s) => ({ draft: { ...s.draft, description } }));
    scheduleAutosave(get, set);
  },

  setDifficulty: (difficulty) => {
    set((s) => ({ draft: { ...s.draft, difficulty } }));
    scheduleAutosave(get, set);
  },

  addStep: (type) => {
    const newStep: TrapStep = {
      id: generateId(),
      type,
      prompt: '',
      config: defaultConfigForType(type),
    };
    set((s) => ({ draft: { ...s.draft, steps: [...s.draft.steps, newStep] } }));
    scheduleAutosave(get, set);
    return newStep.id;
  },

  removeStep: (stepId) => {
    set((s) => {
      const { [stepId]: _removed, ...remainingSolution } = s.draft.solution;
      return {
        draft: {
          ...s.draft,
          steps: s.draft.steps.filter((step) => step.id !== stepId),
          solution: remainingSolution,
        },
      };
    });
    scheduleAutosave(get, set);
  },

  reorderSteps: (steps) => {
    set((s) => ({ draft: { ...s.draft, steps } }));
    scheduleAutosave(get, set);
  },

  updateStepConfig: (stepId, config) => {
    set((s) => ({
      draft: {
        ...s.draft,
        steps: s.draft.steps.map((step) =>
          step.id === stepId ? { ...step, config } : step
        ),
      },
    }));
    scheduleAutosave(get, set);
  },

  updateStepPrompt: (stepId, prompt) => {
    set((s) => ({
      draft: {
        ...s.draft,
        steps: s.draft.steps.map((step) =>
          step.id === stepId ? { ...step, prompt } : step
        ),
      },
    }));
    scheduleAutosave(get, set);
  },

  updateStepSolution: (stepId, solution) => {
    set((s) => ({
      draft: {
        ...s.draft,
        solution: { ...s.draft.solution, [stepId]: solution },
      },
    }));
    scheduleAutosave(get, set);
  },

  save: async () => {
    const { draft } = get();
    set({ saving: true });
    try {
      const payload = {
        title: draft.title || 'Untitled Trap',
        description: draft.description,
        difficulty: draft.difficulty,
        steps: draft.steps,
        solution: draft.solution,
      };
      if (draft.id) {
        await trapsApi.update(draft.id, payload);
      } else {
        const created = await trapsApi.create(payload);
        set((s) => ({ draft: { ...s.draft, id: created.id } }));
      }
    } finally {
      set({ saving: false });
    }
  },

  publish: async () => {
    const { draft, save } = get();
    set({ publishing: true, publishErrors: [] });
    try {
      await save();
      const { id } = get().draft;
      if (!id) return false;
      await trapsApi.publish(id);
      track('trap_published', { trap_id: id, difficulty: get().draft.difficulty, step_count: get().draft.steps.length });
      return true;
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'details' in err &&
        Array.isArray((err as { details: unknown }).details)
      ) {
        set({ publishErrors: (err as { details: Array<{ stepId: string | null; message: string }> }).details });
      }
      return false;
    } finally {
      set({ publishing: false });
    }
  },
}));

function scheduleAutosave(
  get: () => BuilderState,
  set: (partial: Partial<BuilderState>) => void
) {
  const current = get().autosaveTimer;
  if (current) clearTimeout(current);
  const timer = setTimeout(() => {
    get().save();
  }, 2000);
  set({ autosaveTimer: timer });
}
