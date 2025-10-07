import { NextResponse } from "next/server";
import { register } from "@/instrumentation";
import { Webinar } from "../../../../db/schema";
import { verifyFirebaseToken } from "@/lib/verifyFirebaseToken";

export async function GET(req: Request) {
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
    const webinars = await Webinar.find().sort({ createdAt: -1 });
    return NextResponse.json({ webinars });
  } catch (error) {
    console.error("GET /api/webinars error:", error);
    return NextResponse.json({ error: "Failed to fetch webinars" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { newWebinar } = body;
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
    const webinar = new Webinar(newWebinar);
    await webinar.save();
    return NextResponse.json({ webinar }, { status: 201 });
  } catch (error) {
    console.error("POST /api/webinars error:", error);
    return NextResponse.json({ error: "Failed to create webinar" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { webinarId, updates } = body;
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
    const updatedWebinar = await Webinar.findByIdAndUpdate(webinarId, updates, { new: true });
    if (!updatedWebinar) {
      return NextResponse.json({ error: "Webinar not found" }, { status: 404 });
    }
    return NextResponse.json({ webinar: updatedWebinar });
  } catch (error) {
    console.error("PATCH /api/webinars error:", error);
    return NextResponse.json({ error: "Failed to update webinar" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { webinarId } = body;
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
    const deletedWebinar = await Webinar.findByIdAndDelete(webinarId);
    if (!deletedWebinar) {
      return NextResponse.json({ error: "Webinar not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Webinar deleted" });
  } catch (error) {
    console.error("DELETE /api/webinars error:", error);
    return NextResponse.json({ error: "Failed to delete webinar" }, { status: 500 });
  }
}