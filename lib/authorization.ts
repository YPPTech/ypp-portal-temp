import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

// Zod schema for validating user-supplied RoleType values before DB writes.
export const RoleTypeSchema = z.enum([
  "ADMIN",
  "INSTRUCTOR",
  "STUDENT",
  "MENTOR",
  "CHAPTER_LEAD",
  "STAFF",
  "PARENT",
  "APPLICANT",
]);

/** Parse and validate a single role string from user input. Throws on invalid value. */
export function parseRoleType(value: unknown): string {
  return RoleTypeSchema.parse(value);
}

/** Parse and validate an array of role strings from user input. Throws on any invalid value. */
export function parseRoleTypes(values: unknown[]): string[] {
  return values.map((v) => RoleTypeSchema.parse(v));
}

type SessionRoleEntry = string | { role?: string } | null | undefined;

export type SessionUser = {
  id: string;
  roles: string[];
  primaryRole: string;
};

export function normalizeRoleSet(
  roles: SessionRoleEntry[] | undefined | null,
  primaryRole?: string | null
): Set<string> {
  const roleSet = new Set<string>();

  if (typeof primaryRole === "string" && primaryRole.trim()) {
    roleSet.add(primaryRole.trim());
  }

  if (!Array.isArray(roles)) {
    return roleSet;
  }

  for (const role of roles) {
    if (typeof role === "string" && role.trim()) {
      roleSet.add(role.trim());
      continue;
    }

    if (
      role &&
      typeof role === "object" &&
      typeof role.role === "string" &&
      role.role.trim()
    ) {
      roleSet.add(role.role.trim());
    }
  }

  return roleSet;
}

export function hasRole(
  roles: SessionRoleEntry[] | undefined | null,
  role: string,
  primaryRole?: string | null
): boolean {
  return normalizeRoleSet(roles, primaryRole).has(role);
}

export function hasAnyRole(
  roles: SessionRoleEntry[] | undefined | null,
  requiredRoles: string[],
  primaryRole?: string | null
): boolean {
  if (requiredRoles.length === 0) return false;
  const roleSet = normalizeRoleSet(roles, primaryRole);
  return requiredRoles.some((role) => roleSet.has(role));
}

export async function requireSessionUser(): Promise<SessionUser> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const roleSet = normalizeRoleSet(session.user.roles as SessionRoleEntry[], session.user.primaryRole ?? null);
  const roles = Array.from(roleSet);
  const primaryRole = session.user.primaryRole ?? roles[0] ?? "STUDENT";

  return {
    id: session.user.id,
    roles,
    primaryRole,
  };
}

export async function requireAnyRole(requiredRoles: string[]): Promise<SessionUser> {
  const sessionUser = await requireSessionUser();
  if (!hasAnyRole(sessionUser.roles, requiredRoles)) {
    throw new Error("Unauthorized");
  }
  return sessionUser;
}
