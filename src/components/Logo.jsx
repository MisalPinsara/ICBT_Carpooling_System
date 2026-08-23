import { Car } from "lucide-react";

export function Logo({ large }) {
  return (
    <div className={`logo ${large ? "large" : ""}`}>
      <Car size={large ? 42 : 30} fill="#ef4444" color="#ef4444" />
      <span>ICBT Carpool</span>
    </div>
  );
}
