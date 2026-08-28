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
  Ban,
  Edit3,
  MessageSquare
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { Info } from "../components/Info";
import { Field } from "../components/Field";
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

  // Edit offer modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    origin: "",
    destination: "",
    departureDate: "",
    departureTime: "",
    timeWindow: "",
    availableSeats: 1
  });
  const [editError, setEditError] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

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

      if (offerData.offer) {
        setEditForm({
          origin: offerData.offer.origin || "",
          destination: offerData.offer.destination || "",
          departureDate: offerData.offer.departureDate || "",
          departureTime: offerData.offer.departureTime || "",
          timeWindow: offerData.offer.timeWindow || "",
          availableSeats: offerData.offer.availableSeats ?? 1
        });
      }
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

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditError("");
    setEditSubmitting(true);
    setActionSuccess("");
    setActionError("");

    try {
      const updatedRes = await api.updateRideOffer(rideId, editForm);
      setOffer(updatedRes.offer);
      setShowEditModal(false);
      setActionSuccess("Ride offer details updated successfully.");
      await loadData();
    } catch (err) {
      setEditError(err.message || "Failed to update ride offer.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleCancelOffer = async () => {
    if (!window.confirm("Are you sure you want to cancel this ride offer? Pending requests will be cancelled.")) {
      return;
    }
    setActionError("");
    setActionSuccess("");

    try {
      const res = await api.cancelRideOffer(rideId);
      setOffer(res.offer);
      setActionSuccess("Ride offer cancelled successfully.");
      await loadData();
    } catch (err) {
      setActionError(err.message || "Failed to cancel ride offer.");
    }
  };

  const openMessagePassenger = (passengerUserId) => {
    sessionStorage.setItem("activeChatOfferId", rideId);
    sessionStorage.setItem("activeChatPartnerId", passengerUserId);
    props.setView("messages");
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
          <div className="ride-detail-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3>
                <Car size={20} fill="#ef4444" color="#ef4444" style={{ display: "inline", marginRight: 6 }} />
                {offer.origin} → {offer.destination}
              </h3>
              <p>{offer.departureDate} • {offer.departureTime} • {offer.timeWindow}</p>
            </div>
            <div className="ride-heading-actions" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span className={`badge ${isActive ? "green" : "neutral"}`}>{offer.status}</span>
              {isActive && (
                <>
                  <button
                    type="button"
                    className="secondary-button compact"
                    style={{ gap: 4 }}
                    onClick={() => setShowEditModal(true)}
                  >
                    <Edit3 size={14} /> Edit Offer
                  </button>
                  <button
                    type="button"
                    className="danger-button compact"
                    style={{ gap: 4 }}
                    onClick={handleCancelOffer}
                  >
                    <Ban size={14} /> Cancel Offer
                  </button>
                </>
              )}
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
                            <button
                              type="button"
                              className="secondary-button compact"
                              style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem", gap: 3 }}
                              title="Message passenger"
                              onClick={() => openMessagePassenger(passenger.id)}
                            >
                              <MessageSquare size={12} /> Chat
                            </button>
                            <span className="badge green" style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem" }}>
                              CONFIRMED
                            </span>
                            {passenger.requestId && isActive && (
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

      {/* Edit Offer Modal */}
      {showEditModal && (
        <div className="modal-backdrop" role="presentation">
          <form className="modal-panel profile-edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-modal-title" onSubmit={handleSaveEdit}>
            <div className="modal-heading">
              <div>
                <h2 id="edit-modal-title">Edit Ride Offer</h2>
                <p>Update origin, destination, time, or available seats.</p>
              </div>
              <button className="modal-close" type="button" onClick={() => setShowEditModal(false)} aria-label="Close">&times;</button>
            </div>
            <Field label="Origin" value={editForm.origin} onChange={(v) => setEditForm((c) => ({ ...c, origin: v }))} />
            <Field label="Destination" value={editForm.destination} onChange={(v) => setEditForm((c) => ({ ...c, destination: v }))} />
            <Field label="Departure Date" type="date" value={editForm.departureDate} onChange={(v) => setEditForm((c) => ({ ...c, departureDate: v }))} />
            <Field label="Departure Time" type="time" value={editForm.departureTime} onChange={(v) => setEditForm((c) => ({ ...c, departureTime: v }))} />
            <Field label="Time Window" value={editForm.timeWindow} onChange={(v) => setEditForm((c) => ({ ...c, timeWindow: v }))} placeholder="e.g. 7:00 AM - 8:00 AM" />
            <Field label="Available Seats" type="number" value={editForm.availableSeats} onChange={(v) => setEditForm((c) => ({ ...c, availableSeats: Number(v) }))} min={0} />

            {editError && <p className="validation-message" style={{ marginBottom: "1rem" }}>{editError}</p>}
            <div className="edit-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
              <button className="secondary-button small" type="button" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="primary-button small" type="submit" disabled={editSubmitting}>
                {editSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
