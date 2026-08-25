import { useEffect, useState } from "react";
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
import { LoadingWindow } from "./components/LoadingWindow";
import { api } from "./services/api";

export function App() {
  const [auth, setAuth] = useState({ user: null, profile: null, loading: true });
  const [selectedRideId, setSelectedRideId] = useState(() => sessionStorage.getItem("selectedRideOfferId") || "");
  const [detailBackView, setDetailBackView] = useState(() => sessionStorage.getItem("rideDetailsBackView") || "createRide");
  const [selectedPublicOfferId, setSelectedPublicOfferId] = useState(() => sessionStorage.getItem("selectedPublicOfferId") || "");
  const [view, setView] = useState(() => {
    const hash = window.location.hash.replace("#", "");
    return ["register", "forgot"].includes(hash) ? hash : "login";
  });

  const navigate = (nextView) => {
    setView(nextView);
    if (["login", "register", "forgot"].includes(nextView)) {
      window.history.replaceState(null, "", nextView === "login" ? window.location.pathname : `#${nextView}`);
    } else if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
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
        navigate("dashboard");
      })
      .catch(() => {
        localStorage.removeItem("icbtToken");
        setAuth({ user: null, profile: null, loading: false });
      });
  }, []);

  const handleAuth = ({ token, user, profile }) => {
    localStorage.setItem("icbtToken", token);
    setAuth({ user, profile, loading: false });
    navigate("dashboard");
  };

  const logout = () => {
    localStorage.removeItem("icbtToken");
    sessionStorage.removeItem("selectedRideOfferId");
    sessionStorage.removeItem("rideDetailsBackView");
    setAuth({ user: null, profile: null, loading: false });
    navigate("login");
  };

  const openRideDetails = (rideId, backView = "createRide") => {
    setSelectedRideId(rideId);
    setDetailBackView(backView);
    sessionStorage.setItem("selectedRideOfferId", rideId);
    sessionStorage.setItem("rideDetailsBackView", backView);
    navigate("rideDetails");
  };

  const openPublicOfferDetail = (offerId) => {
    setSelectedPublicOfferId(offerId);
    sessionStorage.setItem("selectedPublicOfferId", offerId);
    navigate("offerDetail");
  };

  if (auth.loading) return <LoadingWindow text="Loading ICBT Carpool" fullPage />;

  if (!auth.user) {
    if (view === "register") return <RegisterPage onLogin={() => navigate("login")} onAuthed={handleAuth} />;
    if (view === "forgot") return <ResetPasswordPage onLogin={() => navigate("login")} />;
    return <LoginPage onRegister={() => navigate("register")} onForgot={() => navigate("forgot")} onAuthed={handleAuth} />;
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
    updateAuth: (next) => setAuth((current) => ({ ...current, ...next }))
  };

  if (view === "createRide") return <RideCreatePage {...sharedProps} />;
  if (view === "rideDetails") return <RideDetailsPage {...sharedProps} />;
  if (view === "reviewRide") return <RideReviewPage {...sharedProps} />;
  if (view === "rideCreated") return <RideCreatedPage {...sharedProps} />;
  if (view === "editProfile") return <EditProfilePage {...sharedProps} />;
  if (view === "profile") return <ProfilePage {...sharedProps} />;
  // Sprint 2 pages
  if (view === "find") return <SearchRidePage {...sharedProps} />;
  if (view === "offerDetail") return <OfferDetailPage {...sharedProps} />;
  if (view === "myRequests") return <MyRequestsPage {...sharedProps} />;

  const emptyViews = ["rides", "messages", "journeys", "passengers"];
  if (emptyViews.includes(view)) return <EmptyStatePage {...sharedProps} />;

  return <DashboardPage {...sharedProps} />;
}
