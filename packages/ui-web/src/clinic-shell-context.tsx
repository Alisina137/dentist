"use client";
import {createContext,useContext,type ReactNode} from "react";

/**
 * The persistent /clinic layout owns one tenant/access context and passes it
 * to legacy PH03 portals without mounting a new sidebar or refetching the
 * identical team/context endpoint on every route change.
 *
 * Domain APIs still perform their own tenant-scoped server authorization.
 */
export type ClinicShellSpace={clinicId:string;clinicName:string;clinicStatus:string;
 membershipId:string;role:"owner"|"manager"|"dentist"|"receptionist"|"assistant"|"cashier";
 clinicianEnabled:boolean;capabilities:string[]};
export type ClinicShellAccess={name:string;email:string;mfaEnabled:boolean;
 clinics:ClinicShellSpace[]};
export type ClinicShellState={
 ctx:ClinicShellAccess|null;space:ClinicShellSpace|null;
 requested:string|null|undefined;error:string;reload:()=>void
};
const PersistentClinicShellContext=createContext<ClinicShellState|null>(null);
export function PersistentClinicShellProvider({children,value}:{
 children:ReactNode;value:ClinicShellState
}){
 return <PersistentClinicShellContext.Provider value={value}>
  {children}
 </PersistentClinicShellContext.Provider>;
}
export function usePersistentClinicShell(){return useContext(PersistentClinicShellContext);}
