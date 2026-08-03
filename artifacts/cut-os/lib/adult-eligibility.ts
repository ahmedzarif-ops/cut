export const ADULT_ELIGIBILITY_POLICY_VERSION = "adult-18-v1" as const;
export const ADULT_MINIMUM_AGE = 18 as const;

export const ADULT_ELIGIBILITY_STATUSES = [
  "unverified",
  "eligible",
  "ineligible",
  "review_required",
] as const;

export type AdultEligibilityStatus =
  (typeof ADULT_ELIGIBILITY_STATUSES)[number];

export interface AdultEligibilityResponse {
  status: AdultEligibilityStatus;
  minimumAge: typeof ADULT_MINIMUM_AGE;
  policyVersion: typeof ADULT_ELIGIBILITY_POLICY_VERSION;
}

export interface AdultEligibilityQueryResolution {
  response: AdultEligibilityResponse | null;
  error: "unavailable" | "invalid" | null;
}

export type AdultEligibilityRoute =
  "adult_eligibility" | "settings" | "private";

export type AdultEligibilityRouteDecision =
  "allow_route" | "redirect_adult_eligibility" | "redirect_settings";

/**
 * Account deletion always wins. Otherwise only a verified eligible response
 * opens private health screens; unknown, failed, and non-eligible states stay
 * on the age requirement or Settings surfaces.
 */
export function decideAdultEligibilityRoute(input: {
  deletionRequired: boolean;
  route: AdultEligibilityRoute;
  status: AdultEligibilityStatus | null;
}): AdultEligibilityRouteDecision {
  if (input.deletionRequired) {
    return input.route === "settings" ? "allow_route" : "redirect_settings";
  }
  if (input.route === "settings" || input.route === "adult_eligibility") {
    return "allow_route";
  }
  return input.status === "eligible"
    ? "allow_route"
    : "redirect_adult_eligibility";
}

export function parseAdultEligibilityResponse(
  value: unknown,
): AdultEligibilityResponse {
  if (!value || typeof value !== "object") {
    throw new Error("The server returned an invalid age requirement response.");
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.status !== "string" ||
    !ADULT_ELIGIBILITY_STATUSES.includes(
      record.status as AdultEligibilityStatus,
    ) ||
    record.minimumAge !== ADULT_MINIMUM_AGE ||
    record.policyVersion !== ADULT_ELIGIBILITY_POLICY_VERSION
  ) {
    throw new Error("The server returned an unknown age requirement status.");
  }
  return {
    status: record.status as AdultEligibilityStatus,
    minimumAge: ADULT_MINIMUM_AGE,
    policyVersion: ADULT_ELIGIBILITY_POLICY_VERSION,
  };
}

/**
 * Resolve the authoritative query state with errors taking precedence over
 * retained React Query data. A failed foreground/refocus refresh must never
 * keep an older eligible result active.
 */
export function resolveAdultEligibilityQuery(
  value: unknown,
  hasError: boolean,
): AdultEligibilityQueryResolution {
  if (hasError) return { response: null, error: "unavailable" };
  if (value == null) return { response: null, error: null };
  try {
    return { response: parseAdultEligibilityResponse(value), error: null };
  } catch {
    return { response: null, error: "invalid" };
  }
}

/** A completed decision means transient DOB form memory must be erased. */
export function shouldClearAdultEligibilityInput(
  status: AdultEligibilityStatus | null,
): boolean {
  return status === "eligible" || status === "ineligible";
}

export interface DateOfBirthFields {
  month: string;
  day: string;
  year: string;
}

export type DateOfBirthValidation =
  | { ok: true; dateOfBirth: string }
  | {
      ok: false;
      field: keyof DateOfBirthFields;
      message: string;
    };

/**
 * Validates a civil calendar date without converting it through the device's
 * timezone. Eligibility itself remains a server decision.
 */
export function validateDateOfBirth(
  fields: DateOfBirthFields,
  today: string = localDayKey(new Date()),
): DateOfBirthValidation {
  const monthText = fields.month.trim();
  const dayText = fields.day.trim();
  const yearText = fields.year.trim();

  if (monthText === "") {
    return { ok: false, field: "month", message: "Enter your birth month." };
  }
  if (dayText === "") {
    return { ok: false, field: "day", message: "Enter your birth day." };
  }
  if (yearText === "") {
    return { ok: false, field: "year", message: "Enter your birth year." };
  }
  if (
    !/^\d{1,2}$/.test(monthText) ||
    !/^\d{1,2}$/.test(dayText) ||
    !/^\d{4}$/.test(yearText)
  ) {
    return {
      ok: false,
      field: !/^\d{1,2}$/.test(monthText)
        ? "month"
        : !/^\d{1,2}$/.test(dayText)
          ? "day"
          : "year",
      message: "Enter a valid date of birth.",
    };
  }

  const month = Number(monthText);
  const day = Number(dayText);
  const year = Number(yearText);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return {
      ok: false,
      field: month < 1 || month > 12 ? "month" : "day",
      message: "Enter a valid date of birth.",
    };
  }

  const dateOfBirth = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    throw new Error("A valid current day is required for date validation.");
  }
  if (dateOfBirth > today) {
    return {
      ok: false,
      field: "year",
      message: "Date of birth cannot be in the future.",
    };
  }
  return { ok: true, dateOfBirth };
}

export function formatDateOfBirth(
  dateOfBirth: string,
  locale?: string,
): string {
  const [year, month, day] = dateOfBirth.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function localDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface AdultEligibilityPrincipal {
  userId: string | null;
  sessionId: string | null;
}

export class AdultEligibilityPrincipalChangedError extends Error {
  constructor() {
    super("The active age-check principal changed.");
    this.name = "AdultEligibilityPrincipalChangedError";
  }
}

/** Carries one captured session token across the eligibility write. */
export async function executeOwnedAdultEligibilityWrite<T>(input: {
  ownerUserId: string;
  ownerSessionId: string;
  currentPrincipal(): AdultEligibilityPrincipal;
  getToken(): Promise<string | null>;
  sendRequest(token: string): Promise<T>;
}): Promise<T> {
  const assertOwner = () => {
    const current = input.currentPrincipal();
    if (
      current.userId !== input.ownerUserId ||
      current.sessionId !== input.ownerSessionId
    ) {
      throw new AdultEligibilityPrincipalChangedError();
    }
  };

  assertOwner();
  const token = await input.getToken();
  assertOwner();
  if (!token)
    throw new Error("An age-check authorization token is unavailable.");
  const response = await input.sendRequest(token);
  assertOwner();
  return response;
}
