import type { ReactElement } from "react";
import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { PROFILE_ID } from "@/services/profile";
import { startReminderScheduler } from "@/services/reminders";
import { AppLayout } from "@/layouts/AppLayout";
import { Onboarding } from "@/pages/Onboarding";
import { Dashboard } from "@/pages/Dashboard";
import { NotFound } from "@/pages/NotFound";

const LogHub = lazy(() => import("@/pages/LogHub").then((m) => ({ default: m.LogHub })));
const Weight = lazy(() => import("@/pages/Weight").then((m) => ({ default: m.Weight })));
const Nutrition = lazy(() => import("@/pages/Nutrition").then((m) => ({ default: m.Nutrition })));
const Water = lazy(() => import("@/pages/Water").then((m) => ({ default: m.Water })));
const Exercise = lazy(() => import("@/pages/Exercise").then((m) => ({ default: m.Exercise })));
const Sleep = lazy(() => import("@/pages/Sleep").then((m) => ({ default: m.Sleep })));
const Medication = lazy(() => import("@/pages/Medication").then((m) => ({ default: m.Medication })));
const Symptoms = lazy(() => import("@/pages/Symptoms").then((m) => ({ default: m.Symptoms })));
const Safety = lazy(() => import("@/pages/Safety").then((m) => ({ default: m.Safety })));
const Measurements = lazy(() => import("@/pages/Measurements").then((m) => ({ default: m.Measurements })));
const Progress = lazy(() => import("@/pages/Progress").then((m) => ({ default: m.Progress })));
const CheckIn = lazy(() => import("@/pages/CheckIn").then((m) => ({ default: m.CheckIn })));
const WeeklyReview = lazy(() => import("@/pages/WeeklyReview").then((m) => ({ default: m.WeeklyReview })));
const Habits = lazy(() => import("@/pages/Habits").then((m) => ({ default: m.Habits })));
const Insights = lazy(() => import("@/pages/Insights").then((m) => ({ default: m.Insights })));
const Profile = lazy(() => import("@/pages/Profile").then((m) => ({ default: m.Profile })));
const SettingsPage = lazy(() => import("@/pages/Settings").then((m) => ({ default: m.SettingsPage })));

type ProfileLookup = { status: "loading" } | { status: "found" } | { status: "none" };

const LOADING: ProfileLookup = { status: "loading" };

function RequireOnboarding({ children }: { children: ReactElement }) {
  // A plain `useLiveQuery(() => db.users.get(id), [])` can't tell "still
  // loading" apart from "confirmed no profile" — both resolve to
  // `undefined`. Without this distinction the onboarding redirect below
  // never fires when there truly is no profile, since the loading guard
  // swallows that case forever.
  const lookup =
    useLiveQuery<ProfileLookup, ProfileLookup>(
      async () => {
        const profile = await db.users.get(PROFILE_ID);
        return profile ? { status: "found" } : { status: "none" };
      },
      [],
      LOADING,
    ) ?? LOADING;

  if (lookup.status === "loading") return null;
  if (lookup.status === "none") return <Navigate to="/onboarding" replace />;
  return children;
}

function RouteFallback() {
  return <div className="p-6 text-sm text-text-muted">Loading…</div>;
}

export default function App() {
  useEffect(() => startReminderScheduler(), []);

  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route
            element={
              <RequireOnboarding>
                <AppLayout title="FitJourney" />
              </RequireOnboarding>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/log" element={<LogHub />} />
            <Route path="/weight" element={<Weight />} />
            <Route path="/nutrition" element={<Nutrition />} />
            <Route path="/water" element={<Water />} />
            <Route path="/exercise" element={<Exercise />} />
            <Route path="/sleep" element={<Sleep />} />
            <Route path="/medication" element={<Medication />} />
            <Route path="/symptoms" element={<Symptoms />} />
            <Route path="/safety" element={<Safety />} />
            <Route path="/measurements" element={<Measurements />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/check-in" element={<CheckIn />} />
            <Route path="/weekly-review" element={<WeeklyReview />} />
            <Route path="/habits" element={<Habits />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
