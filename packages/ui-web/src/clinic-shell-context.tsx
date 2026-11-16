"use client";
import {createContext,useContext,type ReactNode} from "react";

/**
 * A Next /clinic segment layout owns the authenticated workspace chrome.
 * Legacy clinic portals keep their normal data/permission guards but must
 * not mount another sidebar or header on every child-route navigation.
 */
const PersistentClinicShellContext=createContext(false);
export function PersistentClinicShellProvider({children}:{children:ReactNode}){
 return <PersistentClinicShellContext.Provider value>{children}</PersistentClinicShellContext.Provider>;
}
export function usePersistentClinicShell(){return useContext(PersistentClinicShellContext);}
