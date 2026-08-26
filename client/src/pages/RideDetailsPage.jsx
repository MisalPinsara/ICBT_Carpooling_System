import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Car,
  User,
  Phone,
  Mail,
  Check,
  X,
  MapPin,
  Clock,
  CalendarDays,
  Users,
  CheckCircle2,
  AlertCircle,
  Ban
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { Info } from "../components/Info";
import { LoadingWindow } from "../components/LoadingWindow";
import { api } from "../services/api";

export function RideDetailsPage(props) {
  const [offer, setOffer] = useState(null);
  const [passengers, setPassengers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [submittingId, setSubmittingId] = useState(null);

  const { rideId: routeRideId } = useParams();
  const rideId = routeRideId || props.selectedRideId || sessionStorage.getItem("selectedRideOfferId");

  const loadData = async () => {
    if (!rideId) {
      setError("Select a ride offer to manage.");
      return;
    }

    try {
      const [offerData, passData, receivedData] = await Promise.all([
        api.rideOffer(rideId),
        api.acceptedPassengers(rideId).catch(() => ({ passengers: [] })),
        api.receivedJoinRequests().catch(() => ({ joinRequests: [] }))
      ]);

      setOffer(offerData.offer);
      setPassengers(passData.passengers || offerData.offer?.passengers || []);
      
      const rideRequests = (receivedData.joinRequests || []).filter(
        (r) => (r.rideOfferId || r.offer?.id) === rideId && r.status === "Pending"
      );
      setPendingRequests(rideRequests);
    } catch (err) {
      setError(err.message || "Failed to load ride details.");
    }
  };

  useEffect(() => {
    loadData();
  }, [rideId]);

  const handleDecision = async (requestId, status) => {
    setSubmittingId(requestId);
    setActionError("");
    setActionSuccess("");

    try {
      await api.decideJoinRequest(requestId, status);
      setActionSuccess(`Request ${status.toLowerCase()} successfully.`);
      await loadData();
    } catch (err) {
      setActionError(err.message || `Failed to ${status.toLowerCase()} request.`);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleCancelPassenger = async (requestId) => {
    if (!window.confirm("Are you sure you want to revoke this acceptance? The seat will be restored.")) {
      return;
    }
    setSubmittingId(requestId);
    setActionError("");
    setActionSuccess("");

    try {
      await api.cancelJoinRequest(requestId);
      setActionSuccess("Acceptance revoked. Seat has been restored.");
      await loadData();
    } catch (err) {
      setActionError(err.message || "Failed to revoke acceptance.");
    } finally {
      setSubmittingId(null);
    }
  };

  if (!offer && !error) {
    return (
      <AppShell {...props}>
        <LoadingWindow text="Loading ride details" />
      </AppShell>
    );
  }

  const isActive = offer?.status === "Active";

  return (
    <AppShell {...props}>
      <section className="intro compact-intro">
        <h2>Ride Details</h2>
        <p>View confirmed travelers, seat availability, and manage pending join requests.</p>
      </section>

      {actionSuccess && <div className="top-alert" role="status">{actionSuccess}</div>}
      {actionError && <p className="validation-message" style={{ marginBottom: "1rem" }}>{actionError}</p>}

      {error && !offer ? (
        <section className="panel empty-offers">
          <h3>Ride offer unavailable</h3>
          <p>{error}</p>
          <button
            className="secondary-button compact"
            type="button"
            onClick={() => props.setView(props.detailBackView || "createRide")}
          >
            Go back
          </button>
        </section>
      ) : (
        <section className="panel ride-detail-panel">
          <div className="ride-detail-heading">
            <div>
              <h3>
                <Car size={20} fill="#ef4444" color="#ef4444" style={{ display: "inline", marginRight: 6 }} />
                {offer.origin} → {offer.destination}
              </h3>
              <p>{offer.departureDate} • {offer.departureTime} • {offer.timeWindow}</p>
            </div>
            <div className="ride-heading-actions">
              <span className={`badge ${isActive ? "green" : "neutral"}`}>{offer.status}</span>
            </div>
          </div>
          <hr />

          <div className="ride-detail-body">
            <section className="passenger-panel" style={{ flex: 1.2 }}>
              {/* Accepted Passengers */}
              <div style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>
                    <Users size={16} style={{ display: "inline", marginRight: 6 }} />
                    Accepted Passengers ({passengers.length})
                  </span>
                  <span className="text-xs font-normal text-brand-muted">
                    {offer.availableSeats} seats remaining
                  </span>
                </h4>

                {passengers.length ? (
                  <div className="passenger-list" style={{ marginTop: "0.75rem", display: "grid", gap: "0.75rem" }}>
                    {passengers.map((passenger) => {
                      const isRevoking = submittingId === passenger.requestId;
                      return (
                        <article className="passenger-badge-card" key={passenger.id}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div className="requester-avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
                              {(passenger.name || "P").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span style={{ fontSize: "0.875rem", display: "block", fontWeight: 400, color: "#1e293b" }}>{passenger.name}</span>
                              <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>
                                {passenger.phoneNumber && <span>{passenger.phoneNumber} • </span>}
                                {passenger.email || "Accepted traveler"}
                              </p>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span className="badge green" style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem" }}>
                              CONFIRMED
                            </span>
                            {passenger.requestId && (
                              <button
                                type="button"
                                className="btn-cancel-request"
                                style={{ fontSize: "0.7rem", padding: "0.2rem 0.6rem" }}
                                disabled={isRevoking}
                                title="Revoke acceptance and restore 1 seat"
                                onClick={() => handleCancelPassenger(passenger.requestId)}
                              >
                                <Ban size={11} />
                                Revoke
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-passengers" style={{ padding: "1.5rem 0", textAlign: "center", color: "#94a3b8" }}>
                    No accepted passengers yet.
                  </div>
                )}
              </div>

              {/* Pending Requests for this ride */}
              {pendingRequests.length > 0 && (
                <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid #e2e8f0" }}>
                  <h4 style={{ color: "#d97706", fontSize: "0.95rem", marginBottom: "0.75rem" }}>
                    Pending Join Requests ({pendingRequests.length})
                  </h4>
                  <div style={{ display: "grid", gap: "0.75rem" }}>
                    {pendingRequests.map((req) => {
                      const reqName =
                        req.requester?.name ||
                        (req.requester?.firstName
                          ? `${req.requester.firstName} ${req.requester.lastName || ""}`.trim()
                          : "Passenger");
                      const isSubmitting = submittingId === req.id;

                      return (
                        <article key={req.id} className="passenger-badge-card" style={{ borderColor: "#fef3c7", background: "#fffbeb" }}>
                          <div>
                            <strong style={{ fontSize: "0.875rem", display: "block" }}>{reqName}</strong>
                            <p style={{ margin: 0, fontSize: "0.75rem", color: "#92400e" }}>
                              {req.requestNote ? `"${req.requestNote}"` : "Requested to join"}
                            </p>
                          </div>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              type="button"
                              className="btn-reject"
                              disabled={isSubmitting}
                              onClick={() => handleDecision(req.id, "Rejected")}
                            >
                              <X size={12} /> Reject
                            </button>
                            <button
                              type="button"
                              className="btn-accept"
                              disabled={isSubmitting || offer.availableSeats <= 0}
                              onClick={() => handleDecision(req.id, "Accepted")}
                            >
                              <Check size={12} /> Accept
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            <aside className="ride-management-panel" style={{ flex: 1 }}>
              <div className="ride-detail-grid">
                <Info label="Origin" value={offer.origin} />
                <Info label="Destination" value={offer.destination} />
                <Info label="Departure date" value={offer.departureDate} />
                <Info label="Departure time" value={offer.departureTime} />
                <Info label="Time window" value={offer.timeWindow} />
                <Info label="Available seats" value={`${offer.availableSeats} seats`} />
                <Info label="Accepted passengers" value={`${passengers.length || offer.acceptedPassengers || 0} accepted`} />
                <Info label="Status" value={offer.status} />
              </div>
            </aside>
          </div>
        </section>
      )}
    </AppShell>
  );
}