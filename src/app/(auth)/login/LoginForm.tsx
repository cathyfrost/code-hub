"use client"

import { loginSchema, LoginValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form";
import { login } from "./action";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import LoadingButton from "@/components/LoadingButton";

export default function LoginForm(){
    const [error,setError] = useState<string>();
    
    const [isPending, startTransition] = useTransition();

    const form = useForm<LoginValues>({
        resolver: zodResolver(loginSchema),
        defaultValues:{
            username: "",
            password: "",
        },    
    });

    async function onSubmit(values:LoginValues) {
        setError(undefined)
        startTransition(async ()=> {
            const {error} = await login(values);
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
                登录
            </LoadingButton>
        </form>
    </Form>
}