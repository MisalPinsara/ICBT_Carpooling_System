import { useEffect, useState } from "react";
import { Clock, MapPin, Calendar, User, Users, ChevronRight, Ban, CheckCircle, Hourglass, MessageSquare } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { LoadingWindow } from "../components/LoadingWindow";
import { api } from "../services/api";

function JourneyStatusBadge({ status }) {
  if (status === "Active" || status === "Accepted") {
    return (
      <span className="badge green" style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}>
        {status}
      </span>
    );
  }
  if (status === "Pending") {
    return (
      <span className="request-status-badge request-status-pending">
        <Hourglass size={12} /> Pending
      </span>
    );
  }
  if (status === "Cancelled" || status === "Left") {
    return (
      <span className="request-status-badge request-status-cancelled">
        <Ban size={12} /> {status}
      </span>
    );
  }
  return (
    <span className="badge neutral" style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}>
      {status || "Completed"}
    </span>
  );
}

export function JourneysPage(props) {
  const [activeTab, setActiveTab] = useState("upcoming"); // 'upcoming' | 'previous'
  const [upcoming, setUpcoming] = useState([]);
  const [previous, setPrevious] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchJourneys = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.getJourneys();
      setUpcoming(res.upcoming || []);
      setPrevious(res.previous || []);
    } catch (err) {
      setError(err.message || "Failed to load journey history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJourneys();
  }, []);

  if (loading) {
    return (
      <AppShell {...props}>
        <LoadingWindow text="Loading journey history..." />
      </AppShell>
    );
  }

  const currentList = activeTab === "upcoming" ? upcoming : previous;

  return (
    <AppShell {...props}>
      <section className="intro">
        <h2>My Journeys</h2>
        <p>Track your carpooling activity, upcoming rides, and historical travel records.</p>
      </section>

      {/* Tabs */}
      <div className="requests-tabs" style={{ marginBottom: "1.25rem" }}>
        <button
          type="button"
          className={`requests-tab-btn ${activeTab === "upcoming" ? "active" : ""}`}
          onClick={() => setActiveTab("upcoming")}
        >
          Upcoming Journeys
          <span className="tab-count-badge">{upcoming.length}</span>
        </button>
        <button
          type="button"
          className={`requests-tab-btn ${activeTab === "previous" ? "active" : ""}`}
          onClick={() => setActiveTab("previous")}
        >
          Previous / History
          <span className="tab-count-badge neutral">{previous.length}</span>
        </button>
      </div>

      {error && <p className="validation-message" style={{ marginBottom: "1rem" }}>{error}</p>}

      {currentList.length === 0 ? (
        <article className="panel">
          <div className="empty-offers">
            <h3>No {activeTab} journeys</h3>
            <p>
              {activeTab === "upcoming"
                ? "You have no upcoming carpooling journeys scheduled. Create a ride offer or request to join a ride!"
                : "No past journey history found on your account."}
            </p>
            {activeTab === "upcoming" && (
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  className="primary-button compact"
                  onClick={() => props.setView("find")}
                >
                  Find a Ride
                </button>
                <button
                  type="button"
                  className="secondary-button compact"
                  onClick={() => props.setView("createRide")}
                >
                  + Offer a Ride
                </button>
              </div>
            )}
          </div>
        </article>
      ) : (
        <div className="offers-list" style={{ gap: "1rem" }}>
          {currentList.map((item) => {
            const isOwner = item.role === "Offer Owner" || item.type === "offer";
            return (
              <article key={item.id} className="panel" style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: 4 }}>
                      <span className={`badge ${isOwner ? "blue" : "cyan"}`} style={{ fontSize: "0.7rem", padding: "0.15rem 0.5rem" }}>
                        {isOwner ? "RIDE OWNER" : "REQUESTER"}
                      </span>
                      <JourneyStatusBadge status={item.status} />
                    </div>
                    <h3 style={{ fontSize: "1.05rem", margin: 0, fontWeight: 500, color: "#0f172a" }}>
                      <MapPin size={16} fill="#ef4444" color="#ef4444" style={{ display: "inline", marginRight: 4 }} />
                      {item.origin} → {item.destination}
                    </h3>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {isOwner ? (
                      <button
                        type="button"
                        className="secondary-button compact"
                        style={{ fontSize: "0.8rem" }}
                        onClick={() => props.openRideDetails(item.id)}
                      >
                        Manage Offer
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="secondary-button compact"
                        style={{ fontSize: "0.8rem" }}
                        onClick={() => props.openRequestDetails(item.id)}
                      >
                        Request Details
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", background: "#f8fafc", padding: "0.75rem 1rem", borderRadius: "8px" }}>
                  <div>
                    <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Departure Date & Time</span>
                    <strong style={{ fontSize: "0.875rem", color: "#1e293b" }}>
                      {item.departureDate} {item.departureTime && `at ${item.departureTime}`}
                    </strong>
                  </div>

                  {item.timeWindow && (
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Time Window</span>
                      <strong style={{ fontSize: "0.875rem", color: "#1e293b" }}>{item.timeWindow}</strong>
                    </div>
                  )}

                  {isOwner ? (
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Seats & Passengers</span>
                      <strong style={{ fontSize: "0.875rem", color: "#1e293b" }}>
                        {item.availableSeats} available • {item.acceptedPassengers} accepted
                      </strong>
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Offer Owner</span>
                      <strong style={{ fontSize: "0.875rem", color: "#1e293b" }}>{item.ownerName || "Driver"}</strong>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
