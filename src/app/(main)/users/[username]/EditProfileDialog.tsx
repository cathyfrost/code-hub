import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserData } from "@/lib/types";
import {
  updateUserProfileSchema,
  UpdateUserProfileValues,
} from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useUpdateProfileMutation } from "./mutations";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import LoadingButton from "@/components/LoadingButton";
import Image, { StaticImageData } from "next/image";
import { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import avatarPlaceholder from "@/assets/avatar-placeholder.png";
import { Camera, X } from "lucide-react";
import CropImageDialog from "@/components/CropImageDialog";
import Resizer from "react-image-file-resizer";
import { cn } from "@/lib/utils";

// 可选的兴趣标签
const INTEREST_OPTIONS = [
  "JavaScript",
  "TypeScript",
  "React",
  "Vue",
  "Next.js",
  "CSS",
  "HTML",
  "Tailwind",
  "Java",
  "Spring Boot",
  "Node.js",
  "Express",
  "Python",
  "Django",
  "Go",
  "Rust",
  "MySQL",
  "PostgreSQL",
  "MongoDB",
  "Redis",
  "Prisma",
  "Docker",
  "Linux",
  "Git",
  "CI/CD",
  "Nginx",
  "Flutter",
  "React Native",
  "Swift",
  "Kotlin",
  "机器学习",
  "深度学习",
  "PyTorch",
  "TensorFlow",
  "NLP",
  "算法",
  "数据结构",
  "设计模式",
  "系统设计",
];

interface EditProfileDialogProps {
  user: UserData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditProfileDialog({
  user,
  open,
  onOpenChange,
}: EditProfileDialogProps) {
  const form = useForm<UpdateUserProfileValues>({
    resolver: zodResolver(updateUserProfileSchema),
    defaultValues: {
      displayName: user.displayName,
      bio: user.bio || "",
      interests: (user as any).interests || [],
    },
  });

  const mutation = useUpdateProfileMutation();
  const [croppedAvatar, setCroppedAvatar] = useState<Blob | null>(null);

  async function onSubmit(values: UpdateUserProfileValues) {
    const newAvatarFile = croppedAvatar
      ? new File([croppedAvatar], `avatar_${user.id}.webp`)
      : undefined;

    mutation.mutate(
      {
        values,
        avatar: newAvatarFile,
      },
      {
        onSuccess: () => {
          setCroppedAvatar(null);
          onOpenChange(false);
        },
      }
    );
  }

  const selectedInterests = form.watch("interests") || [];

  function toggleInterest(tag: string) {
    const current = form.getValues("interests") || [];
    if (current.includes(tag)) {
      form.setValue(
        "interests",
        current.filter((t) => t !== tag),
        { shouldDirty: true }
      );
    } else if (current.length < 10) {
      form.setValue("interests", [...current, tag], { shouldDirty: true });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>修改个人资料</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>头像</Label>
          <AvatarInput
            src={
              croppedAvatar
                ? URL.createObjectURL(croppedAvatar)
                : user.avatarUrl || avatarPlaceholder
            }
            onImageCropped={setCroppedAvatar}
          />
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
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
              render={({ field }) => (
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

            {/* 兴趣标签选择 */}
            <div className="space-y-2">
              <Label>
                兴趣方向{" "}
                <span className="text-xs text-muted-foreground">
                  （已选 {selectedInterests.length}/10，用于智能推荐）
                </span>
              </Label>

              {/* 已选标签 */}
              {selectedInterests.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedInterests.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleInterest(tag)}
                      className="flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-600 transition-colors hover:bg-green-500/20"
                    >
                      {tag}
                      <X className="size-3" />
                    </button>
                  ))}
                </div>
              )}

              {/* 可选标签 */}
              <div className="flex flex-wrap gap-1.5">
                {INTEREST_OPTIONS.filter(
                  (tag) => !selectedInterests.includes(tag)
                ).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleInterest(tag)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs transition-colors",
                      selectedInterests.length >= 10
                        ? "cursor-not-allowed opacity-40"
                        : "hover:border-green-500/50 hover:bg-green-500/5 hover:text-green-600"
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter>
              <LoadingButton type="submit" loading={mutation.isPending}>
                保存
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface AvatarInputProps {
  src: string | StaticImageData;
  onImageCropped: (blob: Blob | null) => void;
}

function AvatarInput({ src, onImageCropped }: AvatarInputProps) {
  const [imageToCrop, setImageToCrop] = useState<File>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onImageSelected(image: File | undefined) {
    if (!image) return;
    Resizer.imageFileResizer(
      image,
      1024,
      1024,
      "WEBP",
      100,
      0,
      (uri) => setImageToCrop(uri as File),
      "file"
    );
  }

  return (
    <>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => onImageSelected(e.target.files?.[0])}
        ref={fileInputRef}
        className="hidden sr-only"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="group relative block"
      >
        <Image
          src={src}
          alt="预览头像"
          width={150}
          height={150}
          className="size-32 flex-none rounded-full object-cover"
        />
        <span className="absolute inset-0 m-auto flex size-12 items-center justify-center rounded-full bg-black bg-opacity-30 text-white transition-colors duration-200 group-hover:bg-opacity-25">
          <Camera size={24} />
        </span>
      </button>
      {imageToCrop && (
        <CropImageDialog
          src={URL.createObjectURL(imageToCrop)}
          cropAspectRatio={1}
          onCropped={onImageCropped}
          onClose={() => {
            setImageToCrop(undefined);
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
          }}
        />
      )}
    </>
  );
}