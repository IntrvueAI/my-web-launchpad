import { useAuth } from "@/contexts/AuthContext";
import { MedicineTheme } from "@/components/medicine-dashboard/MedicineTheme";
import MedicineStudio from "@/components/medicine-studio/MedicineStudio";

export default function MedicinePracticeStudio() {
  const { user } = useAuth();
  const scope = user?.id ?? "guest";
  const params = new URLSearchParams(window.location.search);
  return (
    <MedicineTheme>
      <nav className="studio-page-nav" aria-label="Practice navigation">
        <a href="/medicine">
          intrvue.ai <span> / Medicine</span>
        </a>
        <a href={user ? "/" : "/auth?mode=medicine"}>
          {user ? "My dashboard" : "Explore live interviews"} →
        </a>
      </nav>
      <MedicineStudio
        key={scope}
        scope={scope}
        initialQuestionId={params.get("question") ?? ""}
        initialTopic={params.get("skill") ?? ""}
      />
    </MedicineTheme>
  );
}
