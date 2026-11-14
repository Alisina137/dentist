import {PublicListingPortal} from "@dandanlink/ui/phase12";
export default async function Page({params}:{params:Promise<{clinicId:string}>}){
 const {clinicId}=await params;return <PublicListingPortal clinicId={clinicId}/>;
}
