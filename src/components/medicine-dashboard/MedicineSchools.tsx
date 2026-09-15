import { useMemo, useState } from 'react';
import { listSchools, type SchoolRoute } from '@/interview/medicine-content';
import { recommendMode } from '@/components/marketing/SchoolMatcher';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { INTERVIEW_TYPES, InterviewType } from '@/config/interviewTypes';

interface Props {
  onStartInterview: (type: InterviewType) => void;
}

function formatField(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return 'not published';
  if (v === true) return 'yes';
  if (v === false) return 'no';
  return String(v);
}

function timedModeFor(school: SchoolRoute): InterviewType | null {
  if (school.university.includes('Leeds')) return INTERVIEW_TYPES['medicine-mmi'];
  if (school.university.includes('Manchester')) return INTERVIEW_TYPES['medicine-mmi-manchester'];
  return null;
}

export function MedicineSchools({ onStartInterview }: Props) {
  const schools = useMemo(() => listSchools(), []);
  const { stats } = useDashboardStats();
  const [query, setQuery] = useState('');

  const inDiarySchool = useMemo(() => {
    const diary = stats?.upcomingSchoolInterviews?.[0];
    if (!diary) return null;
    return schools.find((s) => s.university.toLowerCase().includes(diary.school.toLowerCase()) || diary.school.toLowerCase().includes(s.university.toLowerCase())) ?? null;
  }, [schools, stats]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return schools.filter((s) => s.university.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)).slice(0, 8);
  }, [schools, query]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque',serif", fontWeight: 700, fontSize: 30, margin: 0 }}>Schools</h1>
        <p style={{ color: '#6B7280', fontSize: 15, marginTop: 6 }}>{schools.length} UK medical schools · published formats. Every school runs it differently — practise the one you're sitting.</p>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="e.g. Leeds, Manchester, Imperial, Queen's Belfast…"
        style={{
          width: '100%', boxSizing: 'border-box', background: '#fff', border: '1px solid rgba(28,32,41,.15)',
          borderRadius: 12, padding: '14px 18px', fontSize: 16, fontFamily: 'inherit', color: '#1C2029', outline: 'none',
        }}
      />

      {inDiarySchool && (
        <SchoolCard school={inDiarySchool} inDiary onStartInterview={onStartInterview} />
      )}

      {query.trim() ? (
        results.length === 0 ? (
          <p style={{ color: '#9A9488', fontSize: 15 }}>No match yet — try just the university name.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {results.filter((s) => s.id !== inDiarySchool?.id).map((s) => (
              <SchoolCard key={s.id} school={s} onStartInterview={onStartInterview} />
            ))}
          </div>
        )
      ) : (
        <p style={{ color: '#9A9488', fontSize: 14 }}>Search above to browse all {schools.length} schools, or start with the {inDiarySchool ? "one in your diary above" : 'featured formats below'}.</p>
      )}

      {!query.trim() && !inDiarySchool && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {schools.filter((s) => s.university.includes('Leeds') || s.university.includes('Manchester')).map((s) => (
            <SchoolCard key={s.id} school={s} onStartInterview={onStartInterview} />
          ))}
        </div>
      )}
    </div>
  );
}

function SchoolCard({ school, inDiary, onStartInterview }: { school: SchoolRoute; inDiary?: boolean; onStartInterview: (type: InterviewType) => void }) {
  const rec = recommendMode(school);
  const timedMode = timedModeFor(school);

  return (
    <div style={{
      background: '#fff', border: inDiary ? '1px solid rgba(232,98,47,.28)' : '1px solid rgba(28,32,41,.09)',
      borderRadius: 18, padding: '22px 24px', boxShadow: '0 2px 10px -4px rgba(28,32,41,.08)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque',serif", fontWeight: 700, fontSize: 18 }}>{school.university}</span>
            {inDiary && <span style={{ background: '#FFE4D6', color: '#E8622F', fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999 }}>In your diary</span>}
          </div>
          <div style={{ color: '#9A9488', fontSize: 13, marginTop: 2 }}>{school.code} · {school.route}</div>
        </div>
        <a href={school.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#E8622F', fontWeight: 600, whiteSpace: 'nowrap' }}>source ↗</a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginTop: 16, fontSize: 13.5 }}>
        <Stat label="Stations" value={formatField(school.stations)} />
        <Stat label="Station length" value={school.station_length_min ? `${school.station_length_min} min` : 'not published'} />
        <Stat label="Reading time" value={school.prep_time_min === null ? 'not published' : school.prep_time_min === 0 ? 'none' : `${school.prep_time_min} min`} />
        <Stat label="Roleplay" value={formatField(school.roleplay)} />
      </div>

      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(28,32,41,.09)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 12px', borderRadius: 999, background: '#FFE4D6', color: '#E8622F', fontSize: 12.5, fontWeight: 700 }}>
            Closest practice mode: {rec.label}
          </span>
          <p style={{ color: '#9A9488', fontSize: 13, marginTop: 8, maxWidth: 480 }}>{rec.note}</p>
        </div>
        <button
          onClick={() => onStartInterview(timedMode ?? (rec.label === 'Manchester-style' ? INTERVIEW_TYPES['medicine-mmi-manchester'] : INTERVIEW_TYPES['medicine-mmi']))}
          style={{
            background: 'linear-gradient(135deg,#FF7F50 0%,#FF9F6B 100%)', color: '#fff', border: 0, borderRadius: 12,
            padding: '12px 18px', fontWeight: 600, fontSize: 14, cursor: 'pointer', minHeight: 44, whiteSpace: 'nowrap',
          }}
        >
          {timedMode ? `Practise the exact ${school.university.replace('University of ', '')} format` : 'Practise closest format'}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ color: '#9A9488' }}>{label}: </span>
      <span style={{ color: '#1C2029' }}>{value}</span>
    </div>
  );
}
