import prisma from "@/lib/prisma";
import QuizDetail from "./QuizDetail";

interface PageProps {
  params: Promise<{ quizId: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { quizId } = await params;

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { title: true, order: true },
  });

  return {
    title: quiz ? `${quiz.order}. ${quiz.title} - 题库` : "题目不存在",
  };
}

export default async function Page({ params }: PageProps) {
  const { quizId } = await params;
  return (
    <main className="flex w-full min-w-0">
      <div className="w-full min-w-0">
        <QuizDetail quizId={quizId} />
      </div>
    </main>
  );
}