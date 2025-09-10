import { NextResponse } from "next/server";
import { register } from "@/instrumentation";
import { Test } from "../../../../db/schema";

export async function GET() {
  try {
    await register();
    const tests = await Test.find().sort({ createdAt: -1 });
    return NextResponse.json({ tests });
  } catch (error) {
    console.error("GET /api/tests error:", error);
    return NextResponse.json({ error: "Failed to fetch tests" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { newTest } = body;
    console.log(body);
    await register();
    const test = new Test(newTest);
    await test.save();

    return NextResponse.json({ test }, { status: 201 });
  } catch (error) {
    console.error("POST /api/tests error:", error);
    return NextResponse.json({ error: "Failed to create test" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { testId, updates } = body;
    console.log(body);
    await register();
    const updatedTest = await Test.findByIdAndUpdate(testId, updates, { new: true });

    if (!updatedTest) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    return NextResponse.json({ test: updatedTest });
  } catch (error) {
    console.error("PATCH /api/tests error:", error);
    return NextResponse.json({ error: "Failed to update test" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { testId } = body;

    await register();
    const deletedTest = await Test.findByIdAndDelete(testId);

    if (!deletedTest) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Test deleted" });
  } catch (error) {
    console.error("DELETE /api/tests error:", error);
    return NextResponse.json({ error: "Failed to delete test" }, { status: 500 });
  }
}
