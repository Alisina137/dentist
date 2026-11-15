export default function Loading(){return <div className="admin-page-loading" role="status" aria-label="Loading administration page">
 <div className="admin-loading-line admin-loading-heading"/>
 <div className="admin-loading-grid">{[0,1,2,3].map(i=><div className="admin-loading-card" key={i}/>)}</div>
 <div className="admin-loading-card admin-loading-wide"/>
 </div>;}
