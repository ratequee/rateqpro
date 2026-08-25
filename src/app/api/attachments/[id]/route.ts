import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { companyScope } from "@/lib/db/tenant";
import { downloadPrivateAttachment } from "@/lib/supabase/storage";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const attachment = await prisma.attachment.findFirst({
    where: { id, ...companyScope(user.companyId) },
  });
  if (!attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const file = await downloadPrivateAttachment(attachment.storageKey);
    return new NextResponse(file.bytes, {
      headers: {
        "Content-Type": attachment.mimeType || file.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.fileName)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("attachment download", error);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
