import { useState } from "react";
import { MusicProgramSettings } from "@/features/program/MusicProgramSettings";
import { CalendarDays, Users, Clock3 } from "lucide-react";
import { EventsDashboard } from "@/features/events/EventsDashboard";
import { MusiciansDashboard } from "@/features/staff/MusiciansDashboard";
import { ProductFooter } from "@/components/ProductFooter";
import { useRequests } from "@/store/RequestsProvider";
import { isEnquiryTerminal } from "@/services/enquiryEngine";
export function StaffLayout() {
  const [desk, setDesk] = useState<"program" | "events" | "musicians">(
    "program",
  );
  const { enquiries, musicians } = useRequests();
  const open = enquiries.filter((e) => !isEnquiryTerminal(e.status)).length;
  return (
    <div className="product-page-shell">
      <main
        id="workspace-content"
        tabIndex={-1}
        className="staff-workspace product-page-content"
      >
        <header className="staff-workspace-heading">
          <p className="music-kicker">OPERATIONS</p>
          <h1>Staff desk</h1>
          <p>
            Manage event enquiries and the musicians who bring them to life.
          </p>
        </header>
        <nav className="staff-workspace-tabs" aria-label="Staff tools">
          <button
            aria-pressed={desk === "program"}
            onClick={() => setDesk("program")}
          >
            <Clock3 size={17} />
            Music program
          </button>
          <button
            aria-pressed={desk === "events"}
            onClick={() => setDesk("events")}
          >
            <CalendarDays size={17} />
            Event enquiries<span>{open}</span>
          </button>
          <button
            aria-pressed={desk === "musicians"}
            onClick={() => setDesk("musicians")}
          >
            <Users size={17} />
            Musicians<span>{musicians.length}</span>
          </button>
        </nav>
        <section
          className={`staff-workspace-panel ${desk === "program" ? "staff-program-panel" : "bg-ink-900 text-cream-200"}`}
          aria-label={
            desk === "program"
              ? "Music program"
              : desk === "events"
                ? "Event enquiries"
                : "Musicians"
          }
        >
          {desk === "program" ? (
            <MusicProgramSettings />
          ) : desk === "events" ? (
            <EventsDashboard />
          ) : (
            <MusiciansDashboard />
          )}
        </section>
      </main>
      <ProductFooter />
    </div>
  );
}
