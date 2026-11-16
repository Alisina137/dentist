// Only the route contents suspend during an internal /clinic navigation.
// The sibling Next.js clinic layout keeps its sidebar and header mounted.
export default function ClinicRouteLoading(){
 return <div className="clinic-page-skeleton" role="status" aria-label="Loading clinic page">
  <span className="clinic-page-skeleton-title"/>
  <div className="clinic-page-skeleton-grid">
   {Array.from({length:4},(_,i)=><span key={i}/>)}
  </div>
  <span className="clinic-page-skeleton-body"/>
 </div>;
}
