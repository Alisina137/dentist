import {PatientAppointmentDetailPage} from "@dandanlink/ui/phase15";
export default async function Page({params}:{params:Promise<{bookingId:string}>}){
 const {bookingId}=await params;return <PatientAppointmentDetailPage bookingId={bookingId}/>;
}
