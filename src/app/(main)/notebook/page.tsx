import { Metadata } from "next";
import NotebookPage from "./NotebookPage";

export const metadata: Metadata = {
  title: "笔记本",
};

export default function Page() {
  return (
    <main className="flex w-full min-w-0">
      <div className="w-full min-w-0">
        <NotebookPage />
      </div>
    </main>
  );
}