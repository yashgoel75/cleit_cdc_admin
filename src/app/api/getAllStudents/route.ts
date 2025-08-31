import { NextRequest, NextResponse } from "next/server";
import { User } from "../../../../db/schema";
import { register } from "@/instrumentation";

export async function GET(req: NextRequest) {
    try {
        await register();
        const students = await User.find();
        if (students) {
            return NextResponse.json({ students }, { status: 200 });
        }
    } catch (e) {
        console.error("Validation error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}