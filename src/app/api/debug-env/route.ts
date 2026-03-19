import { NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

export async function GET() {
  const connString = process.env.DATABASE_URL_DIRECT!;
  try {
    const adapter = new PrismaNeon({ connectionString: connString });
    const prisma = new PrismaClient({ adapter });
    const count = await prisma.user.count();
    return NextResponse.json({ db: "connected", userCount: count });
  } catch (e: unknown) {
    const err = e as Error;
    return NextResponse.json({
      db: "failed",
      error: err.message,
      stack: err.stack?.split("\n").slice(0, 5),
    }, { status: 500 });
  }
}
