import { configureStore } from "@reduxjs/toolkit";
import settingsReducer from "./settingsSlice";
import parseReducer from "./parseSlice";

export const store = configureStore({
  reducer: {
    settings: settingsReducer,
    parse: parseReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;

export default store;
