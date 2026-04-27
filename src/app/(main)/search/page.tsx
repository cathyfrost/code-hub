import TrendsSidebar from "@/components/TrendsSidebar";
import { Metadata } from "next";
import SearchResults from "./SearchResults";

interface PageProps {
  searchParams: Promise<{ q: string }>;
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: `搜索"${q}"的结果`,
  };
}

export default async function Page({ searchParams }: PageProps) {
  const { q } = await searchParams;

  return (
    <main className="flex w-full min-w-0 gap-5">
      <div className="w-full min-w-0 space-y-5">
        <div className="rounded-2xl bg-card p-5 shadow-sm">
          <p className="text-center text-xs text-muted-foreground">搜索结果</p>
          <h1 className="mt-1.5 text-center text-xl font-normal tracking-wide">
            <span className="text-muted-foreground">&ldquo;</span>
            {q}
            <span className="text-muted-foreground">&rdquo;</span>
          </h1>
        </div>
        <SearchResults query={q} />
      </div>
      <TrendsSidebar />
    </main>
  );
}