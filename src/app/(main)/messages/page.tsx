import { Metadata } from "next";
import Chat from "./Chat";

export const metadata: Metadata = {
  title: "聊天",
};

export default function Page() {
  return <Chat />;
}