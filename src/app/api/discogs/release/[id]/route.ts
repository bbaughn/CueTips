import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDiscogsRelease } from "@/lib/discogs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const discogsId = parseInt(id, 10);
  if (isNaN(discogsId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const data = await getDiscogsRelease(discogsId);
  return NextResponse.json(data);
}
