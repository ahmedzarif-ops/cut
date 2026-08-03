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
  type NutritionFacts,
} from "@workspace/domain";

import { HttpError } from "../lib/httpError";
import { getMealEntriesForDay, nutritionTotals } from "./mealService";

export interface TodayState {
  dayKey: string;
  nextAction: NextAction;
  weightEntry: WeightEntry | null;
  mealCount: number;
  nutritionTotals: NutritionFacts;
}

export interface ReviewedWeightEntryInput {
  dayKey: string;
  weightKg: number;
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
  deviceTimeZone: string,
  clock: Clock = systemClock,
): Promise<TodayState> {
  const dayKey = todayKey(clock, deviceTimeZone);
  const [weightEntry, mealEntries] = await Promise.all([
    getWeightEntryForDay(user.id, dayKey),
    getMealEntriesForDay(user.id, dayKey),
  ]);
  return {
    dayKey,
    nextAction: selectNextAction({
      onboardingComplete: user.onboardingComplete,
      hasWeightToday: Boolean(weightEntry),
      hasMealToday: mealEntries.length > 0,
    }),
    weightEntry: weightEntry ?? null,
    mealCount: mealEntries.length,
    nutritionTotals: nutritionTotals(mealEntries),
  };
}

export async function upsertTodayWeight(
  user: User,
  input: ReviewedWeightEntryInput,
  deviceTimeZone: string,
  clock: Clock = systemClock,
): Promise<WeightEntry | undefined> {
  const recordedOn = todayKey(clock, deviceTimeZone);
  if (input.dayKey !== recordedOn) {
    throw new HttpError(
      412,
      "Today changed. Refresh and review your weigh-in before saving",
    );
  }

  const [entry] = await db
    .insert(weightEntriesTable)
    .values({ userId: user.id, recordedOn, weightKg: input.weightKg })
    .onConflictDoUpdate({
      target: [weightEntriesTable.userId, weightEntriesTable.recordedOn],
      set: { weightKg: input.weightKg, updatedAt: clock.now() },
    })
    .returning();
  return entry;
}

export async function listWeightEntries(
  userId: string,
  limit = 14,
): Promise<WeightEntry[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 90) {
    throw new HttpError(
      400,
      "Weight history limit must be a whole number from 1 to 90",
    );
  }

  return db
    .select()
    .from(weightEntriesTable)
    .where(eq(weightEntriesTable.userId, userId))
    .orderBy(desc(weightEntriesTable.recordedOn))
    .limit(limit);
}
