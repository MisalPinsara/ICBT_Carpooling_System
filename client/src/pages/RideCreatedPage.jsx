import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { LoadingWindow } from "../components/LoadingWindow";
import { api } from "../services/api";

export function RideCreatedPage(props) {
  const [ride, setRide] = useState(null);

  useEffect(() => {
    api.dashboard().then((data) => setRide(data.currentRide));
  }, []);

  if (!ride) {
    return (
      <AppShell {...props}>
        <LoadingWindow text="Loading ride details" />
      </AppShell>
    );
  }

  return (
    <AppShell {...props}>
      <h1 className="page-title">Ride Created</h1>
      <section className="panel success-panel">
        <Check className="success-check" size={64} />
        <h2>Ride published successfully</h2>
        <strong>{ride.origin} → {ride.destination}</strong>
        <p>{ride.departureDate} • {ride.departureTime} • {ride.availableSeats} seats</p>
        <button className="primary-button" type="button" onClick={() => props.setView("createRide")}>View my ride offers</button>
      </section>
    </AppShell>
  );
}
