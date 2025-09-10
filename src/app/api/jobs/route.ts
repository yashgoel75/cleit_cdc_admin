import { NextResponse } from "next/server";
import { register } from "@/instrumentation";
import { Job } from "../../../../db/schema";

export async function GET() {
  try {
    await register();
    const jobs = await Job.find().sort({ createdAt: -1 }).populate('studentsApplied');
    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("GET /api/jobs error:", error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { newJob } = body;

    await register();
    const job = new Job(newJob);
    await job.save();

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    console.error("POST /api/jobs error:", error);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { jobId, updates } = body;

    await register();
    const updatedJob = await Job.findByIdAndUpdate(jobId, updates, { new: true });

    if (!updatedJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ job: updatedJob });
  } catch (error) {
    console.error("PATCH /api/jobs error:", error);
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { jobId } = body;

    await register();
    const deletedJob = await Job.findByIdAndDelete(jobId);

    if (!deletedJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Job deleted" });
  } catch (error) {
    console.error("DELETE /api/jobs error:", error);
    return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
  }
}
