"use client";

import { useEffect, useState } from "react";
import { getPusherClient, CHANNEL_NAME, EVENT_FORM_UPDATE, EVENT_STATUS_CHANGE } from "@/lib/pusher-client";
import { PatientFormData, PatientStatus, EMPTY_FORM } from "@/types/patient";

interface PatientSession {
  sessionId: string;
  status: PatientStatus;
  data: PatientFormData;
  lastUpdated: string;
}

const FIELD_LABELS: { key: keyof PatientFormData; label: string }[] = [
  { key: "firstName", label: "First Name" },
  { key: "middleName", label: "Middle Name" },
  { key: "lastName", label: "Last Name" },
  { key: "dateOfBirth", label: "Date of Birth" },
  { key: "gender", label: "Gender" },
  { key: "phoneNumber", label: "Phone Number" },
  { key: "email", label: "Email" },
  { key: "address", label: "Address" },
  { key: "preferredLanguage", label: "Preferred Language" },
  { key: "nationality", label: "Nationality" },
  { key: "religion", label: "Religion" },
  { key: "emergencyContactName", label: "Emergency Contact" },
  { key: "emergencyContactRelationship", label: "Relationship" },
];

const STATUS_CONFIG: Record<PatientStatus, { label: string; color: string; dot: string }> = {
  filling: {
    label: "Filling in",
    color: "bg-blue-50 border-blue-200 text-blue-700",
    dot: "bg-blue-500 animate-pulse",
  },
  submitted: {
    label: "Submitted",
    color: "bg-green-50 border-green-200 text-green-700",
    dot: "bg-green-500",
  },
  inactive: {
    label: "Inactive",
    color: "bg-gray-50 border-gray-200 text-gray-500",
    dot: "bg-gray-400",
  },
};

export default function StaffView() {
  const [sessions, setSessions] = useState<Record<string, PatientSession>>({});

  useEffect(() => {
    const client = getPusherClient();
    if (!client) return;

    const channel = client.subscribe(CHANNEL_NAME);

    channel.bind(EVENT_FORM_UPDATE, (payload: { sessionId: string; data: PatientFormData; lastUpdated: string }) => {
      setSessions((prev) => ({
        ...prev,
        [payload.sessionId]: {
          ...(prev[payload.sessionId] ?? {
            sessionId: payload.sessionId,
            status: "filling" as PatientStatus,
            data: EMPTY_FORM,
          }),
          data: payload.data,
          lastUpdated: payload.lastUpdated,
        },
      }));
    });

    channel.bind(EVENT_STATUS_CHANGE, (payload: { sessionId: string; status: PatientStatus }) => {
      setSessions((prev) => {
        const existing = prev[payload.sessionId];
        return {
          ...prev,
          [payload.sessionId]: {
            sessionId: payload.sessionId,
            status: payload.status,
            data: existing?.data ?? EMPTY_FORM,
            lastUpdated: existing?.lastUpdated ?? new Date().toISOString(),
          },
        };
      });
    });

    return () => {
      client.unsubscribe(CHANNEL_NAME);
    };
  }, []);

  const sessionList = Object.values(sessions);
  const fillingCount = sessionList.filter((s) => s.status === "filling").length;
  const submittedCount = sessionList.filter((s) => s.status === "submitted").length;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Staff Dashboard</h1>
            <p className="text-sm text-gray-500">Real-time patient form monitoring</p>
          </div>
          <div className="flex gap-3">
            <StatBadge label="Filling" count={fillingCount} color="bg-blue-100 text-blue-700" />
            <StatBadge label="Submitted" count={submittedCount} color="bg-green-100 text-green-700" />
            <StatBadge label="Total" count={sessionList.length} color="bg-gray-100 text-gray-700" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {sessionList.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {sessionList.map((session) => (
              <SessionCard key={session.sessionId} session={session} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function SessionCard({ session }: { session: PatientSession }) {
  const cfg = STATUS_CONFIG[session.status];

  const filledFields = FIELD_LABELS.filter(
    ({ key }) => session.data[key]?.trim()
  ).length;
  const progress = Math.round((filledFields / FIELD_LABELS.length) * 100);

  return (
    <div className={`bg-white rounded-xl border-2 shadow-sm overflow-hidden transition-all duration-300 ${cfg.color}`}>
      {/* Card Header */}
      <div className="px-5 py-4 border-b border-current/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
          <span className="text-sm font-semibold">{cfg.label}</span>
        </div>
        <div className="text-right">
          <p className="text-xs opacity-60">Session</p>
          <p className="text-xs font-mono font-medium">{session.sessionId.slice(0, 8)}…</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-5 pt-4">
        <div className="flex items-center justify-between text-xs mb-1.5 opacity-70">
          <span>Form completion</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-current/10 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full bg-current transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Fields */}
      <div className="px-5 py-4 space-y-2">
        {FIELD_LABELS.map(({ key, label }) => {
          const value = session.data[key];
          return (
            <div key={key} className="flex justify-between items-start gap-2 text-sm">
              <span className="text-xs font-medium opacity-60 shrink-0 w-32">{label}</span>
              <span className={`text-xs text-right break-all font-medium ${value ? "opacity-90" : "opacity-30 italic"}`}>
                {value || "—"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-5 pb-4">
        <p className="text-xs opacity-50">
          Last updated:{" "}
          {session.lastUpdated
            ? new Date(session.lastUpdated).toLocaleTimeString()
            : "—"}
        </p>
      </div>
    </div>
  );
}

function StatBadge({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${color}`}>
      <span className="font-bold">{count}</span>
      <span>{label}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-600 mb-1">Waiting for patients</h3>
      <p className="text-sm text-gray-400">
        Patient data will appear here in real-time once they open the form.
      </p>
    </div>
  );
}
