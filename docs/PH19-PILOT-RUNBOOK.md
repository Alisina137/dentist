# DandanLink PH19 — production-pilot operator worksheet

Version: 2026-11-15. This is a **fillable gate worksheet, not an approval certificate**. All unverified items are launch-blocking. Do not add real patient/clinical data in development or unapproved hosting.

| Item | Required evidence | Accountable approver | Current result |
| --- | --- | --- | --- |
| Legal and privacy notice; terms and consent in three languages | Signed jurisdictional legal review and publication revision | Legal advisor | **BLOCKED** |
| Guardian/minor authorization; clinical consent and documentation | Qualified clinician and legal reviewer with test cases | Clinical lead | **BLOCKED** |
| Database, file hosting, encryption at rest, TLS, backup storage region | Provider contract, diagram, controls, encryption key ownership | Security lead | **BLOCKED** |
| Penetration/authorization and data-loss prevention testing | Signed report, resolved critical/high findings | Independent security lead | **BLOCKED** |
| Production access review, MFA, admin/service accounts | Account roster, last audit, break-glass procedure | Operations owner | **BLOCKED** |
| Live environment critical alerts, on-call escalation and incidents | Alert tests, on-call contacts, incident rehearsal | Operations owner | **BLOCKED** |
| Real production-like backup, independent restore and checksum | Snapshot ID, restored version, timestamp, RPO/RTO in minutes | Recovery owner | **BLOCKED** |
| Lab API/browser/device RTL/a11y and low-bandwidth exercises | Screens and recorded English, Dari, Pashto checks | QA / product owner | **BLOCKED** |
| 100 concurrent bookings / single reservation test | GitHub CI PH19, log of one winner | Engineering | **CI-gated** |
| 5–10 verified clinics, consented pilot, feedback and rollback owners | Pilot roster, phone checks, daily oversight | Pilot sponsor | **BLOCKED** |

### Recovery drill record (fill using production-like infrastructure)

- Date/time (UTC): __________________
- Provider and backup ID (redacted): __________________
- Source DB version / schema migration: __________________
- Snapshot start/completion time: __________________
- Isolated restore start/completion time: __________________
- Actual RTO (minutes): __________________
- Measured RPO (minutes): __________________
- Counts/checksums verified (no PHI in evidence): __________________
- Booking exclusion / append-only triggers verified: __________________
- Encryption, key access and audit validated: __________________
- Recovery owner signature and date: __________________

### Pilot simulation witness log

- Clinic created and verified (test tenant): ______
- Staff invited with MFA, access review observed: ______
- Patient booking/reschedule/no-show concurrency observed: ______
- Signed clinical visit and immutable history inspected by authorized clinician: ______
- Partial payment and issued invoice ledger reconciled: ______
- Owner export generated, saved encrypted, link replay denied: ______
- Restore drill and rollback exercised on isolated environment: ______
- English, Dari, Pashto and Android slow-connectivity checks: ______
- Incident response and on-call notification drill: ______

### Release decision

- Engineering CI: PENDING / PASS / FAIL (run URL and SHA): ______
- Security: BLOCKED / PASS (signed evidence link): ______
- Legal: BLOCKED / PASS (signed evidence link): ______
- Clinical: BLOCKED / PASS (signed evidence link): ______
- Operations backup/alerts: BLOCKED / PASS (signed evidence link): ______
- Product accessibility/localization: BLOCKED / PASS (signed evidence link): ______
- Pilot sponsor final decision: **NO-GO** until every item PASS, date and signature: ______

If any control fails: stop uploads and pilot enrollment, preserve audit evidence, rotate exposed credentials, disable public promotion, restore only from approved backup, assess data loss and notify appropriate parties under the incident plan. Roll back the application build without dropping patient-history tables.
