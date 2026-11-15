import type {ReactNode} from "react";
import {AdminPersistentShell} from "./admin-shell";

// Next.js preserves this layout across /admin child-route transitions.
export default function AdminLayout({children}:{children:ReactNode}){
 return <AdminPersistentShell>{children}</AdminPersistentShell>;
}
