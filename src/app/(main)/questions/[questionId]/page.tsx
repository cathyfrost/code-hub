import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getPostDataInclude } from "@/lib/types";
import { notFound } from "next/navigation";
import QuestionDetail from "./QuestionDetail";
import QuestionSidebar from "../QuestionSidebar";
import { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { ArrowLeft } from "lucide-react";

const getQuestion = cache(async (questionId: string, userId: string) => {
  const post = await prisma.post.findUnique({
    where: { id: questionId, isQuestion: true },
    include: getPostDataInclude(userId),
  });
  return post;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ questionId: string }>;
}): Promise<Metadata> {
  const { user } = await validateRequest();
  if (!user) return { title: "问题详情" };

  const { questionId } = await params;
  const post = await getQuestion(questionId, user.id);
  if (!post) return { title: "问题详情" };

  const title =
    post.content
      .replace(/```[\s\S]*?```/g, "")
      .split("\n")
      .find((l) => l.trim())
      ?.trim()
      .slice(0, 60) || "问题详情";

  return { title };
}

export default async function QuestionDetailPage({
  params,
}: {
  params: Promise<{ questionId: string }>;
}) {
  const { user } = await validateRequest();
  if (!user) return notFound();

  const { questionId } = await params;
  const post = await getQuestion(questionId, user.id);
  if (!post) return notFound();

  return (
    <main className="flex w-full min-w-0 gap-5">
      <div className="w-full min-w-0">
        {/* 返回链接 */}
        <div className="mb-4">
          <Link
            href="/questions"
            className="group inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5 transition-transform duration-200 group-hover:-translate-x-1" />
            返回问答广场
          </Link>
        </div>
        {/* SO 风格：直接平铺内容，不包裹卡片 */}
        <div className="rounded-2xl bg-card px-6 py-5 shadow-sm">
          <QuestionDetail post={post} />
        </div>
      </div>
      <QuestionSidebar />
    </main>
  );
}