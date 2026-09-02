/**
 * Typed accessors over the Medicine vertical research pack (data/*.json — copied verbatim from
 * the source research so content stays byte-for-byte faithful to what was verified). This module
 * is for BROWSING (the admin Medicine Portal) and for authoring new bank content against a stable
 * reference — the live interview engine does NOT import this; each roleplay's runtime fields are
 * inlined directly into its bank JSON entry (see bank/questions/medicine/roleplay-stations/) so the
 * Deno-vendored engine (scripts/build-interview-brain.mjs) never needs to depend on this file.
 */
import ontologyRaw from './data/ontology.json';
import taxonomiesRaw from './data/taxonomies.json';
import roleplaysRaw from './data/roleplays.json';
import currentAffairsRaw from './data/current-affairs-register.json';
import schoolMapRaw from './data/uk-medical-school-interview-map.json';
import scoringRubricsRaw from './data/scoring-rubrics.json';

export interface OntologyTopic {
  id: string;
  label: string;
  must_understand: string;
  assessment: string;
  formats: string[];
  weak: string[];
  danger: string[];
  temporality: 'EVERGREEN' | 'SLOW' | 'FAST';
  knowledge: 'NONE' | 'LAY' | 'CONTEXT' | 'CLINICAL';
  premed: boolean | 'conditional';
}
export interface OntologySubdomain { id: string; label: string; topics: OntologyTopic[] }
export interface OntologyDomain { id: string; label: string; note?: string; subdomains: OntologySubdomain[] }

const ontology = ontologyRaw as { domains: OntologyDomain[] };

export function listOntologyDomains(): OntologyDomain[] {
  return ontology.domains;
}

export function listOntologyTopics(): OntologyTopic[] {
  return ontology.domains.flatMap((d) => d.subdomains.flatMap((s) => s.topics));
}

export function getOntologyTopic(id: string): OntologyTopic | undefined {
  return listOntologyTopics().find((t) => t.id === id);
}

export interface RoleplayHiddenFact { fact: string; disclosure_condition: string }
export interface RoleplayEnding { id: string; condition: string; description: string }
export interface RoleplayPersona {
  id: string;
  title: string;
  taxonomy: string[];
  topics: string[];
  context: string;
  actor: { code: string; name: string; role: string; age: string };
  applicant_role: string;
  difficulty: Record<string, number>;
  band: '1_foundation' | '2_standard' | '3_stretch' | '4_adversarial';
  prep_time_min: number;
  station_time_min: number;
  opening_statement: string;
  actor_state: { initial: string; trajectory: string };
  hidden_facts: RoleplayHiddenFact[];
  escalation_triggers: string[];
  de_escalation_triggers: string[];
  resistance_patterns: string[];
  interruption_rule: string;
  planted_misunderstanding: string;
  desired_outcomes: string[];
  endings: RoleplayEnding[];
  red_flags: string[];
  scoring: Record<string, number>;
  actor_response_to_strong: string;
  actor_response_to_weak: string;
  clinical_boundary: string;
  university_fit: string[];
  transcript_cues: { strong: string[]; weak: string[] };
}

const roleplays = roleplaysRaw as { roleplays: RoleplayPersona[] };

export function listRoleplays(): RoleplayPersona[] {
  return roleplays.roleplays;
}

export function getRoleplay(id: string): RoleplayPersona | undefined {
  return roleplays.roleplays.find((r) => r.id === id);
}

export interface CurrentAffairsTopic {
  id: string;
  title: string;
  tier: 1 | 2 | 3;
  ontology_topics: string[];
  baseline_knowledge: string[];
  not_required: string;
  stakeholders: string[];
  central_tensions: string[];
  ethical_principles: string[];
  likely_questions: string[];
  weak_answer_patterns: string[];
  balanced_answer_components: string[];
  source_types: string[];
  update_frequency: string;
  expiry_trigger: string | null;
  expiry_date: string | null;
  last_verified: string;
  current_state: string;
}

const currentAffairs = currentAffairsRaw as { topics: CurrentAffairsTopic[] };

export function listCurrentAffairsTopics(): CurrentAffairsTopic[] {
  return currentAffairs.topics;
}

/** A Tier 3 topic past its hard expiry is WITHHELD, not merely flagged — see docs/05. */
export function isCurrentAffairsWithheld(topic: CurrentAffairsTopic, now: Date = new Date()): boolean {
  if (!topic.expiry_date) return false;
  return new Date(topic.expiry_date).getTime() < now.getTime();
}

export function daysUntilExpiry(topic: CurrentAffairsTopic, now: Date = new Date()): number | null {
  if (!topic.expiry_date) return null;
  return Math.ceil((new Date(topic.expiry_date).getTime() - now.getTime()) / 86_400_000);
}

export interface SchoolRoute {
  id: string;
  university: string;
  course: string;
  code: string;
  route: string;
  interview_type: string;
  engines: string[];
  structure: string;
  stations: number | null;
  station_length_min: number | null;
  prep_time_min: number | null;
  total_duration_min: number | null;
  delivery: string | boolean | null;
  roleplay: string | boolean;
  numeracy_data: string | boolean;
  scientific_reasoning: string | boolean;
  application_questioning: string | boolean;
  ethics: string | boolean;
  nhs_current_affairs: string | boolean;
  group_task: string | boolean;
  independently_scored: string | boolean;
  published_criteria: string[];
  scoring_note: string | null;
  distinctive: string;
  changes: string;
  confidence: string;
  cycle_published: string;
  source_type: string;
  source_url: string;
  date_checked: string;
}

const schoolMap = schoolMapRaw as { schools: SchoolRoute[]; meta: Record<string, unknown> };

export function listSchools(): SchoolRoute[] {
  return schoolMap.schools;
}

export function getSchool(id: string): SchoolRoute | undefined {
  return schoolMap.schools.find((s) => s.id === id);
}

export const scoringRubrics = scoringRubricsRaw as Record<string, unknown>;

export function ontologyCoverageStats(usedTopicIds: Set<string>) {
  const all = listOntologyTopics();
  return {
    totalTopics: all.length,
    coveredTopics: all.filter((t) => usedTopicIds.has(t.id)).length,
  };
}
