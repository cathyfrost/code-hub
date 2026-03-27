import { Metadata } from "next";
import QuestionsFeed from "./QuestionsFeed";
import QuestionSidebar from "./QuestionSidebar";
import Link from "next/link";

export const metadata: Metadata = {
  title: "问答",
};

export default function QuestionsPage() {
  return (
    <main className="flex w-full min-w-0 gap-5">
      <div className="w-full min-w-0 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">问答广场</h1>
          <Link
            href="/questions/ask"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:brightness-110"
          >
            发布问题
          </Link>
        </div>
        <QuestionsFeed />
      </div>
      <QuestionSidebar />
    </main>
  );
}