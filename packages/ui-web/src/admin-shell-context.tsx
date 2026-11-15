"use client";
import {createContext,useContext,type ReactNode} from "react";
/** True only beneath the persistent Next.js admin segment shell. */
const PersistentAdminShellContext=createContext(false);
export function PersistentAdminShellProvider({children}:{children:ReactNode}){
 return <PersistentAdminShellContext.Provider value={true}>{children}</PersistentAdminShellContext.Provider>;
}
export function usePersistentAdminShell(){return useContext(PersistentAdminShellContext);}
