import { redirect } from "next/navigation";
import { isAdminPageSession } from "@/lib/auth";
import AdminTop from "@/components/AdminTop";
import DoorprizeWheel from "@/components/DoorprizeWheel";

export default async function AdminDoorprizePage() {
  if (!(await isAdminPageSession())) redirect("/admin/login");
  return <main className="admin-shell"><AdminTop /><section className="section"><div className="container"><div className="section-head"><div><span className="eyebrow" style={{color: "#0b6b5b"}}>Doorprize</span><h2>Wheel Peserta</h2><p>Hanya peserta yang tercatat pada presensi kegiatan yang masuk kandidat. Pemenang dipilih backend dan disimpan ke Google Sheets.</p></div></div><DoorprizeWheel /></div></section></main>;
}
