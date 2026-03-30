import { Metadata } from "next";
import ContestPage from "./ContestPage";

export const metadata: Metadata = {
  title: "算法竞赛",
};

export default function Page() {
  return <ContestPage />;
}
