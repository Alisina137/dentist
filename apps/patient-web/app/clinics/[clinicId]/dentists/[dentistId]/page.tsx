import {PatientDentistPage} from "@dandanlink/ui/phase13";
export default async function Page({params}:{params:Promise<{clinicId:string;dentistId:string}>}){
 const {clinicId,dentistId}=await params;return <PatientDentistPage clinicId={clinicId} dentistId={dentistId}/>;
}
