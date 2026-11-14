import {PatientBookPage} from "@dandanlink/ui/phase15";
export default async function Page({params}:{params:Promise<{dentistId:string}>}){
 const {dentistId}=await params;return <PatientBookPage dentistId={dentistId}/>;
}
