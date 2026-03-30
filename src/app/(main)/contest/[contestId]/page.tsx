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
  return <ContestArena contestId={contestId} />;
}
