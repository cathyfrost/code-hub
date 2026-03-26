import { Metadata } from "next";
import LoginForm from "./LoginForm";
import Link from "next/link";
import loginImage from "@/assets/login-image.png"
import Image from "next/image";
import GoogleSignInButton from "./google/GoogleSignInButton";

export const metadata: Metadata = {
    title: "登录"
}

export default function Page() {
    return <main className="flex h-screen items-center justify-center p-5">
        <div className='flex h-full max-h-[40rem] w-full max-w-[64rem] overflow-hidden rounded-2xl bg-card shadow-2xl'>
            <div className='w-full space-y-10 overflow-y-auto p-10 md:w-1/2'>
                <h1 className="text-center text-3xl font-bold">登录CodeHub</h1>
                <div className='space-y-5'>
                    <GoogleSignInButton />
                    <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-muted" />
                        <span>或</span>
                        <div className="h-px flex-1 bg-muted" />
                    </div>
                    <LoginForm/>
                    <Link href="/signup" className="block text-center hover:underline">
                        没有账号？点击注册
                    </Link>
                </div>
            </div>
            <Image
            src={loginImage}
            alt=""
            className="hidden w-1/2 object-cover md:block"
            />
        </div>
        

    </main>
}