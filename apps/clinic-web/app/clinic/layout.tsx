import type {ReactNode} from "react";
import {ClinicPersistentShell} from "./clinic-shell";
import "./clinic-shell.css";
import "./clinic-design.css";
import "./clinic-ux.css";
import "./clinic-dashboard.css";
import "./clinic-scheduling.css";

// Next App Router preserves the clinic sidebar, header and clinic selector
// while only the active page segment changes.
export default function ClinicLayout({children}:{children:ReactNode}){
 return <ClinicPersistentShell>{children}</ClinicPersistentShell>;
}
