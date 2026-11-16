"use client";
import React,{type ReactNode} from "react";
import {CareIcon,type CareIconName} from "./care-icons";

/**
 * Shared visual primitives for *existing, server-backed* clinic workflows.
 * Tokens are defined only under the clinic persistent-shell CSS scope.
 * These components intentionally have no fetching, storage, or permissions.
 */
export function ClinicSectionHeading({icon,eyebrow,title,actionLabel,actionHref,children}:{
 icon:CareIconName;eyebrow:string;title:string;
 actionLabel?:string;actionHref?:string;children?:ReactNode
}){
 return <div className="h-card-heading clinic-section-heading">
  <div><span className="h-kicker"><CareIcon name={icon} size={16}/>{eyebrow}</span>
   <h2>{title}</h2></div>
  {actionHref&&actionLabel&&<a className="h-more clinic-section-action" href={actionHref}>
   {actionLabel}<CareIcon name="arrow" size={16}/></a>}
  {children}
 </div>;
}
export function ClinicMetricValue({value,unit}:{value:number|string;unit?:string}){
 return <strong className="clinic-metric-value" dir="auto">{value}
  {unit&&<small className="clinic-metric-unit"> {unit}</small>}
 </strong>;
}
export function ClinicEmptyState({message,icon="calendar",actionLabel,actionHref}:{
 message:string;icon?:CareIconName;actionLabel?:string;actionHref?:string
}){
 return <div className="h-empty clinic-empty-state" role="status">
  <span className="clinic-empty-icon" aria-hidden="true"><CareIcon name={icon} size={23}/></span>
  <span>{message}</span>
  {actionHref&&actionLabel&&<a href={actionHref} className="btn btn-secondary">
   {actionLabel}<CareIcon name="arrow" size={15}/></a>}
 </div>;
}
