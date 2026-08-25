import { Car, ChevronLeft, Clock3, Home, List, LogOut, MessageSquare, Search, UserRound, UsersRound } from "lucide-react";
import { Logo } from "./Logo";

const routeLabels = {
  dashboard: "Dashboard",
  createRide: "My Ride Offers",
  rideDetails: "My Ride Offers / Details",
  reviewRide: "My Ride Offers / Review",
  rideCreated: "My Ride Offers / Published",
  editProfile: "Profile / Edit",
  profile: "Profile",
  rides: "My Ride Offers",
  requests: "Requests",
  find: "Find a Ride",
  offerDetail: "Find a Ride / Details",
  myRequests: "My Requests",
  messages: "Messages",
  journeys: "Journeys",
  passengers: "Passengers"
};

function isActiveNav(view, key) {
  if (key === "createRide") return ["createRide", "rideDetails", "reviewRide", "rideCreated"].includes(view);
  if (key === "find") return ["find", "offerDetail"].includes(view);
  if (key === "requests") return view === "myRequests";
  return view === key;
}

function handleNavClick(key, setView) {
  // 'requests' nav item maps to the myRequests view for passengers
  if (key === "requests") return setView("myRequests");
  setView(key);
}

function getBackView(view, backViewOverride) {
  if (view === "rideDetails") return backViewOverride || "createRide";
  if (view === "reviewRide" || view === "rideCreated") return "createRide";
  if (view === "editProfile") return "profile";
  if (view === "offerDetail") return "find";
  if (view === "myRequests") return "dashboard";
  if (view === "dashboard") return null;
  return "dashboard";
}

export function AppShell({ user, view, setView, logout, detailBackView, children }) {
  const driver = user.role === "Driver";
  const backView = getBackView(view, detailBackView);
  const showRoute = view !== "dashboard";
  const menu = driver
    ? [
        ["dashboard", Home, "Dashboard"],
        ["createRide", Car, "My Ride Offers"],
        ["requests", UsersRound, "Join Requests"],
        ["passengers", List, "Passengers"],
        ["messages", MessageSquare, "Messages"],
        ["journeys", Clock3, "Journeys"],
        ["profile", UserRound, "Profile"]
      ]
    : [
        ["dashboard", Home, "Dashboard"],
        ["rides", Car, "My Ride Offers"],
        ["requests", UsersRound, "My Requests"],
        ["find", Search, "Find a Ride"],
        ["messages", MessageSquare, "Messages"],
        ["journeys", List, "Journeys"],
        ["profile", UserRound, "Profile"]
      ];

  return (
    <main className="app-shell">
      <header className="mobile-topbar">
        <Logo />
        <button className="mobile-logout" type="button" onClick={logout} aria-label="Logout">
          <LogOut size={18} />
        </button>
      </header>
      <nav className="mobile-nav" aria-label="Primary">
        {menu.map(([key, Icon, label]) => (
          <button
            type="button"
            key={key}
            className={isActiveNav(view, key) ? "active" : ""}
            onClick={() => handleNavClick(key, setView)}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <aside className="sidebar">
        <Logo />
        <p>Shared transport for campus</p>
        <nav>
          {menu.map(([key, Icon, label]) => (
            <button
              type="button"
              key={key}
              className={isActiveNav(view, key) ? "active" : ""}
              onClick={() => handleNavClick(key, setView)}
            >
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button type="button" onClick={logout}><LogOut size={18} /><span>Logout</span></button>
        </div>
      </aside>
      <section className="content">
        {showRoute && (
          <header className="content-top">
            <div className="page-route">
              {backView && (
                <button type="button" onClick={() => setView(backView)} aria-label="Go back">
                  <ChevronLeft size={16} />
                </button>
              )}
              <span>{routeLabels[view] || ""}</span>
            </div>
          </header>
        )}
        {children}
      </section>
    </main>
  );
}
