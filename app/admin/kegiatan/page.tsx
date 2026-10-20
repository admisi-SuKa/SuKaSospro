import { redirect } from "next/navigation";
import { isAdminPageSession } from "@/lib/auth";
import AdminTop from "@/components/AdminTop";
import AdminEventsManager from "@/components/AdminEventsManager";

export default async function AdminKegiatanPage() {
  if (!(await isAdminPageSession())) redirect("/admin/login");
  return <main className="admin-shell"><AdminTop /><section className="section"><div className="container"><AdminEventsManager /></div></section></main>;
}
