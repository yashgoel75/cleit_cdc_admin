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
        const { searchParams } = new URL(req.url);
        const query = searchParams.get("query");

        if (!query) {
            return NextResponse.json(
                { error: "Please provide 'username' or 'email' to check." },
                { status: 400 }
            );
        }
        const userByEmail = await User.findOne({ collegeEmail: query });
        const userByUsername = await User.findOne({ username: query });
        if (!userByEmail && !userByUsername) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        if (userByEmail) {
            return NextResponse.json({ userByEmail }, { status: 200 });
        }
        if (userByUsername) {
            return NextResponse.json({ userByUsername }, { status: 200 });
        }
    } catch (e) {
        console.error("Validation error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}