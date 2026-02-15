import { Metadata } from "next"
import signupImage from "@/assets/signup-image.png"
import Image from "next/image"
import Link from "next/link"
import SignUpForm from "./SignUpForm"

export const metadata: Metadata = {
    title: "注册"
}

export default function Page(){
    return <main className="flex h-screen items-center justify-center p-5">
        <div className="flex h-full max-h-[40rem] w-full max-w-[64rem] rounded-2xl overflow-hidden bg-card shadow-2xl">
            <div className="md:w-1/2 w-full space-y-10 overflow-y-auto p-10">
                <div className="space-y-1 text-center">
                    <h1 className="text-3xl font-bold">注册CodeHub</h1>
                    <p className="text-muted-foreground">
                        <span className="italic">Talk</span> is cheap, show me the <span className="italic">code</span>
                    </p>
                </div>
                <div className="space-y-5">
                    <SignUpForm/>
                    <Link href="/login" className="block text-center hover:underline">
                        已有账号？点击登录
                    </Link>
                </div>
            </div>
            <Image 
            src={signupImage}
            alt=""
            className="w-1/2 hidden md:block object-cover"
            />
        </div>
    </main>
}