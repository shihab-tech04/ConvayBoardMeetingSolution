import { Provider } from "react-redux";
import { RouterProvider } from "react-router";
import { Toaster } from "sonner";

import { router } from "./routes";
import { store } from "./store";
import { runBmsMigrationIfNeeded } from "./utils/bmsMigration";

runBmsMigrationIfNeeded();

export default function App() {
  return (
    <Provider store={store}>
      <RouterProvider router={router} />
      <Toaster position="bottom-center" richColors />
    </Provider>
  );
}
