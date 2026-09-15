import type { RoleplayRuntime } from '@/interview/engine/types';

/** Private authoring guidance, rendered only in the admin draft-review desk. */
export function ActorBrief({ actor }: { actor: RoleplayRuntime }) {
  return <details className="lab-actor-brief">
    <summary>Actor instructions · {actor.name}</summary>
    <p><b>Character: </b>{actor.role}</p><p><b>Candidate’s role: </b>{actor.applicantRole}</p>
    <p><b>Opening line: </b>{actor.openingStatement}</p>
    <p><b>Starting state: </b>{actor.actorStateInitial}</p><p><b>How the actor changes: </b>{actor.actorStateTrajectory}</p>
    <h4>Conditional disclosures</h4><ul>{actor.hiddenFacts.map(item=><li key={item.fact}><b>{item.fact}</b><p>Disclose only when: {item.disclosureCondition}</p></li>)}</ul>
    {[
      ['Escalates when',actor.escalationTriggers],['Settles when',actor.deEscalationTriggers],
      ['Resistance to try',actor.resistancePatterns],['What to look for',actor.desiredOutcomes],['Red flags',actor.redFlags],
    ].map(([title,items])=><div key={title as string}><h4>{title}</h4><ul>{(items as string[]).map(item=><li key={item}>{item}</li>)}</ul></div>)}
    <p><b>Interruption: </b>{actor.interruptionRule}</p><p><b>Misunderstanding: </b>{actor.plantedMisunderstanding}</p>
    <p><b>Response to strong practice: </b>{actor.actorResponseToStrong}</p><p><b>Response to weak practice: </b>{actor.actorResponseToWeak}</p>
    <h4>Possible endings</h4>{actor.endings.map(ending=><p key={ending.id}><b>{ending.id}: </b>{ending.condition} {ending.description}</p>)}
    <p>These are draft actor instructions. Actual model responses require separate testing.</p>
  </details>;
}
