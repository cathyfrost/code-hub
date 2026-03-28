"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LoadingButton from "@/components/LoadingButton";
import { Button } from "@/components/ui/button";
import { InlineCommentData } from "@/lib/types";

interface DeleteInlineCommentDialogProps {
  comment: InlineCommentData;
  postId: string;
  open: boolean;
  onClose: () => void;
  onDeleted: (commentId: string) => void;
}

export default function DeleteInlineCommentDialog({
  comment,
  postId,
  open,
  onClose,
  onDeleted,
}: DeleteInlineCommentDialogProps) {
  const [isPending, setIsPending] = useState(false);

  async function handleDelete() {
    setIsPending(true);
    try {
      const res = await fetch(`/api/posts/${postId}/inline-comments/${comment.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("删除失败");
      
      onDeleted(comment.id);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsPending(false);
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open || !isPending) {
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>删除此批注？</DialogTitle>
          <DialogDescription>
            确定要删除这条行内批注吗？此操作无法撤销。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <LoadingButton
            variant="destructive"
            onClick={handleDelete}
            loading={isPending}
          >
            删除
          </LoadingButton>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}