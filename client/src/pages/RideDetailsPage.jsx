import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Car } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { Info } from "../components/Info";
import { LoadingWindow } from "../components/LoadingWindow";
import { api } from "../services/api";

export function RideDetailsPage(props) {
  const [offer, setOffer] = useState(null);
  const [error, setError] = useState("");
  const { rideId: routeRideId } = useParams();
  const rideId = routeRideId || props.selectedRideId || sessionStorage.getItem("selectedRideOfferId");

  useEffect(() => {
    if (!rideId) {
      setError("Select a ride offer to manage.");
      return;
    }

    api.rideOffer(rideId)
      .then((data) => setOffer(data.offer))
      .catch((err) => setError(err.message));
  }, [rideId]);

  if (!offer && !error) {
    return (
      <AppShell {...props}>
        <LoadingWindow text="Loading ride details" />
      </AppShell>
    );
  }

  const isActive = offer?.status === "Active";
  const passengers = offer?.passengers || [];

  return (
    <AppShell {...props}>
      <section className="intro compact-intro">
        <h2>Ride details</h2>
        <p>View and manage this ride offer.</p>
      </section>
      {error && !offer ? (
        <section className="panel empty-offers">
          <h3>Ride offer unavailable</h3>
          <p>{error}</p>
          <button className="secondary-button compact" type="button" onClick={() => props.setView(props.detailBackView || "createRide")}>Go back</button>
        </section>
      ) : (
        <section className="panel ride-detail-panel">
          <div className="ride-detail-heading">
            <div>
              <h3><Car size={20} fill="#ef4444" color="#ef4444" /> {offer.origin} → {offer.destination}</h3>
              <p>{offer.departureDate} • {offer.departureTime} • {offer.timeWindow}</p>
            </div>
            <div className="ride-heading-actions">
              <span className={`badge ${isActive ? "green" : "neutral"}`}>{offer.status}</span>
            </div>
          </div>
          <hr />
          <div className="ride-detail-body">
            <section className="passenger-panel">
              <h4>Passengers</h4>
              {passengers.length ? (
                <div className="passenger-list">
                  {passengers.map((passenger) => (
                    <article className="passenger-row" key={passenger.id}>
                      <div>
                        <strong>{passenger.name}</strong>
                        <p>{passenger.email || passenger.phoneNumber || "Accepted passenger"}</p>
                      </div>
                      <span>{passenger.status}</span>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-passengers">No passengers</div>
              )}
            </section>
            <aside className="ride-management-panel">
              {error && <p className="form-error">{error}</p>}
              <div className="ride-detail-grid">
                <Info label="Origin" value={offer.origin} />
                <Info label="Destination" value={offer.destination} />
                <Info label="Departure date" value={offer.departureDate} />
                <Info label="Departure time" value={offer.departureTime} />
                <Info label="Time window" value={offer.timeWindow} />
                <Info label="Available seats" value={`${offer.availableSeats} seats`} />
                <Info label="Accepted passengers" value={`${offer.acceptedPassengers} accepted`} />
                <Info label="Status" value={offer.status} />
              </div>
            </aside>
          </div>
        </section>
      )}
    </AppShell>
  );
}