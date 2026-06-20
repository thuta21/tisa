"use client";

export default function ProtectedRoute({
  children,
  unauthenticatedElement = null,
}: {
  children?: React.ReactNode;
  fallback?: React.ReactNode;
  unauthenticatedElement?: React.ReactNode;
}) {
  return children ?? unauthenticatedElement;
}
