"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireReviewer() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  const roles = session.user.roles ?? [];
  if (!roles.includes("ADMIN") && !roles.includes("CHAPTER_LEAD")) throw new Error("Forbidden");
  return session;
}

export async function approveCurriculum(formData: FormData) {
  const session = await requireReviewer();
  const id = formData.get("id") as string;
  if (!id) throw new Error("Missing curriculum id");

  await prisma.classTemplate.update({
    where: { id },
    data: {
      submissionStatus: "APPROVED",
      reviewedById: session.user.id,
    },
  });

  revalidatePath("/admin/curricula");
  revalidatePath("/instructor/curriculum-builder");
}

export async function requestCurriculumRevision(formData: FormData) {
  const session = await requireReviewer();
  const id = formData.get("id") as string;
  const reviewNotes = (formData.get("reviewNotes") as string || "").trim();
  if (!id) throw new Error("Missing curriculum id");
  if (!reviewNotes) throw new Error("Review notes are required when requesting revision");

  await prisma.classTemplate.update({
    where: { id },
    data: {
      submissionStatus: "NEEDS_REVISION",
      reviewedById: session.user.id,
      reviewNotes,
    },
  });

  revalidatePath("/admin/curricula");
  revalidatePath("/instructor/curriculum-builder");
}
