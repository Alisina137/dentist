"use client";
import {createContext,useContext,type ReactNode} from "react";

export type ClinicWorkspaceRole="owner"|"manager"|"dentist"|"receptionist"|"assistant"|"cashier";
export type ClinicWorkspaceSpace={clinicId:string;clinicName:string;clinicStatus:string;
 membershipId:string;role:ClinicWorkspaceRole;clinicianEnabled:boolean;capabilities:string[]};
export type ClinicWorkspaceAccount={name:string;email:string;mfaEnabled:boolean;clinics:ClinicWorkspaceSpace[]};
export type ClinicWorkspaceSession={ctx:ClinicWorkspaceAccount;space:ClinicWorkspaceSpace|null;requested:string|null};
const ClinicShellContext=createContext<ClinicWorkspaceSession|null>(null);
const PersistentClinicShellContext=createContext(false);
export function PersistentClinicShellProvider({session,children}:{
 session:ClinicWorkspaceSession;children:ReactNode}){
 return <PersistentClinicShellContext.Provider value>
  <ClinicShellContext.Provider value={session}>{children}</ClinicShellContext.Provider>
 </PersistentClinicShellContext.Provider>;
}
export function usePersistentClinicShell(){return useContext(PersistentClinicShellContext);}
export function useClinicWorkspaceSession(){return useContext(ClinicShellContext);}
