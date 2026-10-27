import { useEffect, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import { GuestLayout } from "@/layouts/GuestLayout";
import { StaffLayout } from "@/layouts/StaffLayout";
import { MusicianLayout } from "@/layouts/MusicianLayout";
import { MusicRequests } from "@/features/guest/MusicRequests";
import { StageDashboard } from "@/features/entertainment/StageDashboard";
import { useAuth, type Role } from "@/store/AuthProvider";
import { useRequests } from "@/store/RequestsProvider";
import { DEMO_PASSWORD, STAFF_USERNAME } from "@/data/musicians";
import { ProductNavigation } from "@/components/ProductNavigation";

/** Demo role selection only; production authorization belongs on the server. */
function DemoWorkspace({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const { session, signIn } = useAuth();
  const { musicians } = useRequests();
  const username =
    role === "staff"
      ? STAFF_USERNAME
      : musicians.find((m) => m.active)?.username;
  useEffect(() => {
    if (session?.role !== role && username) signIn(username, DEMO_PASSWORD);
  }, [role, session?.role, username, signIn]);
  if (!username)
    return (
      <div className="workspace-unavailable">
        <h1>No performer available</h1>
        <p>Add a musician in the Staff desk to open the singer console.</p>
      </div>
    );
  if (session?.role !== role)
    return (
      <p className="workspace-loading" role="status">
        Opening workspace…
      </p>
    );
  return <>{children}</>;
}
function RequestsRedirect() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: "/", search }} replace />;
}
export default function App() {
  useScrollToTop();
  return (
    <>
      <ProductNavigation />
      <Routes>
        <Route element={<GuestLayout />}>
          <Route path="/" element={<MusicRequests />} />
        </Route>
        <Route
          path="/musician"
          element={
            <DemoWorkspace role="musician">
              <MusicianLayout />
            </DemoWorkspace>
          }
        >
          <Route index element={<Navigate to="/musician/live" replace />} />
          <Route path="live" element={<StageDashboard />} />
          <Route path="*" element={<Navigate to="/musician/live" replace />} />
        </Route>
        <Route
          path="/staff/*"
          element={
            <DemoWorkspace role="staff">
              <StaffLayout />
            </DemoWorkspace>
          }
        />
        <Route path="*" element={<RequestsRedirect />} />
      </Routes>
    </>
  );
}
