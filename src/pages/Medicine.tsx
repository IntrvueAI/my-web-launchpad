import { MedicineLandingClinical } from '@/components/marketing/MedicineLandingClinical';
import { MedicineLandingCoralPreview } from '@/components/marketing/MedicineLandingCoralPreview';
import { MedicineTheme, useMedicineColourScheme } from '@/components/medicine-dashboard/MedicineTheme';

export default function Medicine() {
  const { theme } = useMedicineColourScheme();
  return <MedicineTheme>{theme === 'clinical' ? <MedicineLandingClinical /> : <MedicineLandingCoralPreview />}</MedicineTheme>;
}
