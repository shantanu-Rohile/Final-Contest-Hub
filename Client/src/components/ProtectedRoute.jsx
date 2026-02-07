import React from "react";
import { Navigate } from "react-router-dom";

// Simple client-side guard. Server is still the source of truth via JWT middleware.
export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}
