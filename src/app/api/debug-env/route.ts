import { NextResponse } from "next/server";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

export async function GET() {
  const connString = process.env.DATABASE_URL_DIRECT;
  try {
    const pool = new Pool({ connectionString: connString! });
    const result = await pool.query("SELECT 1 as ok");
    await pool.end();
    return NextResponse.json({ db: "connected", result: result.rows });
  } catch (e: unknown) {
    const err = e as Error;
    return NextResponse.json({
      db: "failed",
      error: err.message,
      connStringLength: connString?.length,
      connStringStart: connString?.substring(0, 30),
    }, { status: 500 });
  }
}
