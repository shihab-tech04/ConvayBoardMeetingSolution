import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
}

// ── Persistence ───────────────────────────────────────────────────────────────
const AUTH_KEY = "gov_ui_auth";

function loadAuth(): AuthState {
  // Do not trust old localStorage authentication flags.
  return { isAuthenticated: false, userId: null };
}

export function saveAuth(state: AuthState): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem(AUTH_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

// ── Slice ─────────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: "auth",
  initialState: loadAuth,
  reducers: {
    login(state, action: PayloadAction<{ userId?: string }>) {
      state.isAuthenticated = Boolean(action.payload.userId);
      state.userId = action.payload.userId ?? null;
    },
    logout(state) {
      state.isAuthenticated = false;
      state.userId = null;
    },
  },
});

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;
