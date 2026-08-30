import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { DashboardPage } from "./pages/DashboardPage";
import { RideCreatePage } from "./pages/RideCreatePage";
import { RideReviewPage } from "./pages/RideReviewPage";
import { RideCreatedPage } from "./pages/RideCreatedPage";
import { RideDetailsPage } from "./pages/RideDetailsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { EditProfilePage } from "./pages/EditProfilePage";
import { EmptyStatePage } from "./pages/EmptyStatePage";
import { SearchRidePage } from "./pages/SearchRidePage";
import { OfferDetailPage } from "./pages/OfferDetailPage";
import { MyRequestsPage } from "./pages/MyRequestsPage";
import { RequestDetailsPage } from "./pages/RequestDetailsPage";
import { MessagesPage } from "./pages/MessagesPage";
import { JourneysPage } from "./pages/JourneysPage";
import { LoadingWindow } from "./components/LoadingWindow";
import { api } from "./services/api";


const viewPaths = {
  login: "/login",
  register: "/register",
  forgot: "/forgot-password",
  dashboard: "/dashboard",
  createRide: "/my-ride-offers",
  reviewRide: "/my-ride-offers/review",
  rideCreated: "/my-ride-offers/published",
  profile: "/profile",
  editProfile: "/profile/edit",
  myRequests: "/join-requests",
  requests: "/join-requests",
  requestDetails: "/join-requests/details",
  find: "/find-a-ride",
  offerDetail: "/find-a-ride/detail",
  messages: "/messages",
  journeys: "/journeys",
  passengers: "/passengers",
  rides: "/my-rides"
};

function viewFromPath(pathname) {
  if (pathname.startsWith("/my-ride-offers/") && pathname !== "/my-ride-offers/review" && pathname !== "/my-ride-offers/published") return "rideDetails";
  if (pathname.startsWith("/join-requests/") && pathname !== "/join-requests") return "requestDetails";
  if (pathname === "/my-ride-offers/review") return "reviewRide";
  if (pathname === "/my-ride-offers/published") return "rideCreated";
  if (pathname === "/find-a-ride/detail") return "offerDetail";
  if (pathname === "/join-requests") return "myRequests";
  return Object.entries(viewPaths).find(([, path]) => path === pathname)?.[0] || "dashboard";
}

export function App() {
  const navigateTo = useNavigate();
  const location = useLocation();
  const [auth, setAuth] = useState({ user: null, profile: null, loading: true });
  const [selectedRideId, setSelectedRideId] = useState(() => sessionStorage.getItem("selectedRideOfferId") || "");
  const [detailBackView, setDetailBackView] = useState(() => sessionStorage.getItem("rideDetailsBackView") || "createRide");
  const [selectedPublicOfferId, setSelectedPublicOfferId] = useState(() => sessionStorage.getItem("selectedPublicOfferId") || "");
  const [selectedRequestId, setSelectedRequestId] = useState(() => sessionStorage.getItem("selectedRequestId") || "");
  const view = viewFromPath(location.pathname);

  const navigate = (nextView) => {
    navigateTo(viewPaths[nextView] || viewPaths.dashboard);
  };

  useEffect(() => {
    const token = localStorage.getItem("icbtToken");
    if (!token) {
      setAuth((current) => ({ ...current, loading: false }));
      return;
    }
    api.me()
      .then(({ user, profile }) => {
        setAuth({ user, profile, loading: false });
        if (["/", "/login", "/register", "/forgot-password"].includes(location.pathname)) {
          navigateTo(viewPaths.dashboard, { replace: true });
        }
      })
      .catch(() => {
        localStorage.removeItem("icbtToken");
        setAuth({ user: null, profile: null, loading: false });
        navigateTo(viewPaths.login, { replace: true });
      });
  }, []);

  const handleAuth = ({ token, user, profile }) => {
    localStorage.setItem("icbtToken", token);
    setAuth({ user, profile, loading: false });
    navigateTo(viewPaths.dashboard, { replace: true });
  };

  const logout = () => {
    localStorage.removeItem("icbtToken");
    sessionStorage.removeItem("selectedRideOfferId");
    sessionStorage.removeItem("rideDetailsBackView");
    setSelectedRideId("");
    setAuth({ user: null, profile: null, loading: false });
    navigateTo(viewPaths.login, { replace: true });
  };

  const openRideDetails = (rideId, backView = "createRide") => {
    setSelectedRideId(rideId);
    setDetailBackView(backView);
    sessionStorage.setItem("selectedRideOfferId", rideId);
    sessionStorage.setItem("rideDetailsBackView", backView);
    navigateTo(`/my-ride-offers/${rideId}`);
  };

  const openPublicOfferDetail = (offerId) => {
    setSelectedPublicOfferId(offerId);
    sessionStorage.setItem("selectedPublicOfferId", offerId);
    navigate("offerDetail");
  };

  const openRequestDetails = (requestId) => {
    setSelectedRequestId(requestId);
    sessionStorage.setItem("selectedRequestId", requestId);
    navigateTo(`/join-requests/${requestId}`);
  };

  if (auth.loading) return <LoadingWindow text="Loading ICBT Carpool" fullPage />;

  if (!auth.user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onRegister={() => navigateTo(viewPaths.register)} onForgot={() => navigateTo(viewPaths.forgot)} onAuthed={handleAuth} />} />
        <Route path="/register" element={<RegisterPage onLogin={() => navigateTo(viewPaths.login)} onAuthed={handleAuth} />} />
        <Route path="/forgot-password" element={<ResetPasswordPage onLogin={() => navigateTo(viewPaths.login)} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const sharedProps = {
    user: auth.user,
    profile: auth.profile,
    view,
    setView: navigate,
    logout,
    selectedRideId,
    detailBackView,
    openRideDetails,
    selectedPublicOfferId,
    openPublicOfferDetail,
    selectedRequestId,
    openRequestDetails,
    updateAuth: (next) => setAuth((current) => ({ ...current, ...next }))
  };

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="/register" element={<Navigate to="/dashboard" replace />} />
      <Route path="/forgot-password" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage {...sharedProps} />} />
      <Route path="/my-ride-offers" element={<RideCreatePage {...sharedProps} />} />
      <Route path="/my-ride-offers/review" element={<RideReviewPage {...sharedProps} />} />
      <Route path="/my-ride-offers/published" element={<RideCreatedPage {...sharedProps} />} />
      <Route path="/my-ride-offers/:rideId" element={<RideDetailsPage {...sharedProps} />} />
      <Route path="/profile" element={<ProfilePage {...sharedProps} />} />
      <Route path="/profile/edit" element={<EditProfilePage {...sharedProps} />} />
      <Route path="/join-requests" element={<MyRequestsPage {...sharedProps} />} />
      <Route path="/join-requests/:requestId" element={<RequestDetailsPage {...sharedProps} />} />
      <Route path="/find-a-ride" element={<SearchRidePage {...sharedProps} />} />
      <Route path="/find-a-ride/detail" element={<OfferDetailPage {...sharedProps} />} />
      <Route path="/messages" element={<MessagesPage {...sharedProps} />} />
      <Route path="/journeys" element={<JourneysPage {...sharedProps} />} />

      <Route path="/passengers" element={<EmptyStatePage {...sharedProps} view="passengers" />} />
      <Route path="/my-rides" element={<EmptyStatePage {...sharedProps} view="rides" />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}