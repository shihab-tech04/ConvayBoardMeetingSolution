// Application is English-only. This hook is retained for backward compatibility
// with components that import it, but always returns "en".
export function useLanguage() {
  return {
    languageId: "en" as const,
    setLanguageId: (_id: string) => { /* no-op: language switching is disabled */ },
  };
}
