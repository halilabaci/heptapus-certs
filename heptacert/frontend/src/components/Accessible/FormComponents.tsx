"use client";

import { ReactNode } from "react";
import { AlertCircle, CheckCircle, X } from "lucide-react";

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
}

export function FormField({
  label,
  error,
  required = false,
  children,
  hint,
}: FormFieldProps) {
  const errorId = `${label}-error`;
  const hintId = `${label}-hint`;

  return (
    <div className="flex flex-col gap-2">
      <label className="font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="ml-1 text-red-600 dark:text-red-400" aria-label="required">*</span>}
      </label>

      <div className="relative">{children}</div>

      {hint && (
        <p id={hintId} className="text-sm text-gray-500 dark:text-gray-400">
          {hint}
        </p>
      )}

      {error && (
        <div
          id={errorId}
          className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}
    </div>
  );
}

export function FormContainer({
  children,
  onSubmit,
  ariaLabel = "Form",
}: {
  children: ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  ariaLabel?: string;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-label={ariaLabel} noValidate>
      {children}
    </form>
  );
}

export function SuccessMessage({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <div className="success-banner items-center" role="status" aria-live="polite">
      <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
      <span className="flex-1 text-emerald-800 dark:text-emerald-200">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="rounded-lg p-1 text-emerald-600 transition hover:bg-emerald-100 hover:text-emerald-800"
          aria-label="Dismiss message"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function ErrorMessage({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <div className="error-banner items-center" role="alert" aria-live="assertive">
      <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
      <span className="flex-1 text-red-800 dark:text-red-200">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="rounded-lg p-1 text-red-600 transition hover:bg-red-100 hover:text-red-800"
          aria-label="Dismiss error"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
