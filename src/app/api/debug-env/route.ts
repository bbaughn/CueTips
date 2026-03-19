import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasDatabaseUrlDirect: !!process.env.DATABASE_URL_DIRECT,
    databaseUrlDirectPrefix: process.env.DATABASE_URL_DIRECT?.substring(0, 20) || "NOT SET",
    nodeEnv: process.env.NODE_ENV,
    envKeys: Object.keys(process.env).filter(k => k.includes("DATABASE") || k.includes("NEXT")),
  });
}
