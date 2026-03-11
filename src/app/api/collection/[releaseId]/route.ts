import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ releaseId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { releaseId } = await params;

  await prisma.userCollection.delete({
    where: {
      userId_releaseId: {
        userId: session.user.id,
        releaseId,
      },
    },
  });

  return NextResponse.json({ success: true });
}
