import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, Check, Clock3, Play, RotateCcw, SkipForward } from 'lucide-react';
import rawDrafts from '@/data/interview-staging/medicine-expansion.json';
import { assembleCircuit, CIRCUIT_PROFILES, type CircuitPlan } from '@/interview/medicine-content/expansion/circuit';
import type { MedicineDraft } from './ExpansionLab';

const bank = rawDrafts as MedicineDraft[];
const HISTORY_KEY='intrvue:medicine-rehearsal-history:v1';
function history(): string[] { try { const value=JSON.parse(localStorage.getItem(HISTORY_KEY)??'[]');return Array.isArray(value)?value.filter((x)=>typeof x==='string'):[]; } catch { return []; } }
function save(name: string, value: unknown) { const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})); const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
export default function CircuitWorkbench() {
  const [profileId,setProfileId]=useState('oxford'); const [difficulty,setDifficulty]=useState(3);
  const [seen,setSeen]=useState<string[]>(history); const [excludeSeen,setExcludeSeen]=useState(true);
  const [plan,setPlan]=useState<CircuitPlan|null>(null);const [message,setMessage]=useState('');
  const [active,setActive]=useState(-1);const [phase,setPhase]=useState<'reading'|'response'|'between'|'complete'>('response');
  const [seconds,setSeconds]=useState(0);const [running,setRunning]=useState(false);const deadline=useRef(0);
  const [reflections,setReflections]=useState<Record<string,{text:string;band:string}>>({});
  const profile=CIRCUIT_PROFILES.find((p)=>p.id===profileId)!;
  const row=plan?.stations[active];const station=bank.find((q)=>q.id===row?.stationId);
  const [showGuide,setShowGuide]=useState(false);
  function markSeen(id:string) { setSeen((prev)=>{ const next=[...new Set([...prev,id])];try{localStorage.setItem(HISTORY_KEY,JSON.stringify(next));}catch{setMessage('History could not be saved in this browser.');}return next; }); }
  function timer(value:number) {setSeconds(value);deadline.current=Date.now()+value*1000;setRunning(value>0);}
  function begin(index:number) {
    if(!plan)return; setActive(index);setShowGuide(false);const next=plan.stations[index];
    if(!next){setPhase('complete');setRunning(false);setSeconds(0);return;}
    markSeen(next.stationId);setPhase(next.prepSeconds?'reading':'response');timer(next.prepSeconds||next.responseSeconds);
  }
  function advance() {
    if(!row)return;
    if(phase==='reading'){setPhase('response');timer(row.responseSeconds);}
    else if(phase==='response' && row.transitionSeconds){setPhase('between');timer(row.transitionSeconds);}
    else begin(active+1);
  }
  const advanceRef=useRef(advance);advanceRef.current=advance;
  useEffect(()=>{if(!running)return;const id=setInterval(()=>{const left=Math.max(0,Math.ceil((deadline.current-Date.now())/1000));setSeconds(left);if(!left){setRunning(false);advanceRef.current();}},250);return()=>clearInterval(id);},[running,active,phase]);
  function build() {
    const seed=crypto.getRandomValues(new Uint32Array(1))[0];
    const result=assembleCircuit(bank,profile,{seed,maxDifficulty:difficulty,seenIds:excludeSeen?seen:[]});
    setRunning(false);setActive(-1);setReflections({});setShowGuide(false);
    if(result.ok === true){setPlan(result.plan);setMessage('');setPhase('response');}
    else{setPlan(null);setMessage(`More eligible drafts are needed for: ${result.shortages.join(', ')}. You can include previously seen drafts explicitly, change difficulty, or choose another plan.`);}
  }
  return <section className="lab-section lab-circuit" id="circuit-builder"><div className="lab-section-title"><div><h2>Build a practice circuit</h2><p>Assemble from the shared draft bank. The local rehearsal handles reading and answer timers; it does not start a paid Clara call.</p></div><span>DRAFTS ONLY</span></div>
    <div className="lab-circuit-controls"><label>Practice profile<select value={profileId} onChange={(e)=>{setProfileId(e.target.value);setPlan(null);setActive(-1);setRunning(false);}}>{CIRCUIT_PROFILES.map((p)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Difficulty<select value={difficulty} onChange={(e)=>setDifficulty(Number(e.target.value))}><option value={3}>Standard + stretch</option><option value={2}>Standard only</option></select></label><label className="lab-checkbox"><input type="checkbox" checked={excludeSeen} onChange={(e)=>setExcludeSeen(e.target.checked)}/>Exclude drafts already opened here</label><button className="lab-primary" onClick={build}><RotateCcw size={16}/>Build circuit</button></div>
    <div className="lab-circuit-basis"><Clock3 size={17}/><p>{profile.timingBasis}</p></div>
    <div className="lab-history-row"><span>{seen.length} station{seen.length===1?'':'s'} seen in this browser. Each plan contains distinct stations.</span><button onClick={()=>{if(!window.confirm('Clear the practice history saved in this browser? Previously opened stations will become eligible again.'))return;setSeen([]);try{localStorage.removeItem(HISTORY_KEY);}catch{setMessage('Could not clear stored history.');}}}>Reset practice history</button></div>
    {message&&<p className="lab-circuit-message" role="status">{message}</p>}
    {plan&&<div className="lab-circuit-plan"><div className="lab-circuit-plan-head"><div><h3>{profile.name}</h3><p>{plan.stations.length} exercises · {plan.totalSeconds/60} minutes including reading and transitions · original practice</p></div><button onClick={()=>save(`${plan.id}.json`,plan)}><ArrowDownToLine size={16}/>Export plan</button></div><ol>{plan.stations.map((s,i)=><li key={s.stationId} className={active===i?'active':''}><span>{String(i+1).padStart(2,'0')}</span><div><b>{s.slot}</b><small>{active===-1?'Prompt hidden until rehearsal':s.title}</small></div><small>{s.prepSeconds/60}m read · {s.responseSeconds/60}m answer</small>{active>i&&<Check size={15}/>}</li>)}</ol>{active===-1&&<button className="lab-primary" onClick={()=>begin(0)}><Play size={16}/>Start manual rehearsal</button>}
      {station&&phase!=='complete'&&<div className="lab-circuit-session"><div className="lab-circuit-session-head"><span>EXERCISE {active+1} / {plan.stations.length} · {phase.toUpperCase()}</span><strong>{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</strong></div><h3>{station.title}</h3><p>{station.question}</p><div className="lab-circuit-session-actions"><button onClick={()=>{if(!running)deadline.current=Date.now()+seconds*1000;setRunning(!running);}}>{running?'Pause':'Resume'}</button><button onClick={advance}><SkipForward size={16}/>{phase==='reading'?'Ready — start answering':'Finish this exercise'}</button></div><label>Reflection after your answer<textarea rows={3} value={reflections[station.id]?.text??''} onChange={(e)=>setReflections((prev)=>({...prev,[station.id]:{band:'not-assessed',...prev[station.id],text:e.target.value}}))} placeholder="What did you notice? What would you change?"/></label><label>Self-assessment<select value={reflections[station.id]?.band??'not-assessed'} onChange={(e)=>setReflections((prev)=>({...prev,[station.id]:{text:'',...prev[station.id],band:e.target.value}}))}><option value="not-assessed">Not assessed</option><option value="strong">Strong</option><option value="developing">Developing</option><option value="needs-work">Needs work</option></select></label><button className="lab-session-guide" onClick={()=>setShowGuide(!showGuide)}>{showGuide?'Hide':'Show'} authored reflection guide</button>{showGuide&&<div className="lab-circuit-guide"><p>{station.answer}</p><p><b>Strong reasoning:</b> {station.rubric.strong}</p></div>}</div>}
      {phase==='complete'&&<div className="lab-circuit-complete"><Check size={24}/><div><h3>Rehearsal complete</h3><p>Your observations are self-assessment, not an AI or admissions score. Export them before creating another circuit.</p></div><button className="lab-primary" onClick={()=>save(`${plan.id}-reflection.json`,{plan,selfAssessment:reflections,completedAt:new Date().toISOString()})}><ArrowDownToLine size={16}/>Export reflection</button></div>}
    </div>}
  </section>;
}
