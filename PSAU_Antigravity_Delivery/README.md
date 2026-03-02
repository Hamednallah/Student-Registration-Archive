# PSAU Academic Management System
## Google Antigravity — Complete Delivery Package
### 30,000 Students | Production Grade | v2.0 Local → v2.1 AWS

---

> READ `.cursorrules` BEFORE WRITING ANY CODE. Every session.

---

## ⚠️ MANDATORY DELIVERY ORDER

v2.0 (local Docker) must be 100% complete and signed off.  
Only then: provision AWS for v2.1.  
See `docs/17_v2.0_SIGN_OFF.md` for the formal gate.

## Session Start (Every Session)

```bash
cat MEMORY.md && git log --oneline -10 && pnpm test:unit 2>&1 | tail -3
```

## Document Index

| File | Purpose |
|------|---------|
| `.cursorrules` | **Read every session. SEARCH→MAP→REASON→MODIFY rules.** |
| `MEMORY.md` | Current codebase state. Update after every change. |
| `AGENTS.md` | AI identity, workflow, codebase mental model |
| `CONTRIBUTING.md` | Dev onboarding, setup, PR rules |
| `docs/00_MASTER_BRIEF.md` | Project rules, tech stack, SLOs |
| `docs/01_ARCHITECTURE.md` | System design, data flow |
| `docs/02_QUALITY_STANDARDS.md` | Code quality rules |
| `docs/03_DOCKER_ENVIRONMENTS.md` | All Dockerfiles + 3 compose environments |
| `docs/04_TESTING_STRATEGY.md` | 85-90% coverage plan + all test patterns |
| `docs/05_CI_CD_PIPELINE.md` | GitHub Actions pipeline |
| `docs/06_AWS_DEPLOYMENT.md` | Terraform + v2.1 delivery steps |
| `docs/07_MONITORING_OBSERVABILITY.md` | Metrics, alarms, dashboards, SLOs |
| `docs/08_RUNBOOK.md` | Incident response + operations |
| `docs/09_AI_PROMPTS.md` | Phase-by-phase AI session prompts |
| `docs/10_VERSION_DELIVERY_PLAN.md` | v2.0/v2.1 phase map |
| `docs/11_CODEBASE_EXPLORATION_RULES.md` | Deep SEARCH→MAP→REASON→MODIFY guide |
| `docs/12_ARCHITECTURE_DECISIONS.md` | Why decisions were made (ADRs) |
| `docs/13_SECURITY_THREAT_MODEL.md` | Threat model + security controls |
| `docs/14_ENGINEERING_REFERENCE.md` | Dependencies, i18n, browser support |
| `docs/15_CODEBASE_MAP.md` | **Symbol graph, call chains, index map** |
| `docs/16_ERROR_CODE_REGISTRY.md` | **Every error code: AR + EN + HTTP status** |
| `docs/17_v2.0_SIGN_OFF.md` | **Formal acceptance gate for v2.0** |
| `docs/18_DATA_MIGRATION_RUNBOOK.md` | **Importing real university data** |
| `docs/19_PHASE_GATES_DETAILED.md` | **Exact pass/fail commands per phase** |
| `docs/COMPLETE_SPEC_FINAL.md` | Academic rules, schema, API (2,188 lines) |
| `docs/ANALYSIS.md` | 34 original bugs — all resolved |
| `tests/load/exam-season.js` | k6 load test: 200 VU exam peak simulation |
