import type {ReactNode} from "react";
import {ClinicPersistentShell} from "./clinic-shell";
import "./clinic-shell.css";
import "./clinic-design.css";
import "./clinic-ux.css";
import "./clinic-dashboard.css";
import "./clinic-scheduling.css";
import "./clinic-reception.css";
import "./clinic-patients.css";
import "./clinic-care.css";
import "./clinic-chart-treatment.css";
import "./clinic-records.css";
import "./clinic-finance.css";
import "./clinic-staff-settings.css";
import "./clinic-cross-workspaces.css";
import "./clinic-quality.css";

// Next App Router preserves the clinic sidebar, header and clinic selector
// while only the active page segment changes.
export default function ClinicLayout({children}:{children:ReactNode}){
 return <ClinicPersistentShell>{children}</ClinicPersistentShell>;
}
