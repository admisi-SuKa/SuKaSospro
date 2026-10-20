import {redirect} from 'next/navigation';
import {getOfficePage} from '@/lib/office';
import LandingManager from '@/components/landing/LandingManager';
export const dynamic='force-dynamic';
export default async function LandingAdminPage(){const user=await getOfficePage();if(!user)redirect('/admin/layanan/login');if(user.role!=='admin')redirect('/admin/layanan');return <LandingManager user={user}/>}
