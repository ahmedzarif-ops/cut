import { db, usersTable, type User } from "@workspace/db";

/**
 * Just-in-time user provisioning. Upserts on the unique clerk_user_id;
 * onConflictDoUpdate always returns the row (inserted or existing), avoiding a
 * select+insert race. Returns undefined only if the write returned no row.
 */
export async function provisionUser(input: {
  clerkUserId: string;
  email: string | null;
}): Promise<User | undefined> {
  const [user] = await db
    .insert(usersTable)
    .values({ clerkUserId: input.clerkUserId, email: input.email })
    .onConflictDoUpdate({
      target: usersTable.clerkUserId,
      set: { updatedAt: new Date() },
    })
    .returning();
  return user;
}
