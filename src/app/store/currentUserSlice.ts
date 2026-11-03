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

const EMPTY_CURRENT_USER: CurrentUser = {
  id: "", name: "", shortName: "", designation: "", email: "",
  circle: "", zone: "", employeeId: "", role: "",
};

const currentUserSlice = createSlice({
  name: "currentUser",
  initialState: EMPTY_CURRENT_USER as CurrentUser,
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
