import { Metadata } from "next";
import AnalyticsDashboard from "./AnalyticsDashboard";

export const metadata: Metadata = {
  title: "数据分析",
};

export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}