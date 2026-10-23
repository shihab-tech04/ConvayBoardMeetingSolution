import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface CurrentUser {
  id: string;
  name: string;
  shortName: string;
  designation: string;
  email: string;
  circle: string;
  zone: string;
  employeeId: string;
  role?: string;
}

const MOCK_CURRENT_USER: CurrentUser = {
  id: "usr-001",
  name: "Rafiqul Islam",
  shortName: "RI",
  designation: "Meeting Secretary",
  email: "rafiqul.islam@nccbank.com.bd",
  circle: "Board Secretariat",
  zone: "Convay",
  employeeId: "EMP-2024-1847",
};

const currentUserSlice = createSlice({
  name: "currentUser",
  initialState: MOCK_CURRENT_USER as CurrentUser,
  reducers: {
    setCurrentUser(_state, action: PayloadAction<CurrentUser>) {
      return action.payload;
    },
    updateCurrentUser(state, action: PayloadAction<Partial<CurrentUser>>) {
      return { ...state, ...action.payload };
    },
  },
});

export const { setCurrentUser, updateCurrentUser } = currentUserSlice.actions;
export default currentUserSlice.reducer;
