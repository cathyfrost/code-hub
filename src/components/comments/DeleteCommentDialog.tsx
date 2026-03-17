import { CommentData } from "@/lib/types";
import { useDeleteCommentMutation } from "./mutations";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import LoadingButton from "../LoadingButton";
import { Button } from "../ui/button";

interface DeleteCommentDialogProps {
  comment: CommentData;
  open: boolean;
  onClose: () => void;
}

export default function DeleteCommentDialog({
  comment,
  open,
  onClose,
}: DeleteCommentDialogProps){
    const mutation = useDeleteCommentMutation();

    function handleOpenChange(open: boolean){
        if(!open || !mutation.isPending){
            onClose();
        }
    }

    return <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>删除此评论？</DialogTitle>
                <DialogDescription>
                    确定要删除这条评论吗？此操作无法撤销。
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <LoadingButton 
                variant="destructive"
                onClick={()=>mutation.mutate(comment.id, {onSuccess: onClose})}
                loading={mutation.isPending}>
                    删除
                </LoadingButton>
                <Button 
                variant="outline" 
                onClick={onClose} 
                disabled={mutation.isPending}>
                    取消
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
}
