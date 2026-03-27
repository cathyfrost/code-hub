import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getPostDataInclude } from "@/lib/types";
import { notFound } from "next/navigation";
import EditQuestion from "./EditQuestion";
import { Metadata } from "next";
import { cache } from "react";

const getQuestion = cache(async (questionId: string, userId: string) => {
  const post = await prisma.post.findUnique({
    where: { id: questionId, isQuestion: true },
    include: getPostDataInclude(userId),
  });
  return post;
});

export const metadata: Metadata = {
  title: "编辑问题",
};

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ questionId: string }>;
}) {
  const { user } = await validateRequest();
  if (!user) return notFound();

  const { questionId } = await params;
  const post = await getQuestion(questionId, user.id);

  if (!post) return notFound();
  if (post.userId !== user.id) return notFound();

  return (
    <main className="w-full min-w-0">
      <div className="w-full min-w-0">
        <EditQuestion post={post} />
      </div>
    </main>
  );
}