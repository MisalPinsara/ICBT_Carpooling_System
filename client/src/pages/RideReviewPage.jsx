import { useEffect, useState } from "react";
import { AppShell } from "../components/AppShell";
import { LoadingWindow } from "../components/LoadingWindow";
import { api } from "../services/api";

export function RideReviewPage(props) {
  const [ride, setRide] = useState(null);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    const pendingRide = sessionStorage.getItem("pendingRideOffer");
    if (pendingRide) {
      try {
        setRide(JSON.parse(pendingRide));
        return;
      } catch {
        sessionStorage.removeItem("pendingRideOffer");
      }
    }
    api.rideDraft().then((data) => setRide(data.draft));
  }, []);

  async function publish() {
    if (publishing) return;
    setError("");
    setPublishing(true);
    try {
      const payload = {
        origin: ride.origin,
        destination: ride.destination,
        departureDate: ride.departureDate,
        departureTime: ride.departureTime,
        timeWindow: ride.timeWindow,
        availableSeats: Number(ride.availableSeats)
      };
      await api.createRide(payload);
      sessionStorage.removeItem("pendingRideOffer");
      sessionStorage.setItem("rideOfferFlash", "offer created successfully");
      props.setView("createRide");
    } catch (err) {
      setError(err.message);
      setPublishing(false);
    }
  }

  if (publishing) {
    return (
      <AppShell {...props}>
        <LoadingWindow text="publishing offer" />
      </AppShell>
    );
  }

  if (!ride) {
    return (
      <AppShell {...props}>
        <LoadingWindow text="Loading ride offer" />
      </AppShell>
    );
  }

  return (
    <AppShell {...props}>
      <section className="intro compact-intro"><h2>Review before publishing</h2></section>
      <section className="panel review-panel">
        <div className="review-route">
          <span>Route</span>
          <strong>{ride.origin} → {ride.destination}</strong>
          <p>{ride.departureDate} • {ride.departureTime}</p>
        </div>
        <div className="review-grid">
          <div><span>Time window</span><strong>{ride.timeWindow}</strong></div>
          <div><span>Available seats</span><strong>{ride.availableSeats}</strong></div>
        </div>
        <span className="badge green ready">READY TO PUBLISH</span>
        <p className="review-note">Once published, matching passengers can view and request to join.</p>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button publish-button" type="button" onClick={publish}>Publish ride</button>
      </section>
    </AppShell>
  );
}
