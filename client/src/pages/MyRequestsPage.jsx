import { useEffect, useState } from "react";
import {
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Hourglass,
  CalendarDays,
  ChevronRight,
  Ban
} from "lucide-react";
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

export function MyRequestsPage(props) {
  const [activeTab, setActiveTab] = useState("received"); // 'received' | 'sent'
  const [statusFilter, setStatusFilter] = useState("All"); // 'All' | 'Pending' | 'Accepted' | 'Rejected' | 'Cancelled'
  
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [sentRes, receivedRes] = await Promise.all([
        api.myJoinRequests().catch(() => ({ joinRequests: [] })),
        api.receivedJoinRequests().catch(() => ({ joinRequests: [] }))
      ]);
      setSentRequests(sentRes.joinRequests || []);
      setReceivedRequests(receivedRes.joinRequests || []);
    } catch (err) {
      setError(err.message || "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <AppShell {...props}>
        <LoadingWindow text="Loading join requests" />
      </AppShell>
    );
  }

  const pendingReceivedCount = receivedRequests.filter((r) => r.status === "Pending").length;

  const currentList = activeTab === "received" ? receivedRequests : sentRequests;
  const filteredList =
    statusFilter === "All" ? currentList : currentList.filter((r) => r.status === statusFilter);

  return (
    <AppShell {...props}>
      <section className="intro">
        <h2>Requests</h2>
        <p>Manage passenger requests for your rides and track requests you have submitted.</p>
      </section>

      {/* Tabs */}
      <div className="requests-tabs">
        <button
          id="tab-received-requests"
          type="button"
          className={`requests-tab-btn ${activeTab === "received" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("received");
            setStatusFilter("All");
            setActionError("");
            setSuccessMessage("");
          }}
        >
          Received Requests
          {pendingReceivedCount > 0 ? (
            <span className="tab-count-badge">{pendingReceivedCount} pending</span>
          ) : (
            <span className="tab-count-badge neutral">{receivedRequests.length}</span>
          )}
        </button>
        <button
          id="tab-sent-requests"
          type="button"
          className={`requests-tab-btn ${activeTab === "sent" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("sent");
            setStatusFilter("All");
            setActionError("");
            setSuccessMessage("");
          }}
        >
          Sent Requests
          <span className="tab-count-badge neutral">{sentRequests.length}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="requests-filter-bar">
        {["All", "Pending", "Accepted", "Rejected"].map((filter) => (
          <button
            key={filter}
            type="button"
            className={`filter-pill ${statusFilter === filter ? "active" : ""}`}
            onClick={() => setStatusFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      {error && <p className="validation-message" style={{ marginBottom: "1rem" }}>{error}</p>}
      {actionError && <p className="validation-message" style={{ marginBottom: "1rem" }}>{actionError}</p>}
      {successMessage && <div className="top-alert" role="status" style={{ marginBottom: "1rem" }}>{successMessage}</div>}

      {/* ── RECEIVED REQUESTS TAB ────────────────────────────────────────────── */}
      {activeTab === "received" && (
        <>
          {filteredList.length === 0 ? (
            <article className="panel">
              <div className="empty-offers">
                <h3>No received requests</h3>
                <p>
                  {statusFilter === "All"
                    ? "You have not received any join requests for your ride offers yet."
                    : `No received requests with status "${statusFilter}".`}
                </p>
                <button
                  type="button"
                  className="primary-button compact"
                  style={{ marginTop: "1rem" }}
                  onClick={() => props.setView("createRide")}
                >
                  + Offer a Ride
                </button>
              </div>
            </article>
          ) : (
            <div className="offers-list" style={{ gap: "0.85rem" }}>
              {filteredList.map((req) => {
                const requesterName =
                  req.requester?.name ||
                  (req.requester?.firstName
                    ? `${req.requester.firstName} ${req.requester.lastName || ""}`.trim()
                    : "Passenger");

                return (
                  <article
                    key={req.id}
                    id={`received-request-${req.id}`}
                    className="received-request-card"
                    onClick={() => {
                      if (props.openRequestDetails) {
                        props.openRequestDetails(req.id);
                      } else {
                        sessionStorage.setItem("selectedRequestId", req.id);
                        props.setView("requestDetails");
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (props.openRequestDetails) {
                          props.openRequestDetails(req.id);
                        } else {
                          sessionStorage.setItem("selectedRequestId", req.id);
                          props.setView("requestDetails");
                        }
                      }
                    }}
                  >
                    {/* Header: Passenger Name & Request Status Badge */}
                    <div className="requester-header">
                      <div className="requester-profile-meta">
                        <div className="requester-avatar">
                          {requesterName.charAt(0).toUpperCase()}
                        </div>
                        <div className="requester-details">
                          <h4>{requesterName}</h4>
                          <p>
                            <CalendarDays size={12} style={{ display: "inline", marginRight: 4 }} />
                            Requested: {req.requestedAt ? new Date(req.requestedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <RequestStatusBadge status={req.status} />
                        <ChevronRight size={16} className="text-brand-muted" />
                      </div>
                    </div>

                    {/* Ride route and departure details info box */}
                    {req.offer && (
                      <div className="received-request-ride-info">
                        <h5>
                          <MapPin size={13} style={{ display: "inline", marginRight: 4 }} />
                          {req.offer.origin} → {req.offer.destination}
                        </h5>
                        <p>
                          <Clock size={12} style={{ display: "inline", marginRight: 4 }} />
                          {req.offer.departureDate} • {req.offer.departureTime}
                          {req.offer.timeWindow && ` (${req.offer.timeWindow})`}
                        </p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── SENT REQUESTS TAB ────────────────────────────────────────────────── */}
      {activeTab === "sent" && (
        <>
          {filteredList.length === 0 ? (
            <article className="panel">
              <div className="empty-offers">
                <h3>No sent requests</h3>
                <p>
                  {statusFilter === "All"
                    ? "You haven't submitted any ride requests yet."
                    : `No sent requests with status "${statusFilter}".`}
                </p>
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
          ) : (
            <div className="offers-list my-requests-list">
              {filteredList.map((req) => {
                return (
                  <div
                    key={req.id}
                    id={`request-card-${req.id}`}
                    className="panel my-request-card"
                    style={{ position: "relative" }}
                  >
                    <div
                      className="my-request-main"
                      onClick={() =>
                        props.openRequestDetails
                          ? props.openRequestDetails(req.id)
                          : props.setView("requestDetails")
                      }
                      style={{ cursor: "pointer" }}
                    >
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
                          <em>Your Note: "{req.requestNote}"</em>
                        </p>
                      )}
                      {req.decisionNote && (
                        <p className="request-note-preview" style={{ color: "#1e40af" }}>
                          <em>Driver Note: "{req.decisionNote}"</em>
                        </p>
                      )}
                      <p className="request-date">
                        Requested {req.requestedAt ? new Date(req.requestedAt).toLocaleDateString() : "—"}
                        {req.decidedAt && ` • Decided ${new Date(req.decidedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="my-request-status" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
                      <RequestStatusBadge status={req.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
