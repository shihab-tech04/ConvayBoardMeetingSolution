import { ReportPage } from "../../components/reports/ReportPage";

export function ReportViewPage({ reportId, showCreateReport }: { reportId: string; showCreateReport?: boolean }) {
  return <ReportPage reportId={reportId} showCreateReport={showCreateReport} />;
}
