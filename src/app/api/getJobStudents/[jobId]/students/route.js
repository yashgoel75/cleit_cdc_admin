import { NextResponse } from "next/server";
import { register } from "@/instrumentation";
import mongoose from "mongoose";
import { Job, User } from "../../../../../../db/schema";
import { verifyFirebaseToken } from "@/lib/verifyFirebaseToken";

export async function GET(req, { params }) {
  const { jobId } = await params;

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

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return NextResponse.json({ error: "Invalid jobId" }, { status: 400 });
    }

    const job = await Job.findById(jobId).lean();
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const studentEmails = (job.studentsApplied ?? []).map((app) => app.email);

    const users = await User.find({
      $or: [
        { personalEmail: { $in: studentEmails } },
        { collegeEmail: { $in: studentEmails } },
      ],
    }).lean();

    const result = (job.studentsApplied ?? []).map((application) => {
      const user = users.find(
        (u) =>
          u.personalEmail === application.email ||
          u.collegeEmail === application.email
      );

      return {
        applicationDetails: application,
        userDetails: user || null,
      };
    });

    return NextResponse.json({ students: result }, { status: 200 });
  } catch (error) {
    console.error("Error fetching job applicants:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
