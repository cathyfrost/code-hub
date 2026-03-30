import prisma from "@/lib/prisma";
import ChallengeArena from "./ChallengeArena";

interface PageProps {
  params: Promise<{ challengeId: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { challengeId } = await params;

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { difficulty: true, quiz: { select: { title: true } } },
  });

  return {
    title: challenge?.quiz
      ? `1v1 对战 - ${challenge.quiz.title}`
      : "1v1 对战",
  };
}

export default async function Page({ params }: PageProps) {
  const { challengeId } = await params;
  return (
    <main className="flex w-full min-w-0">
      <div className="w-full min-w-0">
        <ChallengeArena challengeId={challengeId} />
      </div>
    </main>
  );
}