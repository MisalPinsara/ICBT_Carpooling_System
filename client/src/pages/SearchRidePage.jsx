import { useState } from "react";
import { Search, MapPin, CalendarDays, Clock3 } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { LoadingWindow } from "../components/LoadingWindow";
import { PickerField } from "../components/PickerField";
import { api } from "../services/api";

// ── Date options: identical logic to RideCreatePage ──────────────────────────
const DATE_OPTIONS = createDateOptions();

function createDateOptions() {
  const formatter = new Intl.DateTimeFormat("en", { weekday: "long", month: "short", day: "numeric" });
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    if (index === 0) return "Today";
    if (index === 1) return "Tomorrow";
    return formatter.format(date);
  });
}

// ── Time window options: identical logic to RideCreatePage ───────────────────
const TIME_WINDOW_OPTIONS = createTimeWindowOptions();

function formatTime(date) {
  return date.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
}

function createTimeWindowOptions() {
  const options = [];
  const date = new Date();
  date.setHours(6, 0, 0, 0);
  const end = new Date(date);
  end.setHours(20, 0, 0, 0);
  while (date <= end) {
    const start = new Date(date);
    const finish = new Date(date);
    finish.setMinutes(finish.getMinutes() + 60);
    options.push(`${formatTime(start)} - ${formatTime(finish)}`);
    date.setMinutes(date.getMinutes() + 30);
  }
  return options;
}

// "Any date" / "Any time" sentinel values (empty string = no filter applied)
const DATE_PICKER_OPTIONS = ["Any date", ...DATE_OPTIONS];
const TIME_WINDOW_PICKER_OPTIONS = ["Any time", ...TIME_WINDOW_OPTIONS];

function StatusBadge({ status }) {
  const cls = status === "Active" ? "badge green" : "badge neutral";
  return <span className={cls}>{status.toUpperCase()}</span>;
}

export function SearchRidePage(props) {
  const [form, setForm] = useState({ origin: "", destination: "", date: "", timeWindow: "" });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const setField = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));

  // For plain text inputs (origin / destination) onChange still gives an event
  const setInput = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api.searchRides({
        origin: form.origin,
        destination: form.destination,
        date: form.date === "Any date" ? "" : form.date,
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

            {/* From */}
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
                  onChange={setInput("origin")}
                />
              </div>
            </div>

            {/* To */}
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
                  onChange={setInput("destination")}
                />
              </div>
            </div>

            {/* Date – custom PickerField */}
            <div className="search-field-wrap search-picker-wrap">
              <PickerField
                label="Date"
                icon={<CalendarDays size={18} />}
                value={form.date}
                placeholder="Any date"
                options={DATE_PICKER_OPTIONS}
                onChange={setField("date")}
              />
            </div>

            {/* Time Window – custom PickerField */}
            <div className="search-field-wrap search-picker-wrap">
              <PickerField
                label="Time Window"
                icon={<Clock3 size={18} />}
                value={form.timeWindow}
                placeholder="Any time"
                options={TIME_WINDOW_PICKER_OPTIONS}
                onChange={setField("timeWindow")}
              />
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
