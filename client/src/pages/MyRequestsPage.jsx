import { useEffect, useState } from "react";
import { MapPin, Clock, CheckCircle, XCircle, Hourglass } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { LoadingWindow } from "../components/LoadingWindow";
import { api } from "../services/api";

function RequestStatusBadge({ status }) {
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

export function MyRequestsPage(props) {
  const [requests, setRequests] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.myJoinRequests()
      .then((data) => { setRequests(data.joinRequests || []); setLoading(false); })
      .catch((err) => { setError(err.message || "Failed to load requests."); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <AppShell {...props}>
        <LoadingWindow text="Loading your requests" />
      </AppShell>
    );
  }

  return (
    <AppShell {...props}>
      <section className="intro">
        <h2>My Ride Requests</h2>
        <p>Track the status of your join requests.</p>
      </section>

      {error && (
        <p className="validation-message" style={{ marginBottom: "1rem" }}>{error}</p>
      )}

      {!error && requests !== null && requests.length === 0 && (
        <article className="panel">
          <div className="empty-offers">
            <h3>No requests yet</h3>
            <p>You haven't submitted any ride requests. Find a ride and request to join!</p>
            <button
              id="find-ride-from-requests-btn"
              type="button"
              className="primary-button compact"
              style={{ marginTop: "1rem" }}
              onClick={() => props.setView("find")}
            >
              Find a Ride
            </button>
          </div>
        </article>
      )}

      {!error && requests && requests.length > 0 && (
        <div className="offers-list my-requests-list">
          {requests.map((req) => (
            <button
              key={req.id}
              id={`request-card-${req.id}`}
              type="button"
              className="panel my-request-card offer-card-button"
              onClick={() => props.openRequestDetails ? props.openRequestDetails(req.id) : props.setView("requestDetails")}
              style={{ textAlign: "left", width: "100%", cursor: "pointer" }}
            >
              <div className="my-request-main">
                {req.offer ? (
                  <>
                    <h3>
                      <MapPin size={12} style={{ display: "inline", marginRight: 4 }} />
                      {req.offer.origin} → {req.offer.destination}
                    </h3>
                    <p className="request-offer-meta">
                      <Clock size={11} style={{ display: "inline", marginRight: 3 }} />
                      {req.offer.departureDate} • {req.offer.departureTime} • {req.offer.timeWindow}
                    </p>
                    <p className="request-offer-meta" style={{ marginTop: "2px" }}>
                      Offer status: <strong>{req.offer.status}</strong>
                    </p>
                  </>
                ) : (
                  <h3>Ride offer unavailable</h3>
                )}
                {req.requestNote && (
                  <p className="request-note-preview">
                    <em>Note: {req.requestNote}</em>
                  </p>
                )}
                <p className="request-date">
                  Requested {req.requestedAt ? new Date(req.requestedAt).toLocaleDateString() : "—"}
                </p>
              </div>
              <div className="my-request-status">
                <RequestStatusBadge status={req.status} />
              </div>
            </button>
          ))}
        </div>
      )}
    </AppShell>
  );
}
