import { describe, it, expect } from 'vitest';
import {
  listOntologyTopics, getOntologyTopic, listRoleplays, getRoleplay,
  listCurrentAffairsTopics, isCurrentAffairsWithheld, listSchools,
} from '../index';

// Sanity checks that the copied research-pack JSON parses correctly and the loader's shape
// matches what the rest of the app (the admin Medicine Portal) reads it for. These numbers are
// facts about the source research pack (docs/*.md), not arbitrary — a change here should mean the
// underlying data files actually changed, not a typo in the loader.
describe('medicine-content data pack', () => {
  it('loads all 158 ontology topics across 10 domains', () => {
    const topics = listOntologyTopics();
    expect(topics.length).toBe(158);
    expect(getOntologyTopic('D5.4.4')?.label).toBe('Fitness to drive and the DVLA');
  });

  it('loads all 20 roleplay personas with hidden facts and endings', () => {
    const roleplays = listRoleplays();
    expect(roleplays.length).toBe(20);
    const rp009 = getRoleplay('RP-009');
    expect(rp009?.title).toBe("Just tell me what you'd do");
    expect(rp009?.hidden_facts.length).toBeGreaterThan(0);
    expect(rp009?.endings.length).toBe(4);
  });

  it('loads all 22 current-affairs topics and correctly withholds an expired one', () => {
    const topics = listCurrentAffairsTopics();
    expect(topics.length).toBe(22);
    const assistedDying = topics.find((t) => t.id === 'CA-009')!;
    expect(assistedDying.expiry_date).toBe('2026-09-12');
    expect(isCurrentAffairsWithheld(assistedDying, new Date('2026-09-15'))).toBe(true);
    expect(isCurrentAffairsWithheld(assistedDying, new Date('2026-09-01'))).toBe(false);
    // A Tier 1 evergreen topic has no expiry and is never withheld.
    const evergreen = topics.find((t) => t.tier === 1)!;
    expect(isCurrentAffairsWithheld(evergreen, new Date('2099-01-01'))).toBe(false);
  });

  it('loads all 68 school course-routes', () => {
    expect(listSchools().length).toBe(68);
  });
});
