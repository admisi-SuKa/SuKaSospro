import {redirect} from "next/navigation";
import {getOfficePage} from "@/lib/office";
import OfficeDashboard from "@/components/office/OfficeDashboard";
export default async function Page(){const user=await getOfficePage();if(!user) redirect("/admin/layanan/login");return <OfficeDashboard user={user}/>}
