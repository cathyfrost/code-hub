"use client";

import { signUpSchema, SignUpValues } from "@/lib/validation";
import { useForm } from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useState, useTransition } from "react";
import { signUp } from "./action";
import { PasswordInput } from "@/components/PasswordInput";
import LoadingButton from "@/components/LoadingButton";

export default function SignUpForm(){

    const [error, setError] = useState<string>();

    const [isPending, startTransition] = useTransition();

    const form = useForm<SignUpValues>({
        resolver: zodResolver(signUpSchema),
        defaultValues: {
            email:"",
            username:"",
            password:""
        }
    });

    async function onSubmit(values:SignUpValues) {
        setError(undefined);
        startTransition(async ()=>{
            const {error} = await signUp(values);
            if(error) setError(error);
        })
        
    }

    return <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            {error && <p className="text-center text-destructive">{error}</p>}
            <FormField
                control={form.control}
                name="username"
                render={({field})=>(
                    <FormItem>
                        <FormLabel>用户名</FormLabel>
                        <FormControl>
                            <Input placeholder="请输入用户名" {...field} />
                        </FormControl>
                        <FormMessage/>
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="email"
                render={({field})=>(
                    <FormItem>
                        <FormLabel>邮箱</FormLabel>
                        <FormControl>
                            <Input placeholder="请输入邮箱" type="email"{...field} />
                        </FormControl>
                        <FormMessage/>
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="password"
                render={({field})=>(
                    <FormItem>
                        <FormLabel>密码</FormLabel>
                        <FormControl>
                            <PasswordInput placeholder="请输入密码"{...field}/>
                        </FormControl>
                        <FormMessage/>
                    </FormItem>
                )}
            />
            <LoadingButton 
            loading={isPending}
            type="submit" className="w-full">
                创建账号
            </LoadingButton>
        </form>
    </Form>
}