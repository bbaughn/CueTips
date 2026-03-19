import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const result = await prisma.$queryRawUnsafe("SELECT 1 as ok");
    return NextResponse.json({ db: "connected", result });
  } catch (e: unknown) {
    const err = e as Error;
    return NextResponse.json({ db: "failed", error: err.message }, { status: 500 });
  }
}
