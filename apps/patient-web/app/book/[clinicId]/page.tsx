import {PatientBookPage} from "@dandanlink/ui/phase15";
export default async function Page({params}:{params:Promise<{clinicId:string}>}){
 const {clinicId}=await params;return <PatientBookPage clinicId={clinicId}/>;
}
