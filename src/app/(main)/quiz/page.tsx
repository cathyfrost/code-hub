import { Metadata } from "next";
import QuizList from "./QuizList";

export const metadata: Metadata = {
  title: "题库",
};

export default function Page() {
  return (
    <main className="flex w-full min-w-0">
      <div className="w-full min-w-0">
        <QuizList />
      </div>
    </main>
  );
}