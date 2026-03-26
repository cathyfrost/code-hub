import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get("code")
    const state = req.nextUrl.searchParams.get("state")
}