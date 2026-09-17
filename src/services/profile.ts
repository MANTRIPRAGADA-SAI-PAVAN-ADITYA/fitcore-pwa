import { db } from "@/db/db";
import type { UserProfile } from "@/types/models";

/** FitJourney is single-profile-per-device; this is a stable singleton id. */
export const PROFILE_ID = "me";

export type ProfileInput = Omit<UserProfile, "id" | "createdAt" | "updatedAt" | "onboardedAt">;

export async function getProfile(): Promise<UserProfile | undefined> {
  return db.users.get(PROFILE_ID);
}

export async function completeOnboarding(input: ProfileInput): Promise<void> {
  const now = new Date().toISOString();
  await db.users.put({
    ...input,
    id: PROFILE_ID,
    onboardedAt: now,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateProfile(patch: Partial<ProfileInput>): Promise<void> {
  const existing = await db.users.get(PROFILE_ID);
  if (!existing) throw new Error("Profile does not exist yet — complete onboarding first.");
  await db.users.update(PROFILE_ID, { ...patch, updatedAt: new Date().toISOString() });
}

/** Used only by import/backup restore, where the full record (incl. id) is known. */
export async function restoreProfile(profile: UserProfile): Promise<void> {
  await db.users.put({ ...profile, id: PROFILE_ID });
}
