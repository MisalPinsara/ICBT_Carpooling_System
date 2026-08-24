import { Car, UserRound, UsersRound } from "lucide-react";
import { Logo } from "./Logo";

export function BrandPanel({ mode }) {
  const isRegister = mode === "register";
  return (
    <aside className="brand-panel">
      <Logo large />
      <div className="brand-copy">
        <h1>{isRegister ? "Join the ride. Share the journey." : "Share rides. Save fuel. Reach campus together."}</h1>
        <p>{isRegister ? "Create your ICBT Carpool account and connect with students and staff travelling your way." : "A simple carpooling platform for ICBT students and staff."}</p>
      </div>
      {isRegister && (
        <div className="journey-icons" aria-hidden="true">
          <span><UserRound size={30} /></span>
          <i />
          <span><Car size={32} /></span>
          <i />
          <span><UsersRound size={32} /></span>
        </div>
      )}
    </aside>
  );
}
