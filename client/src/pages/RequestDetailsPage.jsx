import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MapPin, Clock, CalendarDays, UserRound, ArrowLeft, Hourglass, CheckCircle, XCircle, FileText, Ban } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { Info } from "../components/Info";
import { LoadingWindow } from "../components/LoadingWindow";
import { api } from "../services/api";

function StatusBadge({ status }) {
  if (status === "Pending") {
    return (
      <span className="request-status-badge request-status-pending">
        <Hourglass size={12} />
        Pending
      </span>
    );
  }
  if (status === "Accepted") {
    return (
      <span className="request-status-badge request-status-accepted">
        <CheckCircle size={12} />
        Accepted
      </span>
    );
  }
  if (status === "Cancelled") {
    return (
      <span className="request-status-badge request-status-cancelled">
        <Ban size={12} />
        Cancelled
      </span>
    );
  }
  return (
    <span className="request-status-badge request-status-rejected">
      <XCircle size={12} />
      {status || "Rejected"}
    </span>
  );
}

export function RequestDetailsPage(props) {
  const [requestItem, setRequestItem] = useState(null);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [decisionNote, setDecisionNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { requestId: routeRequestId } = useParams();
  const requestId = routeRequestId || props.selectedRequestId || sessionStorage.getItem("selectedRequestId");

  const loadData = () => {
    if (!requestId) {
      setError("No request selected.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    api.getJoinRequest(requestId)
      .then((data) => {
        setRequestItem(data.joinRequest);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load join request details.");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [requestId]);

  const goBack = () => {
    props.setView("myRequests");
  };

  const handleDecision = async (status) => {
    setSubmitting(true);
    setActionError("");
    setActionSuccess("");

    try {
      const res = await api.decideJoinRequest(requestItem.id, status, decisionNote);
      setActionSuccess(`Request marked as ${status} successfully.`);
      setRequestItem(res.joinRequest);
    } catch (err) {
      setActionError(err.message || `Failed to ${status.toLowerCase()} request.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel this join request?")) {
      return;
    }

    setSubmitting(true);
    setActionError("");
    setActionSuccess("");

    try {
      const res = await api.cancelJoinRequest(requestItem.id, decisionNote);
      setActionSuccess("Request cancelled successfully.");
      setRequestItem(res.joinRequest);
    } catch (err) {
      setActionError(err.message || "Failed to cancel request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppShell {...props}>
        <LoadingWindow text="Loading request details" />
      </AppShell>
    );
  }

  const offer = requestItem?.offer;
  const owner = requestItem?.owner;
  const requester = requestItem?.requester;
  const currentUserId = (props.user?.id || props.user?._id || "").toString();
  const isOwner = currentUserId && (requestItem?.ownerUserId === currentUserId);
  const isRequester = currentUserId && (requestItem?.requesterUserId === currentUserId);
  const isPending = requestItem?.status === "Pending";
  const isAccepted = requestItem?.status === "Accepted";

  return (
    <AppShell {...props}>
      <section className="intro compact-intro" style={{ marginBottom: "1rem" }}>
        <button
          type="button"
          className="secondary-button compact"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12 }}
          onClick={goBack}
        >
          <ArrowLeft size={14} />
          Back to My Requests
        </button>
        <h2>Join Request Details</h2>
        <p>View the status and complete information for this ride request.</p>
      </section>

      {actionSuccess && <div className="top-alert" role="status" style={{ marginBottom: "1rem" }}>{actionSuccess}</div>}
      {actionError && <p className="validation-message" style={{ marginBottom: "1rem" }}>{actionError}</p>}

      {error || !requestItem ? (
        <section className="panel empty-offers">
          <h3>Request Unavailable</h3>
          <p>{error || "The requested join request could not be found."}</p>
          <button className="primary-button compact" type="button" onClick={goBack} style={{ marginTop: "1rem" }}>
            Back to My Requests
          </button>
        </section>
      ) : (
        <section className="panel ride-detail-panel">
          <div className="ride-detail-heading">
            <div>
              <h3>
                <MapPin size={20} fill="#ef4444" color="#ef4444" style={{ display: "inline", marginRight: 6 }} />
                {offer ? `${offer.origin} → ${offer.destination}` : "Ride Offer Details"}
              </h3>
              {offer && (
                <p>
                  <Clock size={12} style={{ display: "inline", marginRight: 4 }} />
                  {offer.departureDate} • {offer.departureTime} • {offer.timeWindow}
                </p>
              )}
            </div>
            <div className="ride-heading-actions">
              <StatusBadge status={requestItem.status} />
            </div>
          </div>

          <hr />

          <div className="ride-detail-body" style={{ display: "grid", gap: "1.5rem" }}>
            {/* Request Details */}
            <aside className="ride-management-panel" style={{ width: "100%" }}>
              <h4 style={{ marginBottom: "1rem" }}>Request Information</h4>
              <div className="ride-detail-grid">
                <Info label="Request Status" value={requestItem.status} />
                <Info
                  label="Requested Date"
                  value={requestItem.requestedAt ? new Date(requestItem.requestedAt).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short"
                  }) : "—"}
                />
                {requestItem.decidedAt && (
                  <Info
                    label="Decision Date"
                    value={new Date(requestItem.decidedAt).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short"
                    })}
                  />
                )}
                {owner && !isOwner && (
                  <Info label="Ride Owner / Driver" value={`${owner.firstName} ${owner.lastName}`} />
                )}
                {requester && isOwner && (
                  <>
                    <Info label="Passenger Name" value={requester.name || `${requester.firstName} ${requester.lastName}`} />
                    {requester.studentStaffId && (
                      <Info label="Passenger ID" value={requester.studentStaffId} />
                    )}
                    <Info label="Passenger Phone" value={requester.phoneNumber || "—"} />
                    <Info label="Passenger Email" value={requester.email || "—"} />
                  </>
                )}
              </div>

              {requestItem.requestNote && (
                <div className="request-note-box" style={{ marginTop: "1.25rem", padding: "0.85rem 1rem", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                    <FileText size={13} /> Passenger Note
                  </span>
                  <p style={{ margin: 0, fontSize: "14px", color: "#1e293b", fontStyle: "italic" }}>
                    "{requestItem.requestNote}"
                  </p>
                </div>
              )}

              {requestItem.decisionNote && (
                <div className="decision-note-box" style={{ marginTop: "1rem" }}>
                  <strong>Driver Decision Note:</strong> {requestItem.decisionNote}
                </div>
              )}

              {/* Requester Action Controls */}
              {isRequester && (
                <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid #e2e8f0" }}>
                  <h4 style={{ fontSize: "0.95rem", marginBottom: "0.75rem" }}>Manage Your Join Request</h4>
                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                    <button
                      type="button"
                      className="primary-button compact"
                      style={{ gap: 6 }}
                      onClick={() => {
                        sessionStorage.setItem("activeChatOfferId", requestItem.rideOfferId);
                        sessionStorage.setItem("activeChatPartnerId", requestItem.ownerUserId);
                        props.setView("messages");
                      }}
                    >
                      Message Offer Owner
                    </button>

                    {isPending && (
                      <button
                        type="button"
                        className="danger-button compact"
                        disabled={submitting}
                        onClick={async () => {
                          if (!window.confirm("Are you sure you want to cancel this pending join request?")) return;
                          setSubmitting(true);
                          setActionError("");
                          try {
                            const res = await api.cancelJoinRequest(requestItem.id);
                            setActionSuccess("Join request cancelled successfully.");
                            setRequestItem(res.joinRequest);
                          } catch (err) {
                            setActionError(err.message || "Failed to cancel request.");
                          } finally {
                            setSubmitting(false);
                          }
                        }}
                      >
                        <Ban size={14} /> Cancel Pending Request
                      </button>
                    )}

                    {isAccepted && (
                      <button
                        type="button"
                        className="danger-button compact"
                        disabled={submitting}
                        onClick={async () => {
                          if (!window.confirm("Are you sure you want to leave this joined ride? The seat will be restored to the offer.")) return;
                          setSubmitting(true);
                          setActionError("");
                          try {
                            const res = await api.leaveRide(requestItem.id);
                            setActionSuccess("You have left the ride successfully.");
                            setRequestItem(res.joinRequest);
                          } catch (err) {
                            setActionError(err.message || "Failed to leave ride.");
                          } finally {
                            setSubmitting(false);
                          }
                        }}
                      >
                        <Ban size={14} /> Leave Joined Ride
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Owner Action Controls */}
              {isOwner && (
                <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
                    <button
                      type="button"
                      className="primary-button compact"
                      onClick={() => {
                        sessionStorage.setItem("activeChatOfferId", requestItem.rideOfferId);
                        sessionStorage.setItem("activeChatPartnerId", requestItem.requesterUserId);
                        props.setView("messages");
                      }}
                    >
                      Message Passenger
                    </button>
                  </div>

                  {isPending && (
                    <>
                      <h4 style={{ fontSize: "0.95rem", marginBottom: "0.75rem" }}>Make a Decision</h4>
                      <div style={{ marginBottom: "0.75rem" }}>
                        <input
                          type="text"
                          className="request-note-textarea"
                          placeholder="Optional note for the passenger..."
                          value={decisionNote}
                          onChange={(e) => setDecisionNote(e.target.value)}
                        />
                      </div>
                      <div style={{ display: "flex", gap: "0.75rem" }}>
                        <button
                          type="button"
                          className="btn-reject"
                          style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
                          disabled={submitting}
                          onClick={() => handleDecision("Rejected")}
                        >
                          <XCircle size={15} /> Reject Request
                        </button>
                        <button
                          type="button"
                          className="btn-accept"
                          style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
                          disabled={submitting || (offer && offer.availableSeats <= 0)}
                          onClick={() => handleDecision("Accepted")}
                        >
                          <CheckCircle size={15} /> Accept Request
                        </button>
                      </div>
                    </>
                  )}

                  {isAccepted && (
                    <>
                      <h4 style={{ fontSize: "0.95rem", marginBottom: "0.75rem" }}>Manage Confirmed Booking</h4>
                      <button
                        type="button"
                        className="btn-cancel-request"
                        style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
                        disabled={submitting}
                        onClick={handleCancel}
                      >
                        <Ban size={15} /> Revoke Acceptance (Release Seat)
                      </button>
                    </>
                  )}
                </div>
              )}
            </aside>


            {offer && (
              <aside className="ride-management-panel" style={{ width: "100%" }}>
                <h4 style={{ marginBottom: "1rem" }}>Associated Ride Offer</h4>
                <div className="ride-detail-grid">
                  <Info label="Origin" value={offer.origin} />
                  <Info label="Destination" value={offer.destination} />
                  <Info label="Departure Date" value={offer.departureDate} />
                  <Info label="Departure Time" value={offer.departureTime} />
                  <Info label="Time Window" value={offer.timeWindow} />
                  <Info label="Available Seats" value={`${offer.availableSeats} seat${offer.availableSeats !== 1 ? "s" : ""}`} />
                  <Info label="Offer Status" value={offer.status} />
                </div>
              </aside>
            )}
          </div>
        </section>
      )}
    </AppShell>
  );
}
