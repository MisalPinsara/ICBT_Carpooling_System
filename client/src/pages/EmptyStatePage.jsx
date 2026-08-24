import { AppShell } from "../components/AppShell";

const pageContent = {
  rides: {
    title: "Offer a ride",
    description: "Manage your active ride offers.",
    message: "No offers",
    offerHeader: true
  },
  requests: {
    title: "Requests",
    message: "No requests"
  },
  find: {
    title: "Find a Ride",
    message: "No rides available"
  },
  messages: {
    title: "Messages",
    message: "No messages"
  },
  journeys: {
    title: "Journeys",
    message: "No journeys"
  },
  passengers: {
    title: "Passengers",
    message: "No passengers"
  }
};

export function EmptyStatePage(props) {
  const content = pageContent[props.view] || { title: "Page", message: "No data" };

  return (
    <AppShell {...props}>
      {content.offerHeader ? (
        <section className="offers-title-row">
          <div className="intro compact-intro">
            <h2>{content.title}</h2>
            <p>{content.description}</p>
          </div>
          <button className="primary-button offer-open-button" type="button" onClick={() => props.setView("createRide")}>+ Create / Offer Ride</button>
        </section>
      ) : (
        <section className="intro compact-intro">
          <h2>{content.title}</h2>
        </section>
      )}
      <section className="panel empty-page-panel">
        <p>{content.message}</p>
      </section>
    </AppShell>
  );
}