import { useAdminStatus } from '@/hooks/useAdminStatus';
import ExpansionLab from '@/components/admin/medicine/ExpansionLab';

export default function AdminMedicineLab({ localPreview = false }: { localPreview?: boolean }) {
  const { isAdmin, isLoading } = useAdminStatus();
  if (!(import.meta.env.DEV && localPreview)) {
    if (isLoading) return <div className="p-12 text-center">Checking admin access…</div>;
    if (!isAdmin) return <div className="p-12 text-center">Admin access required. <a className="underline" href="/auth">Sign in</a></div>;
  }
  return <ExpansionLab standalone />;
}
