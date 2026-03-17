import { Metadata } from "next";
import AiAssistant from "./AiAssistant";

export const metadata: Metadata = {
  title: "AI 助手",
};

export default function Page() {
  return (
    <main className="flex w-full min-w-0">
      <div className="w-full min-w-0">
        <AiAssistant />
      </div>
    </main>
  );
}
