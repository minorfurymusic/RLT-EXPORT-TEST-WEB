import { describe, it, expect } from 'vitest';
import { runFullTransactionalTestSuite } from './brainOrchestratorTest';

// Thin wrapper around the existing in-app diagnostic suite (also reachable
// live via the "/validar" command in the AI Assistant chat) so it runs in
// CI too, without rewriting logic the in-app command already depends on.
describe('brainOrchestrator — transactional suite', () => {
  it('passes every scenario', () => {
    const { allPassed, results } = runFullTransactionalTestSuite();
    const failures = results.filter(r => !r.passed);
    expect(failures, JSON.stringify(failures, null, 2)).toHaveLength(0);
    expect(allPassed).toBe(true);
  });
});
