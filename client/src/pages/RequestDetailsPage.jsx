import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MapPin, Clock, CalendarDays, UserRound, ArrowLeft, Hourglass, CheckCircle, XCircle, FileText } from "lucide-react";
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
  return (
    <span className="request-status-badge request-status-rejected">
      <XCircle size={12} />
      {status}
    </span>
  );
}

export function RequestDetailsPage(props) {
  const [requestItem, setRequestItem] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const { requestId: routeRequestId } = useParams();

  const requestId = routeRequestId || props.selectedRequestId || sessionStorage.getItem("selectedRequestId");

  useEffect(() => {
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
  }, [requestId]);

  const goBack = () => {
    props.setView("myRequests");
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
                <Info label="Request ID" value={requestItem.id} />
                {owner && (
                  <Info label="Offer Owner" value={`${owner.firstName} ${owner.lastName}`} />
                )}
              </div>

              {requestItem.requestNote && (
                <div className="request-note-box" style={{ marginTop: "1.25rem", padding: "0.85rem 1rem", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                    <FileText size={13} /> Request Note
                  </span>
                  <p style={{ margin: 0, fontSize: "14px", color: "#1e293b", fontStyle: "italic" }}>
                    "{requestItem.requestNote}"
                  </p>
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
