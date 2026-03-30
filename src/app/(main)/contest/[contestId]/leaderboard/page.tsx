import { Metadata } from "next";
import Leaderboard from "./Leaderboard";

export const metadata: Metadata = {
  title: "排行榜",
};

export default async function Page({
  params,
}: {
  params: Promise<{ contestId: string }>;
}) {
  const { contestId } = await params;
  return <Leaderboard contestId={contestId} />;
}
