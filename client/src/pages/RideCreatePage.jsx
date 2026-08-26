import { useEffect, useState } from "react";
import { CalendarDays, Clock3, MapPin, UserRound } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { Field } from "../components/Field";
import { LoadingWindow } from "../components/LoadingWindow";
import { PickerField } from "../components/PickerField";
import { api } from "../services/api";
import { hasErrors, validateRideForm } from "../utils/validation";

const dateOptions = createDateOptions();
const timeOptions = createTimeOptions();
const timeWindowOptions = createTimeWindowOptions();

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

function formatTime(date) {
  return date.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
}

function createTimeOptions() {
  const options = [];
  const date = new Date();
  date.setHours(6, 0, 0, 0);
  const end = new Date(date);
  end.setHours(21, 0, 0, 0);
  while (date <= end) {
    options.push(formatTime(date));
    date.setMinutes(date.getMinutes() + 15);
  }
  return options;
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

export function RideCreatePage(props) {
  const [form, setForm] = useState(null);
  const [offers, setOffers] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [flash, setFlash] = useState(() => sessionStorage.getItem("rideOfferFlash") || "");

  useEffect(() => {
    let isMounted = true;
    Promise.all([api.rideDraft(), api.activeRideOffers()])
      .then(([data, offerData]) => {
        if (!isMounted) return;
        const ride = data?.draft || {};
        setForm({
          origin: ride.origin || "",
          destination: ride.destination || "",
          departureDate: ride.departureDate || "",
          departureTime: ride.departureTime || "",
          timeWindow: ride.timeWindow || "",
          availableSeats: ride.availableSeats || ""
        });
        setOffers(Array.isArray(offerData?.offers) ? offerData.offers : []);
      })
      .catch(() => {
        if (!isMounted) return;
        setForm({
          origin: "",
          destination: "",
          departureDate: "",
          departureTime: "",
          timeWindow: "",
          availableSeats: ""
        });
        setOffers([]);
      });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!flash) return undefined;
    sessionStorage.removeItem("rideOfferFlash");
    const timeoutId = window.setTimeout(() => setFlash(""), 4200);
    return () => window.clearTimeout(timeoutId);
  }, [flash]);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: "" }));
  };

  const reviewOffer = () => {
    const validation = validateRideForm(form);
    setFieldErrors(validation);
    if (hasErrors(validation)) return;
    sessionStorage.setItem("pendingRideOffer", JSON.stringify(form));
    props.setView("reviewRide");
  };

  if (!form || !offers) {
    return (
      <AppShell {...props}>
        <LoadingWindow text="Loading ride offers" />
      </AppShell>
    );
  }

  return (
    <AppShell {...props}>
      {flash && <div className="top-alert" role="status">{flash}</div>}
      <section className="offers-title-row">
        <div className="intro compact-intro">
          <h2>Offer a ride</h2>
          <p>Manage your active ride offers.</p>
        </div>
        <button className="primary-button offer-open-button" type="button" onClick={() => setShowForm(true)}>+ Create / Offer Ride</button>
      </section>
      {offers.length === 0 ? (
        <section className="panel empty-offers">
          <h3>No offers</h3>
        </section>
      ) : (
        <section className="offers-list">
          {offers.map((offer) => (
            <button className="panel offer-card offer-card-button" type="button" key={offer.id} onClick={() => props.openRideDetails(offer.id, "createRide")}>
              <div>
                <h3>{offer.origin} → {offer.destination}</h3>
                <p>{offer.departureDate} • {offer.departureTime} • {offer.timeWindow}</p>
              </div>
              <span>{offer.availableSeats} seats available</span>
            </button>
          ))}
        </section>
      )}
      {showForm && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel offer-modal" role="dialog" aria-modal="true" aria-labelledby="offer-modal-title">
            <div className="modal-heading">
              <div>
                <h2 id="offer-modal-title">Offer a ride</h2>
                <p>Add your route and departure details.</p>
              </div>
              <button className="modal-close" type="button" onClick={() => setShowForm(false)} aria-label="Close">&times;</button>
            </div>
            <div className="form-grid two">
              <Field label="Origin" icon={<MapPin size={18} fill="#ef4444" color="#ef4444" />} value={form.origin} error={fieldErrors.origin} onChange={(value) => update("origin", value)} />
              <Field label="Destination" icon={<MapPin size={18} fill="#ef4444" color="#ef4444" />} value={form.destination} error={fieldErrors.destination} onChange={(value) => update("destination", value)} />
            </div>
            <PickerField label="Departure date" icon={<CalendarDays size={18} />} value={form.departureDate} placeholder="Select departure date" options={dateOptions} error={fieldErrors.departureDate} onChange={(value) => update("departureDate", value)} />
            <PickerField label="Departure time" icon={<Clock3 size={18} />} value={form.departureTime} placeholder="Select departure time" options={timeOptions} error={fieldErrors.departureTime} onChange={(value) => update("departureTime", value)} />
            <PickerField label="Time window" icon={<Clock3 size={18} />} value={form.timeWindow} placeholder="Select time window" options={timeWindowOptions} error={fieldErrors.timeWindow} onChange={(value) => update("timeWindow", value)} />
            <div className="short-field">
              <Field label="Available seats" icon={<UserRound size={18} />} type="number" value={String(form.availableSeats)} error={fieldErrors.availableSeats} onChange={(value) => update("availableSeats", value)} />
            </div>
            <label className="visibility-label">Ride visibility</label>
            <div className="visibility-box"><span /> Available to matching ICBT users</div>
            <button className="primary-button review-button" type="button" onClick={reviewOffer}>Review ride offer</button>
          </section>
        </div>
      )}
    </AppShell>
  );
}
