import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import type { RootState } from "../app/store";

export default function ProtectedRoute() {
  const user = useSelector((state: RootState) => state.auth.user);

  if (!user) {
    return <Navigate to="/" />;
  }

  return <Outlet />;
}