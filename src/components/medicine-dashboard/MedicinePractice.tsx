import { useState } from 'react';
import { INTERVIEW_TYPES, InterviewType } from '@/config/interviewTypes';
import { listOntologyDomains } from '@/interview/medicine-content';

interface Props {
  onStartInterview: (type: InterviewType) => void;
}

const CIRCUITS = [INTERVIEW_TYPES['medicine-mmi'], INTERVIEW_TYPES['medicine-mmi-manchester']];

export function MedicinePractice({ onStartInterview }: Props) {
  const [showBank, setShowBank] = useState(false);
  const domains = listOntologyDomains();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque',serif", fontWeight: 700, fontSize: 30, margin: 0 }}>Practice</h1>
        <p style={{ color: '#6B7280', fontSize: 15, marginTop: 6 }}>Pick a real, published MMI format and run the full circuit with Clara.</p>
      </div>

      <div className="med-grid-two">
        {CIRCUITS.map((type) => (
          <div key={type.id} style={cardStyle}>
            <h3 style={{ fontFamily: "'Bricolage Grotesque',serif", fontWeight: 700, fontSize: 20, margin: 0 }}>{type.name.replace('Medicine MMI — ', '')}</h3>
            <p style={{ color: '#6B7280', fontSize: 14.5, lineHeight: 1.6, marginTop: 10 }}>{type.description}</p>
            <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: 13, color: '#9A9488' }}>
              <span>{type.timingSeconds?.prep ? `${type.timingSeconds.prep / 60} min prep` : 'No prep'}</span>
              <span>·</span>
              <span>{type.timingSeconds ? `${type.timingSeconds.response / 60} min per station` : ''}</span>
            </div>
            <button onClick={() => onStartInterview(type)} style={{ ...primaryBtn, width: '100%', marginTop: 18 }}>
              Start · {type.costCredits ?? 0} credits
            </button>
          </div>
        ))}
      </div>

      <div style={cardStyle}>
        <button
          onClick={() => setShowBank((v) => !v)}
          style={{ display: 'flex', justifyContent: 'space-between', width: '100%', background: 'none', border: 0, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
        >
          <h3 style={{ fontFamily: "'Bricolage Grotesque',serif", fontWeight: 700, fontSize: 17, margin: 0 }}>Question bank — what you'll be asked</h3>
          <span style={{ color: '#E8622F', fontWeight: 600, fontSize: 13.5 }}>{showBank ? 'Hide' : 'Browse'} →</span>
        </button>
        {showBank && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 18 }}>
            {domains.map((d) => (
              <div key={d.id} style={{ background: '#FAFAF8', borderRadius: 12, padding: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>{d.label}</div>
                <div style={{ color: '#9A9488', fontSize: 13, marginTop: 4 }}>
                  {d.subdomains.reduce((n, s) => n + s.topics.length, 0)} question{d.subdomains.reduce((n, s) => n + s.topics.length, 0) === 1 ? '' : 's'} across {d.subdomains.length} area{d.subdomains.length === 1 ? '' : 's'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid rgba(28,32,41,.09)', borderRadius: 20, padding: '26px 28px',
  boxShadow: '0 2px 10px -4px rgba(28,32,41,.08)',
};
const primaryBtn: React.CSSProperties = {
  background: 'linear-gradient(135deg,#FF7F50 0%,#FF9F6B 100%)', color: '#fff', border: 0, borderRadius: 12,
  padding: '14px 22px', fontWeight: 600, fontSize: 15, cursor: 'pointer', minHeight: 48,
  boxShadow: '0 10px 26px -10px rgba(232,98,47,.55)',
};
