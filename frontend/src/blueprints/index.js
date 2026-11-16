/**
 * Domain blueprints (project description: "Domain Blueprints & Operational Analytics").
 * Pure frontend configuration: selecting one pre-fills POST /api/domain and then creates
 * its services (proposed POST /api/service). `workflow` lists service prefixes in journey
 * order and is used to suggest the "next desk" when staff transfer a token.
 */
import healthcare from './healthcare.json';
import civic from './civic.json';
import banking from './banking.json';
import education from './education.json';

export const BLUEPRINTS = [healthcare, civic, banking, education];

export const DOMAIN_TYPES = [...new Set(BLUEPRINTS.map((b) => b.domain.type)), 'Other'];

export const findBlueprintByType = (type) => BLUEPRINTS.find((b) => b.domain.type === type) || null;

/**
 * Journey order as service NAMES (prefixes may be changed to stay unique when a blueprint
 * is applied twice, names are not).
 */
export const workflowNamesForType = (type) => {
  const bp = findBlueprintByType(type);
  if (!bp) return [];
  return bp.workflow.map((p) => bp.services.find((s) => s.prefix === p)?.name).filter(Boolean);
};
