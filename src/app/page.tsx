"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PatientFormData, EMPTY_FORM } from "@/types/patient";
import { EVENT_FORM_UPDATE, EVENT_STATUS_CHANGE } from "@/lib/pusher-client";

const SESSION_ID =
  typeof window !== "undefined"
    ? (sessionStorage.getItem("sessionId") ?? crypto.randomUUID())
    : "ssr";

if (typeof window !== "undefined") {
  sessionStorage.setItem("sessionId", SESSION_ID);
}

const LANGUAGES = [
  "Thai",
  "English",
  "Chinese",
  "Japanese",
  "Korean",
  "Arabic",
  "French",
  "German",
  "Spanish",
  "Other",
];

const NATIONALITIES = [
  "Thai",
  "American",
  "British",
  "Chinese",
  "Japanese",
  "Korean",
  "Indian",
  "Australian",
  "Canadian",
  "Other",
];

const RELIGIONS = [
  "Buddhism",
  "Christianity",
  "Islam",
  "Hinduism",
  "Sikhism",
  "Judaism",
  "Atheism",
  "Other",
];

interface FormErrors {
  [key: string]: string;
}

export default function PatientForm() {
  const [form, setForm] = useState<PatientFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerPusher = useCallback(async (event: string, data: unknown) => {
    await fetch("/api/pusher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, data }),
    });
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      triggerPusher(EVENT_STATUS_CHANGE, {
        sessionId: SESSION_ID,
        status: "inactive",
      });
    }, 30000);
  }, [triggerPusher]);

  const handleChange = useCallback(
    (field: keyof PatientFormData, value: string) => {
      setForm((prev) => {
        const updated = { ...prev, [field]: value };
        triggerPusher(EVENT_FORM_UPDATE, {
          sessionId: SESSION_ID,
          data: updated,
          lastUpdated: new Date().toISOString(),
        });
        return updated;
      });

      triggerPusher(EVENT_STATUS_CHANGE, {
        sessionId: SESSION_ID,
        status: "filling",
      });

      setErrors((prev) => ({ ...prev, [field]: "" }));
      resetInactivityTimer();
    },
    [triggerPusher, resetInactivityTimer],
  );

  useEffect(() => {
    triggerPusher(EVENT_STATUS_CHANGE, {
      sessionId: SESSION_ID,
      status: "filling",
    });
    resetInactivityTimer();

    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [triggerPusher, resetInactivityTimer]);

  // Thai mobile: 06x/08x/09x + 7 digits, landline: 02-09 + 6-7 digits, intl: +66x...
  const isValidThaiPhone = (value: string) => {
    const digits = value.replace(/[\s\-().]/g, "");
    return /^(0[689]\d{8}|0[2-57]\d{6,7}|\+66[689]\d{8})$/.test(digits);
  };

  const isValidEmail = (value: string) => {
    return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(value.trim());
  };

  const validateField = useCallback((field: keyof PatientFormData, value: string) => {
    let error = "";
    if (field === "phoneNumber") {
      if (!value.trim()) error = "Phone number is required";
      else if (!isValidThaiPhone(value)) error = "Enter a valid Thai phone number (e.g. 081-234-5678 or +66812345678)";
    }
    if (field === "email" && value) {
      if (!isValidEmail(value)) error = "Enter a valid email address (e.g. example@mail.com)";
    }
    if (error) setErrors((prev) => ({ ...prev, [field]: error }));
  }, []);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.firstName.trim()) newErrors.firstName = "First name is required";
    if (!form.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!form.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
    if (!form.gender) newErrors.gender = "Gender is required";
    if (!form.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (!isValidThaiPhone(form.phoneNumber)) {
      newErrors.phoneNumber = "Enter a valid Thai phone number (e.g. 081-234-5678 or +66812345678)";
    }
    if (form.email && !isValidEmail(form.email)) {
      newErrors.email = "Enter a valid email address (e.g. example@mail.com)";
    }
    if (!form.address.trim()) newErrors.address = "Address is required";
    if (!form.preferredLanguage)
      newErrors.preferredLanguage = "Preferred language is required";
    if (!form.nationality) newErrors.nationality = "Nationality is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    await triggerPusher(EVENT_STATUS_CHANGE, {
      sessionId: SESSION_ID,
      status: "submitted",
    });
    await triggerPusher(EVENT_FORM_UPDATE, {
      sessionId: SESSION_ID,
      data: form,
      lastUpdated: new Date().toISOString(),
    });

    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Form Submitted!
          </h2>
          <p className="text-gray-500">
            Your information has been received. Thank you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-700">
            Patient Registration
          </h1>
          <p className="text-gray-500 mt-1">
            Please fill in your personal details below
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-lg p-6 md:p-8 space-y-6"
        >
          {/* Name Section */}
          <section>
            <h2 className="text-sm font-semibold text-indigo-500 uppercase tracking-wider mb-4">
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="First Name" required error={errors.firstName}>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  placeholder="Somsri"
                  className={inputClass(errors.firstName)}
                />
              </Field>
              <Field label="Middle Name">
                <input
                  type="text"
                  value={form.middleName}
                  onChange={(e) => handleChange("middleName", e.target.value)}
                  placeholder="Optional"
                  className={inputClass()}
                />
              </Field>
              <Field label="Last Name" required error={errors.lastName}>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  placeholder="Yay"
                  className={inputClass(errors.lastName)}
                />
              </Field>
            </div>
          </section>

          {/* Basic Info */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Date of Birth" required error={errors.dateOfBirth}>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className={inputClass(errors.dateOfBirth)}
              />
            </Field>
            <Field label="Gender" required error={errors.gender}>
              <select
                value={form.gender}
                onChange={(e) => handleChange("gender", e.target.value)}
                className={inputClass(errors.gender)}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </Field>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-sm font-semibold text-indigo-500 uppercase tracking-wider mb-4">
              Contact Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Phone Number" required error={errors.phoneNumber}>
                <input
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(e) => handleChange("phoneNumber", e.target.value)}
                  onBlur={(e) => validateField("phoneNumber", e.target.value)}
                  placeholder="081-234-5678"
                  className={inputClass(errors.phoneNumber)}
                />
              </Field>
              <Field label="Email" error={errors.email}>
                <input
                  type="text"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  onBlur={(e) => validateField("email", e.target.value)}
                  placeholder="example@mail.com"
                  className={inputClass(errors.email)}
                />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Address" required error={errors.address}>
                <textarea
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="123 Main St, City, Country"
                  rows={3}
                  className={inputClass(errors.address)}
                />
              </Field>
            </div>
          </section>

          {/* Background */}
          <section>
            <h2 className="text-sm font-semibold text-indigo-500 uppercase tracking-wider mb-4">
              Background
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="Preferred Language"
                required
                error={errors.preferredLanguage}
              >
                <select
                  value={form.preferredLanguage}
                  onChange={(e) =>
                    handleChange("preferredLanguage", e.target.value)
                  }
                  className={inputClass(errors.preferredLanguage)}
                >
                  <option value="">Select language</option>
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Nationality" required error={errors.nationality}>
                <select
                  value={form.nationality}
                  onChange={(e) => handleChange("nationality", e.target.value)}
                  className={inputClass(errors.nationality)}
                >
                  <option value="">Select nationality</option>
                  {NATIONALITIES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Religion">
                <select
                  value={form.religion}
                  onChange={(e) => handleChange("religion", e.target.value)}
                  className={inputClass()}
                >
                  <option value="">Select religion (optional)</option>
                  {RELIGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          {/* Emergency Contact */}
          <section>
            <h2 className="text-sm font-semibold text-indigo-500 uppercase tracking-wider mb-4">
              Emergency Contact{" "}
              <span className="text-gray-400 font-normal">(Optional)</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Contact Name">
                <input
                  type="text"
                  value={form.emergencyContactName}
                  onChange={(e) =>
                    handleChange("emergencyContactName", e.target.value)
                  }
                  placeholder="Jane Doe"
                  className={inputClass()}
                />
              </Field>
              <Field label="Relationship">
                <input
                  type="text"
                  value={form.emergencyContactRelationship}
                  onChange={(e) =>
                    handleChange("emergencyContactRelationship", e.target.value)
                  }
                  placeholder="Spouse, Parent, Sibling..."
                  className={inputClass()}
                />
              </Field>
            </div>
          </section>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold rounded-xl transition-colors duration-200 text-base"
          >
            {submitting ? "Submitting..." : "Submit Registration"}
          </button>
        </form>
      </div>
    </div>
  );
}

function inputClass(error?: string) {
  return `w-full px-4 py-2.5 rounded-lg border text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-colors ${
    error
      ? "border-red-400 focus:ring-red-300 bg-red-50"
      : "border-gray-300 focus:ring-indigo-300 focus:border-indigo-400 bg-white"
  }`;
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
