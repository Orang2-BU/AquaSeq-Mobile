// Beranda: isi berbeda untuk teknisi (tindakan cepat) dan pemilik (ringkasan rinci).
import { PemilikHome } from '@/components/home/PemilikHome';
import { TeknisiHome } from '@/components/home/TeknisiHome';
import { useFarm } from '@/lib/farm';
import { useStore } from '@/lib/store';

export default function Beranda() {
  const farm = useFarm();
  const role = useStore().session?.user.role;
  if (!farm) return null;
  return role === 'pemilik' ? <PemilikHome farm={farm} /> : <TeknisiHome farm={farm} />;
}
