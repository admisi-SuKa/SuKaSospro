import { redirect } from "next/navigation";
import { isAdminPageSession } from "@/lib/auth";
import AdminLoginForm from "@/components/AdminLoginForm";

export default async function AdminLoginPage() {
  if (await isAdminPageSession()) redirect("/admin");
  return <main><section className="section soft"><div className="container"><AdminLoginForm /></div></section></main>;
}
