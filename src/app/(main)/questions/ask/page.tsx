import { Metadata } from "next";
import QuestionEditor from "./QuestionEditor";

export const metadata: Metadata = {
  title: "发布问题",
};

export default function AskQuestionPage() {
  return (
    <main className="w-full min-w-0">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">发布问题</h1>
      </div>
      <QuestionEditor />
    </main>
  );
}