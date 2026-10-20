import {redirect} from "next/navigation";
import {getOfficePage} from "@/lib/office";
import MaterialManager from "@/components/office/MaterialManager";
export default async function Page(){const user=await getOfficePage();if(!user)redirect("/admin/layanan/login");if(user.role!=="admin")redirect("/admin/layanan");return <MaterialManager user={user}/>}
