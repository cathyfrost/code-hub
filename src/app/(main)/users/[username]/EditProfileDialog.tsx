import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserData } from "@/lib/types";
import { updateUserProfileSchema, UpdateUserProfileValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useUpdateProfileMutation } from "./mutations";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import LoadingButton from "@/components/LoadingButton";
import Image, { StaticImageData } from "next/image";
import { useRef, useState } from "react";

interface EditProfileDialogProps{
    user: UserData,
    open: boolean,
    onOpenChange: (open: boolean) => void;
}

export default function EditProfileDialog({user, open, onOpenChange}: EditProfileDialogProps){

    const form = useForm<UpdateUserProfileValues>({
        resolver: zodResolver(updateUserProfileSchema),
        defaultValues: {
            displayName: user.displayName,
            bio: user.bio || "",
        }
    })

    const mutation = useUpdateProfileMutation();

    const [croppedAvatar, setCroppedAvatar] = useState<Blob|null>(null);

    async function onSubmit(values: UpdateUserProfileValues) {
        mutation.mutate(
            {
                values,
            },
            {
                onSuccess: ()=>{
                    onOpenChange(false);
                }
            }
        )
    }

    return <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>修改个人资料</DialogTitle>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                    <FormField
                    control={form.control}
                    name="displayName"
                    render={({field})=>(
                        <FormItem>
                            <FormLabel>昵称</FormLabel>
                            <FormControl>
                                <Input placeholder="请输入你的昵称" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="bio"
                    render={({field})=>(
                        <FormItem>
                            <FormLabel>个人简介</FormLabel>
                            <FormControl>
                                <Textarea 
                                placeholder="介绍一下自己吧～"
                                className="resize-none"
                                {...field}
                                />
                            </FormControl>
                        </FormItem>
                        )}
                        />
                        <DialogFooter>
                            <LoadingButton type="submit" loading={mutation.isPending}>
                                保存
                            </LoadingButton>
                        </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>
}

interface AvatarInputProps {
    src: string | StaticImageData;
    onImageCropped: (blob: Blob | null) => void;
}

function AvatarInput({src, onImageCropped}: AvatarInputProps){
    const [imageToCrop, setImageToCrop] = useState<file>()

    const fileInputRef = useRef<HTMLInputElement>(null);

    function onImageSelected(image: File | undefined){
        if(!image) return;

        //
    }
    return <>
        <input
        type="file"
        accept="image/*"
        onChange={(e) => onImageSelected(e.target.files?.[0])}
        ref={fileInputRef}
        className="hidden sr-only"
        />
        <button
        type="button"
        onClick={()=>fileInputRef.current?.click()}
        className="group relative block">
            <Image
            src={src}
            alt="预览头像"
            width={150}
            height={150}
            className="size-32 flex-none rounded-full object-cover"
            />
        </button>
    </>
}