import CommentTable from "./CommentTable";

export default function AdminCommentsPage() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-bold">评论管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          管理和删除用户发布的评论
        </p>
      </div>
      <CommentTable />
    </div>
  );
}