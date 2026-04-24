import { NextRequest, NextResponse } from "next/server";
import { pusherServer, CHANNEL_NAME } from "@/lib/pusher-server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { event, data } = body;

  await pusherServer.trigger(CHANNEL_NAME, event, data);

  return NextResponse.json({ ok: true });
}
