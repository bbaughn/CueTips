import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchDiscogs } from "@/lib/discogs";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  if (!q) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  const data = await searchDiscogs(q);
  return NextResponse.json(data);
}
