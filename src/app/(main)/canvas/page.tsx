import { Metadata } from "next";
import CanvasPage from "./CanvasPage";

export const metadata: Metadata = {
  title: "画板",
};

export default function Page() {
  return <CanvasPage />;
}