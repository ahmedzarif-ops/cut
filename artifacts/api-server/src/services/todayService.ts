import { and, desc, eq } from "drizzle-orm";
import {
  db,
  weightEntriesTable,
  type User,
  type WeightEntry,
} from "@workspace/db";
import {
  selectNextAction,
  systemClock,
  todayKey,
  type Clock,
  type NextAction,
} from "@workspace/domain";

export interface TodayState {
  dayKey: string;
  nextAction: NextAction;
  weightEntry: WeightEntry | null;
}

export async function getWeightEntryForDay(
  userId: string,
  recordedOn: string,
): Promise<WeightEntry | undefined> {
  const [entry] = await db
    .select()
    .from(weightEntriesTable)
    .where(
      and(
        eq(weightEntriesTable.userId, userId),
        eq(weightEntriesTable.recordedOn, recordedOn),
      ),
    );
  return entry;
}

export async function getTodayState(
  user: User,
  clock: Clock = systemClock,
): Promise<TodayState> {
  const dayKey = todayKey(clock, user.timezone);
  const weightEntry = await getWeightEntryForDay(user.id, dayKey);
  return {
    dayKey,
    nextAction: selectNextAction({
      onboardingComplete: user.onboardingComplete,
      hasWeightToday: Boolean(weightEntry),
    }),
    weightEntry: weightEntry ?? null,
  };
}

export async function upsertTodayWeight(
  user: User,
  weightKg: number,
  clock: Clock = systemClock,
): Promise<WeightEntry | undefined> {
  const recordedOn = todayKey(clock, user.timezone);
  const [entry] = await db
    .insert(weightEntriesTable)
    .values({ userId: user.id, recordedOn, weightKg })
    .onConflictDoUpdate({
      target: [weightEntriesTable.userId, weightEntriesTable.recordedOn],
      set: { weightKg, updatedAt: clock.now() },
    })
    .returning();
  return entry;
}

export async function listWeightEntries(
  userId: string,
  limit = 14,
): Promise<WeightEntry[]> {
  return db
    .select()
    .from(weightEntriesTable)
    .where(eq(weightEntriesTable.userId, userId))
    .orderBy(desc(weightEntriesTable.recordedOn))
    .limit(limit);
}
