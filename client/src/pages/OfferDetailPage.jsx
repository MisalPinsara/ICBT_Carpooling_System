import { useEffect, useState } from "react";
import { MapPin, Clock, Car, Users, CheckCircle, AlertCircle } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { LoadingWindow } from "../components/LoadingWindow";
import { api } from "../services/api";

function StatusBadge({ status }) {
  const map = {
    Active: "badge green",
    Inactive: "badge neutral",
    Cancelled: "badge neutral",
    Completed: "badge neutral"
  };
  return <span className={map[status] || "badge neutral"}>{status.toUpperCase()}</span>;
}

export function OfferDetailPage(props) {
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [note, setNote] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [showNoteField, setShowNoteField] = useState(false);

  useEffect(() => {
    if (!props.selectedPublicOfferId) {
      setFetchError("No offer selected.");
      setLoading(false);
      return;
    }
    api.publicRideOffer(props.selectedPublicOfferId)
      .then((data) => { setOffer(data.offer); setLoading(false); })
      .catch((err) => { setFetchError(err.message || "Failed to load offer."); setLoading(false); });
  }, [props.selectedPublicOfferId]);

  const handleRequestJoin = async () => {
    setRequesting(true);
    setRequestError("");
    try {
      await api.joinRequest(props.selectedPublicOfferId, note);
      setRequestSuccess(true);
      setShowNoteField(false);
    } catch (err) {
      setRequestError(err.message || "Failed to submit request. Please try again.");
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <AppShell {...props}>
        <LoadingWindow text="Loading ride details" />
      </AppShell>
    );
  }

  if (fetchError || !offer) {
    return (
      <AppShell {...props}>
        <div className="empty-page-panel">
          <p>{fetchError || "Ride offer not found."}</p>
          <button type="button" className="secondary-button" onClick={() => props.setView("find")} style={{ marginTop: "1rem" }}>
            Back to Search
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell {...props}>
      <article className="panel ride-detail-panel offer-public-detail">
        {/* ── Heading ── */}
        <div className="ride-detail-heading">
          <div>
            <h3>
              <Car size={18} style={{ display: "inline", marginRight: 6, color: "#f04438" }} />
              {offer.origin} → {offer.destination}
            </h3>
            <p>{offer.departureDate} • {offer.departureTime} • {offer.timeWindow}</p>
          </div>
          <div className="ride-heading-actions">
            <StatusBadge status={offer.status} />
          </div>
        </div>

        <hr />

        {/* ── Detail grid ── */}
        <div className="ride-detail-body">
          <div>
            <div className="ride-meta">
              <div>
                <span><MapPin size={11} style={{ display: "inline", marginRight: 3 }} />Route</span>
                <strong>{offer.origin} → {offer.destination}</strong>
              </div>
              <div>
                <span><Clock size={11} style={{ display: "inline", marginRight: 3 }} />Departure</span>
                <strong>{offer.departureDate} at {offer.departureTime}</strong>
              </div>
              <div>
                <span>Time Window</span>
                <strong>{offer.timeWindow}</strong>
              </div>
              <div>
                <span><Users size={11} style={{ display: "inline", marginRight: 3 }} />Available Seats</span>
                <strong>{offer.availableSeats} seat{offer.availableSeats !== 1 ? "s" : ""} available</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{offer.status}</strong>
              </div>
            </div>

            {/* ── Owner summary (privacy-safe: firstName + lastName only) ── */}
            {offer.owner && (
              <div className="owner-summary-box">
                <span>Offered by</span>
                <strong>{offer.owner.firstName} {offer.owner.lastName}</strong>
              </div>
            )}
          </div>

          {/* ── Request panel ── */}
          <div className="passenger-panel">
            <h4>Request to Join</h4>

            {requestSuccess ? (
              <div className="request-success-box">
                <CheckCircle size={28} color="#12b76a" />
                <strong>Request Submitted</strong>
                <p>Your join request is pending. The driver will review it shortly.</p>
                <button
                  id="view-my-requests-btn"
                  type="button"
                  className="primary-button compact"
                  style={{ marginTop: "0.5rem" }}
                  onClick={() => props.setView("myRequests")}
                >
                  View My Requests
                </button>
              </div>
            ) : (
              <>
                {offer.status !== "Active" || offer.availableSeats <= 0 ? (
                  <div className="request-unavailable-box">
                    <AlertCircle size={20} color="#f04438" />
                    <p>This ride is currently not available for requests.</p>
                  </div>
                ) : (
                  <>
                    <p style={{ marginBottom: "1rem" }}>
                      Send a request to join this ride. The driver will be notified.
                    </p>

                    {!showNoteField ? (
                      <button
                        id="request-join-btn"
                        type="button"
                        className="primary-button"
                        onClick={() => setShowNoteField(true)}
                      >
                        Request to Join
                      </button>
                    ) : (
                      <div className="request-note-wrap">
                        <label className="search-label" htmlFor="request-note">
                          Message (optional)
                        </label>
                        <textarea
                          id="request-note"
                          className="request-note-textarea"
                          placeholder="Add a note for the driver…"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          rows={3}
                        />
                        {requestError && (
                          <p className="validation-message" style={{ marginBottom: "0.5rem" }}>{requestError}</p>
                        )}
                        <div className="request-note-actions">
                          <button
                            id="confirm-join-request-btn"
                            type="button"
                            className="primary-button compact"
                            onClick={handleRequestJoin}
                            disabled={requesting}
                          >
                            {requesting ? "Submitting…" : "Confirm Request"}
                          </button>
                          <button
                            type="button"
                            className="secondary-button compact"
                            onClick={() => { setShowNoteField(false); setRequestError(""); }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </article>
    </AppShell>
  );
}
