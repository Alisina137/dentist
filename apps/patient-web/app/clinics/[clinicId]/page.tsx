import {PatientClinicPage} from "@dandanlink/ui/phase13";
export default async function Page({params}:{params:Promise<{clinicId:string}>}){
 const {clinicId}=await params;return <PatientClinicPage clinicId={clinicId}/>;
}
