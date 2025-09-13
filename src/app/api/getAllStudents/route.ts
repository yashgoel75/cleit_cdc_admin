import { NextRequest, NextResponse } from "next/server";
import { User } from "../../../../db/schema";
import { register } from "@/instrumentation";
import { verifyFirebaseToken } from "@/lib/verifyFirebaseToken";

export async function GET(req: NextRequest) {
    try {
        await register();
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Missing token" }, { status: 401 });
        }
        const token = authHeader.split(" ")[1];
        const decodedToken = await verifyFirebaseToken(token);
        if (!decodedToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const students = await User.find();
        if (students) {
            return NextResponse.json({ students }, { status: 200 });
        }
    } catch (e) {
        console.error("Validation error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}