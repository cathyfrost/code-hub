import { Metadata } from "next";
import ContestArena from "./ContestArena";

export const metadata: Metadata = {
  title: "比赛中",
};

export default async function Page({
  params,
}: {
  params: Promise<{ contestId: string }>;
}) {
  const { contestId } = await params;
  return (
    <div className="fixed inset-0 top-[4.25rem] z-10 bg-background">
      <div className="h-full p-3">
        <ContestArena contestId={contestId} />
      </div>
    </div>
  );
}