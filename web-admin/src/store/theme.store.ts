import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
    mode: ThemeMode;
    resolvedMode: 'light' | 'dark';
    setMode: (mode: ThemeMode) => void;
    toggleMode: () => void;
}

const getSystemPreference = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
};

const resolveMode = (mode: ThemeMode): 'light' | 'dark' => {
    if (mode === 'system') {
        return getSystemPreference();
    }
    return mode;
};

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            mode: 'system',
            resolvedMode: resolveMode('system'),
            setMode: (mode: ThemeMode) => {
                set({ mode, resolvedMode: resolveMode(mode) });
            },
            toggleMode: () => {
                const currentResolved = get().resolvedMode;
                const newMode = currentResolved === 'light' ? 'dark' : 'light';
                set({ mode: newMode, resolvedMode: newMode });
            },
        }),
        {
            name: 'attendance-theme',
            partialize: (state) => ({ mode: state.mode }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.resolvedMode = resolveMode(state.mode);
                }
            },
        }
    )
);

// Listen for system preference changes
if (typeof window !== 'undefined' && window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const state = useThemeStore.getState();
        if (state.mode === 'system') {
            useThemeStore.setState({ resolvedMode: e.matches ? 'dark' : 'light' });
        }
    });
}
