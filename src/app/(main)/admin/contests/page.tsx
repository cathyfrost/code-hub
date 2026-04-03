import ContestTable from "./ContestTable";

export default function AdminContestsPage() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-bold">竞赛管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          发布、编辑和删除竞赛
        </p>
      </div>
      <ContestTable />
    </div>
  );
}