import { Component, lazy, Suspense, type ReactNode } from "react";
import { PageLoader } from "../../components/shared/PageLoader";
import { Button } from "../../components/buttons/Button";

// Evaluated only when an authorized Outlet renders the route. The login,
// permission checks and every other route retain their existing behavior.
const DeferredDocumentEditor = lazy(async () => ({
  default: (await import("./DocumentEditorPage")).DocumentEditorPage,
}));

class DocumentEditorLoadBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="table-page" role="alert">
          <h1>Unable to load the document editor</h1>
          <p>Reload to try again, then verify the last saved document version.</p>
          <Button variant="secondary" onClick={() => window.location.reload()}>Reload page</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function DocumentEditorRoute() {
  return (
    <DocumentEditorLoadBoundary>
      <Suspense fallback={<PageLoader />}>
        <DeferredDocumentEditor />
      </Suspense>
    </DocumentEditorLoadBoundary>
  );
}
