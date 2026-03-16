import { Metadata } from "next";
import CodePlayground from "./CodePlayground";

export const metadata: Metadata = {
  title: "在线代码编译器",
};

export default function Page() {
  return (
    <main className="flex w-full min-w-0">
      <div className="w-full min-w-0">
        <CodePlayground />
      </div>
    </main>
  );
}