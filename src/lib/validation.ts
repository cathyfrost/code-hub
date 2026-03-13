import {z} from "zod";

const requiredString = z.string().trim().min(1, "必填项")

export const signUpSchema = z.object({
    email: requiredString.email("Invalid email address"),
    username: requiredString.regex(
        /^[a-zA-Z0-9_-]+$/,
        "只允许字母、数字、- 和 _"
    ),
    password: requiredString.min(8, "不少于8位")
});

export type SignUpValues = z.infer<typeof signUpSchema>;

export const loginSchema = z.object({
    username: requiredString,
    password: requiredString
})

export type LoginValues = z.infer<typeof loginSchema>;

export const createPostSchema = z.object({
    content: requiredString,
    mediaIds: z.array(z.string()).max(5, "附件数量不能超过5个")
})

export const updateUserProfileSchema = z.object({
    displayName: requiredString,
    bio: z.string().max(1000, "最多1000个字符"),
});

export type UpdateUserProfileValues = z.infer<typeof updateUserProfileSchema>;