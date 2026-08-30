import { useEffect, useState } from "react";
import { Car } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { LoadingWindow } from "../components/LoadingWindow";
import { StatCard } from "../components/StatCard";
import { api } from "../services/api";

export function DashboardPage(props) {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  const firstName = props.profile?.firstName || (props.user?.name ? props.user.name.split(" ")[0] : "User");

  useEffect(() => {
    let isMounted = true;
    api.dashboard()
      .then((data) => {
        if (isMounted) setDashboard(data || {});
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load dashboard data");
          setDashboard({
            stats: { activeRides: 0, pendingRequests: 0, availableSeats: 0, upcomingJourneys: 0 },
            currentRide: null,
            activities: []
          });
        }
      });
    return () => { isMounted = false; };
  }, []);

  if (!dashboard) {
    return (
      <AppShell {...props}>
        <LoadingWindow text="Loading dashboard" />
      </AppShell>
    );
  }

  const stats = dashboard.stats || {};
  const ride = dashboard.currentRide || null;
  const activity = Array.isArray(dashboard.activities) ? dashboard.activities[0] : null;

  return (
    <AppShell {...props}>
      <section className="intro">
        <h2>Good morning, {firstName} <span aria-hidden="true">👋</span></h2>
        <p>Your carpool activity at a glance.</p>
      </section>

      {error && (
        <div className="validation-message" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <section className="stat-grid">
        <div style={{ cursor: "pointer" }} onClick={() => props.setView("myRequests")}>
          <StatCard value={stats.activeRides ?? 0} label="Active rides" tone="blue" />
        </div>
        <div style={{ cursor: "pointer" }} onClick={() => props.setView("myRequests")}>
          <StatCard value={stats.pendingRequests ?? 0} label="Pending requests" tone="amber" />
        </div>
        <div>
          <StatCard value={stats.availableSeats ?? 0} label="Available seats" tone="green" />
        </div>
        <div>
          <StatCard value={stats.upcomingJourneys ?? 0} label="Upcoming journeys" tone="cyan" />
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel ride-panel">
          <div className="panel-heading">
            <h3>My Current Ride</h3>
            {ride ? (
              <span className="badge green">{ride.status?.toUpperCase() || "ACTIVE"}</span>
            ) : (
              <span className="badge neutral">NO RIDE</span>
            )}
          </div>
          {ride ? (
            <>
              <h4>
                <Car size={22} fill="#f04438" color="#f04438" style={{ display: "inline", marginRight: 6 }} />
                {ride.origin} → {ride.destination}
              </h4>
              <p>{ride.departureDate} • {ride.departureTime} • {ride.timeWindow}</p>
              <hr />
              <div className="ride-meta">
                <div>
                  <span>Passengers / Seats</span>
                  <strong>{ride.acceptedPassengers ?? 0} accepted • {ride.availableSeats ?? 0} seats available</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>Ready for campus</strong>
                </div>
                <button
                  className="primary-button compact"
                  type="button"
                  onClick={() => props.openRideDetails(ride.id, "dashboard")}
                >
                  View details
                </button>
              </div>
            </>
          ) : (
            <div className="empty-offers" style={{ padding: "1.5rem 0" }}>
              <p>You have no active ride offers currently listed.</p>
              <button
                className="primary-button compact"
                type="button"
                style={{ marginTop: "0.75rem" }}
                onClick={() => props.setView("createRide")}
              >
                + Offer a Ride
              </button>
            </div>
          )}
        </article>

        <article className="panel action-panel">
          <h3>Quick Actions</h3>
          <button className="primary-button" type="button" onClick={() => props.setView("createRide")}>
            + Create / Offer Ride
          </button>
          <button
            id="dashboard-find-ride-btn"
            className="secondary-button"
            type="button"
            onClick={() => props.setView("find")}
          >
            Find a Ride
          </button>
          <button
            id="dashboard-view-requests-btn"
            className="secondary-button"
            type="button"
            onClick={() => props.setView("myRequests")}
          >
            View My Requests
          </button>
        </article>
      </section>

      {activity && (
        <section className="activity">
          <h3>Recent Activity</h3>
          <article className="activity-row">
            <div>
              <strong>{activity.title}</strong>
              <p>{activity.route} • {activity.createdLabel}</p>
            </div>
            <button
              className="primary-button compact"
              type="button"
              onClick={() => props.setView("myRequests")}
            >
              Review
            </button>
          </article>
        </section>
      )}
    </AppShell>
  );
}
