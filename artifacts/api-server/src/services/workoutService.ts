import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  workoutEntriesTable,
  workoutExercisesTable,
  type User,
  type WorkoutEntry,
  type WorkoutExercise,
} from "@workspace/db";
import { systemClock, todayKey, type Clock } from "@workspace/domain";

import { HttpError } from "../lib/httpError";

export type WorkoutKind = "strength" | "cardio" | "recovery";

export interface WorkoutExerciseInput {
  name: string;
  sets: number | null;
  reps: number | null;
  loadKg: number | null;
  durationMinutes: number | null;
  distanceKm: number | null;
  caloriesKcal: number | null;
}

export interface CreateWorkoutInput {
  clientRequestId: string;
  dayKey: string;
  kind: WorkoutKind;
  name: string;
  notes: string | null;
  exercises: WorkoutExerciseInput[];
}

export interface WorkoutExerciseResponse {
  id: string;
  name: string;
  position: number;
  sets: number | null;
  reps: number | null;
  loadKg: number | null;
  durationMinutes: number | null;
  distanceKm: number | null;
  caloriesKcal: number | null;
}

export interface WorkoutResponse {
  id: string;
  clientRequestId: string;
  loggedOn: string;
  kind: WorkoutKind;
  name: string;
  notes: string | null;
  exercises: WorkoutExerciseResponse[];
  createdAt: Date;
  updatedAt: Date;
}

function toExerciseResponse(
  exercise: WorkoutExercise,
): WorkoutExerciseResponse {
  return {
    id: exercise.id,
    name: exercise.name,
    position: exercise.position,
    sets: exercise.sets,
    reps: exercise.reps,
    loadKg: exercise.loadKg,
    durationMinutes: exercise.durationMinutes,
    distanceKm: exercise.distanceKm,
    caloriesKcal: exercise.caloriesKcal,
  };
}

function toWorkoutResponse(
  entry: WorkoutEntry,
  exercises: WorkoutExercise[],
): WorkoutResponse {
  return {
    id: entry.id,
    clientRequestId: entry.clientRequestId,
    loggedOn: entry.loggedOn,
    kind: entry.kind as WorkoutKind,
    name: entry.name,
    notes: entry.notes,
    exercises: exercises.map(toExerciseResponse),
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

function validateWorkout(input: CreateWorkoutInput): void {
  if (input.kind === "strength") {
    if (
      input.exercises.length === 0 ||
      input.exercises.some(
        (exercise) => exercise.sets === null || exercise.reps === null,
      )
    ) {
      throw new HttpError(
        400,
        "Strength workouts require sets and reps for every exercise",
      );
    }
  }
  if (
    input.kind === "cardio" &&
    (input.exercises.length === 0 ||
      input.exercises.some((exercise) => exercise.durationMinutes === null))
  ) {
    throw new HttpError(
      400,
      "Cardio workouts require a duration for every activity",
    );
  }
  if (input.kind === "recovery" && input.exercises.length > 0) {
    throw new HttpError(400, "Recovery days do not include exercise rows");
  }
}

async function exercisesForEntries(
  entryIds: string[],
): Promise<WorkoutExercise[]> {
  if (entryIds.length === 0) return [];
  return db
    .select()
    .from(workoutExercisesTable)
    .where(inArray(workoutExercisesTable.workoutEntryId, entryIds))
    .orderBy(
      asc(workoutExercisesTable.workoutEntryId),
      asc(workoutExercisesTable.position),
    );
}

async function getWorkoutByClientRequest(
  userId: string,
  clientRequestId: string,
): Promise<WorkoutResponse | undefined> {
  const [entry] = await db
    .select()
    .from(workoutEntriesTable)
    .where(
      and(
        eq(workoutEntriesTable.userId, userId),
        eq(workoutEntriesTable.clientRequestId, clientRequestId),
      ),
    );
  if (!entry) return undefined;
  const exercises = await exercisesForEntries([entry.id]);
  return toWorkoutResponse(entry, exercises);
}

export async function createMyWorkout(
  user: User,
  input: CreateWorkoutInput,
  deviceTimeZone: string,
  clock: Clock = systemClock,
): Promise<WorkoutResponse> {
  const loggedOn = todayKey(clock, deviceTimeZone);
  if (input.dayKey !== loggedOn) {
    throw new HttpError(
      412,
      "Today changed. Refresh and review your workout before saving",
    );
  }
  validateWorkout(input);

  const existing = await getWorkoutByClientRequest(
    user.id,
    input.clientRequestId,
  );
  if (existing) return existing;

  const inserted = await db.transaction(async (tx) => {
    const [entry] = await tx
      .insert(workoutEntriesTable)
      .values({
        userId: user.id,
        clientRequestId: input.clientRequestId,
        loggedOn,
        kind: input.kind,
        name: input.name.trim(),
        notes: input.notes?.trim() || null,
      })
      .onConflictDoNothing({
        target: [
          workoutEntriesTable.userId,
          workoutEntriesTable.clientRequestId,
        ],
      })
      .returning();
    if (!entry) return null;

    const exercises =
      input.exercises.length === 0
        ? []
        : await tx
            .insert(workoutExercisesTable)
            .values(
              input.exercises.map((exercise, position) => ({
                workoutEntryId: entry.id,
                position,
                name: exercise.name.trim(),
                sets: exercise.sets,
                reps: exercise.reps,
                loadKg: exercise.loadKg,
                durationMinutes: exercise.durationMinutes,
                distanceKm: exercise.distanceKm,
                caloriesKcal: exercise.caloriesKcal,
              })),
            )
            .returning();
    return toWorkoutResponse(entry, exercises);
  });

  if (inserted) return inserted;
  const concurrent = await getWorkoutByClientRequest(
    user.id,
    input.clientRequestId,
  );
  if (!concurrent) throw new HttpError(500, "Unable to save workout");
  return concurrent;
}

export async function listMyWorkouts(
  userId: string,
  limit = 20,
): Promise<WorkoutResponse[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 90) {
    throw new HttpError(
      400,
      "Workout history limit must be a whole number from 1 to 90",
    );
  }
  const entries = await db
    .select()
    .from(workoutEntriesTable)
    .where(eq(workoutEntriesTable.userId, userId))
    .orderBy(
      desc(workoutEntriesTable.loggedOn),
      desc(workoutEntriesTable.createdAt),
      desc(workoutEntriesTable.id),
    )
    .limit(limit);
  const exercises = await exercisesForEntries(entries.map(({ id }) => id));
  const byEntry = new Map<string, WorkoutExercise[]>();
  for (const exercise of exercises) {
    const rows = byEntry.get(exercise.workoutEntryId) ?? [];
    rows.push(exercise);
    byEntry.set(exercise.workoutEntryId, rows);
  }
  return entries.map((entry) =>
    toWorkoutResponse(entry, byEntry.get(entry.id) ?? []),
  );
}

export async function deleteMyWorkout(
  userId: string,
  workoutId: string,
): Promise<boolean> {
  const deleted = await db
    .delete(workoutEntriesTable)
    .where(
      and(
        eq(workoutEntriesTable.id, workoutId),
        eq(workoutEntriesTable.userId, userId),
      ),
    )
    .returning({ id: workoutEntriesTable.id });
  return deleted.length > 0;
}
