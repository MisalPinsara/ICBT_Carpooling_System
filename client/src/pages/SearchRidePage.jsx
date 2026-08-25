import { useState } from "react";
import { Search, MapPin, Calendar, Clock } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { LoadingWindow } from "../components/LoadingWindow";
import { api } from "../services/api";

const TIME_WINDOWS = [
  "Any time",
  "6:00 AM - 7:00 AM",
  "7:00 AM - 8:00 AM",
  "7:30 AM - 8:30 AM",
  "8:00 AM - 9:00 AM",
  "8:30 AM - 9:30 AM",
  "9:00 AM - 10:00 AM",
  "4:00 PM - 5:00 PM",
  "5:00 PM - 6:00 PM",
  "5:30 PM - 6:30 PM",
  "6:00 PM - 7:00 PM"
];

function StatusBadge({ status }) {
  const cls = status === "Active" ? "badge green" : "badge neutral";
  return <span className={cls}>{status.toUpperCase()}</span>;
}

export function SearchRidePage(props) {
  const [form, setForm] = useState({ origin: "", destination: "", date: "", timeWindow: "" });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api.searchRides({
        origin: form.origin,
        destination: form.destination,
        date: form.date,
        timeWindow: form.timeWindow === "Any time" ? "" : form.timeWindow
      });
      setResults(data.offers || []);
    } catch (err) {
      setError(err.message || "Search failed. Please try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = (offerId) => {
    props.openPublicOfferDetail(offerId);
  };

  return (
    <AppShell {...props}>
      <section className="intro">
        <h2>Find a Ride</h2>
        <p>Search active ride offers to your campus destination.</p>
      </section>

      <article className="panel search-form-panel">
        <form className="search-form" onSubmit={handleSearch} id="search-ride-form">
          <div className="search-fields">
            <div className="search-field-wrap">
              <label className="search-label" htmlFor="search-origin">
                <MapPin size={14} />
                From
              </label>
              <div className="input-wrap">
                <input
                  id="search-origin"
                  type="text"
                  placeholder="e.g. Maharagama"
                  value={form.origin}
                  onChange={set("origin")}
                />
              </div>
            </div>
            <div className="search-field-wrap">
              <label className="search-label" htmlFor="search-destination">
                <MapPin size={14} />
                To
              </label>
              <div className="input-wrap">
                <input
                  id="search-destination"
                  type="text"
                  placeholder="e.g. ICBT Campus"
                  value={form.destination}
                  onChange={set("destination")}
                />
              </div>
            </div>
            <div className="search-field-wrap">
              <label className="search-label" htmlFor="search-date">
                <Calendar size={14} />
                Date
              </label>
              <div className="input-wrap">
                <input
                  id="search-date"
                  type="text"
                  placeholder="e.g. Tomorrow, Friday"
                  value={form.date}
                  onChange={set("date")}
                />
              </div>
            </div>
            <div className="search-field-wrap">
              <label className="search-label" htmlFor="search-time-window">
                <Clock size={14} />
                Time Window
              </label>
              <div className="input-wrap">
                <select
                  id="search-time-window"
                  value={form.timeWindow}
                  onChange={set("timeWindow")}
                  className="search-select"
                >
                  <option value="">Any time</option>
                  {TIME_WINDOWS.map((tw) => (
                    <option key={tw} value={tw}>{tw}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <button id="search-ride-submit" type="submit" className="primary-button search-submit-btn" disabled={loading}>
            <Search size={16} />
            {loading ? "Searching…" : "Search Rides"}
          </button>
        </form>
      </article>

      {loading && <LoadingWindow text="Searching for rides" />}

      {!loading && error && (
        <p className="form-error validation-message" style={{ marginTop: "1rem" }}>{error}</p>
      )}

      {!loading && results !== null && (
        <section className="search-results">
          <h3 className="search-results-title">
            {results.length > 0
              ? `${results.length} ride${results.length !== 1 ? "s" : ""} found`
              : "No rides found"}
          </h3>

          {results.length === 0 ? (
            <article className="panel">
              <div className="empty-offers">
                <h3>No matching rides</h3>
                <p>Try adjusting your search criteria or check back later.</p>
              </div>
            </article>
          ) : (
            <div className="offers-list">
              {results.map((offer) => (
                <button
                  key={offer.id}
                  id={`offer-card-${offer.id}`}
                  type="button"
                  className="panel offer-card offer-card-button"
                  onClick={() => openDetail(offer.id)}
                >
                  <div className="offer-card-main">
                    <h3>
                      <MapPin size={12} style={{ display: "inline", marginRight: 4 }} />
                      {offer.origin} → {offer.destination}
                    </h3>
                    <p>
                      {offer.departureDate} • {offer.departureTime} • {offer.timeWindow}
                    </p>
                    {offer.owner && (
                      <p style={{ marginTop: "4px" }}>
                        Offered by {offer.owner.firstName} {offer.owner.lastName}
                      </p>
                    )}
                  </div>
                  <div className="offer-card-meta">
                    <StatusBadge status={offer.status} />
                    <span className="seats-badge">{offer.availableSeats} seat{offer.availableSeats !== 1 ? "s" : ""}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </AppShell>
  );
}
