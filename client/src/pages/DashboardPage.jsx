import { useEffect, useState } from "react";
import { Car } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { LoadingWindow } from "../components/LoadingWindow";
import { StatCard } from "../components/StatCard";
import { api } from "../services/api";

export function DashboardPage(props) {
  const [dashboard, setDashboard] = useState(null);
  const firstName = props.profile.firstName;

  useEffect(() => {
    api.dashboard().then(setDashboard);
  }, []);

  const stats = dashboard?.stats || {};
  const ride = dashboard?.currentRide;
  const activity = dashboard?.activities?.[0];

  if (!dashboard) {
    return (
      <AppShell {...props}>
        <LoadingWindow text="Loading dashboard" />
      </AppShell>
    );
  }

  return (
    <AppShell {...props}>
      <section className="intro">
        <h2>Good morning, {firstName} <span aria-hidden="true">👋</span></h2>
        <p>Your carpool activity at a glance.</p>
      </section>
      <section className="stat-grid">
        <StatCard value={stats.activeRides ?? "-"} label="Active rides" tone="blue" />
        <StatCard value={stats.pendingRequests ?? "-"} label="Pending requests" tone="amber" />
        <StatCard value={stats.availableSeats ?? "-"} label="Available seats" tone="green" />
        <StatCard value={stats.upcomingJourneys ?? "-"} label="Upcoming journeys" tone="cyan" />
      </section>
      <section className="dashboard-grid">
        <article className="panel ride-panel">
          <div className="panel-heading">
            <h3>My Current Ride</h3>
            <span className="badge green">ACTIVE</span>
          </div>
          {ride && (
            <>
              <h4><Car size={22} fill="#f04438" color="#f04438" /> {ride.origin} → {ride.destination}</h4>
              <p>{ride.departureDate} • {ride.departureTime} • {ride.timeWindow}</p>
              <hr />
              <div className="ride-meta">
                <div>
                  <span>Passengers / Seats</span>
                  <strong>{ride.acceptedPassengers} accepted • {ride.availableSeats} seats available</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>Ready for campus</strong>
                </div>
                <button className="primary-button compact" type="button" onClick={() => props.openRideDetails(ride.id, "dashboard")}>View details</button>
              </div>
            </>
          )}
        </article>
        <article className="panel action-panel">
          <h3>Quick Actions</h3>
          <button className="primary-button" type="button" onClick={() => props.setView("createRide")}>+ Create / Offer Ride</button>
          <button className="secondary-button" type="button">Find a Ride</button>
          <button className="secondary-button" type="button">View Requests</button>
        </article>
      </section>
      <section className="activity">
        <h3>Recent Activity</h3>
        {activity && (
          <article className="activity-row">
            <div>
              <strong>{activity.title}</strong>
              <p>{activity.route} • {activity.createdLabel}</p>
            </div>
            <button className="primary-button compact" type="button">Review</button>
          </article>
        )}
      </section>
    </AppShell>
  );
}
