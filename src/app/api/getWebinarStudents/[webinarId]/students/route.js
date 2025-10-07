import { NextResponse } from "next/server";
import { register } from "@/instrumentation";
import mongoose from "mongoose";
import { Webinar, User } from "../../../../../../db/schema";
import { verifyFirebaseToken } from "@/lib/verifyFirebaseToken";

export async function GET(req, { params }) {
  const { webinarId } = await params;

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

    if (!mongoose.Types.ObjectId.isValid(webinarId)) {
      return NextResponse.json({ error: "Invalid webinarId" }, { status: 400 });
    }

    const webinar = await Webinar.findById(webinarId).lean();
    if (!webinar) {
      return NextResponse.json({ error: "Webinar not found" }, { status: 404 });
    }

    const studentUsernames = webinar.studentsApplied ?? [];

    const users = await User.find({
      username: { $in: studentUsernames },
    }).lean();

    const userMap = new Map(users.map((u) => [u.username, u]));

    const result = studentUsernames.map((username) => ({
      userDetails: userMap.get(username) || null,
    }));

    return NextResponse.json({ students: result }, { status: 200 });
  } catch (error) {
    console.error("Error fetching webinar registrations:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}