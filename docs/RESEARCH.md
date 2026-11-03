# Market research: skills & competence matrix software

*Compiled November 2026. Judgements use sources from 2025–2026 only.*

## 1. Is there demand?

Yes, but in a niche software category that is growing steadily and already has many competitors.

| Estimate | Source |
|---|---|
| Skills management software: about US$455M (2025) → US$860M (2031), roughly 11% a year | LP Information, Jan 2025 |
| Skills management software: about US$403M (2025) → US$827M (2032), 10.8% a year | Reportprime, 2025 |
| Skills matrix software: US$468M (2024) → US$902M (2032), 10% a year | Intel Market Research, Dec 2025 |
| Dedicated skills matrix software: US$512M (2024) → US$948M (2031) | Valuates Reports (cited by Compono, 2026) |

The main reasons demand is growing:

- **Skills-based working is becoming normal.** 81% of employers used some form of skills-based hiring in 2024, up from 56% in 2022 (iMocha, 2025).
- **Most organisations still have no tool for it.** Only about 1 in 3 companies use technology to support a skills-based approach (WTW Global Skills Survey, 2025). The rest use spreadsheets, so Excel is the real competitor.
- **Small and mid-sized companies are the faster-growing segment**, even though large enterprises account for about two-thirds of spend (GlobalInfoResearch, 2025).
- **Regulated sectors need this kind of record.** ISO/IEC 17025 clause 6.2.5, for example, requires labs to keep records of each person's competence requirements, training, authorisation, the date the authorisation took effect, and ongoing monitoring (Bassetti). The same pattern appears in ISO 9001/13485 competence clauses and GMP training rules.

## 2. Who is already out there

The category is split in two, and products from each side often call themselves "skills management":

**A. HR / talent-intelligence platforms.** Their focus is workforce planning, internal mobility and careers. Examples are Workday, 365Talents, Fuel50, Leapsome, MuchSkills and Skills Base. They are strong on skill taxonomies and HR integrations, but don't think in terms of equipment, SOPs or audits.

**B. Operations / compliance training matrices.** Their focus is who is qualified to do what, and proving it.

| Tool | Focus | Pricing (published) | Noted weakness |
|---|---|---|---|
| AG5 | Frontline / manufacturing skills matrix, expiry alerts, audit trail | Quote only (Core / Accelerate / Enterprise) | Training delivered elsewhere, limited customisation, basic reporting |
| Cloud Assess | Frontline training, assessment and evidence, offline mobile | Quote only | — |
| Poka | Factory-floor training and skills matrix | Quote only | Weaker analytics, hard to get data out |
| TeamGuru | Multi-site training matrix, retraining flags | Tiered, quote only | Complex customisation, limited value for small teams |
| BIStrainer | Safety compliance, automated assignment | Quote only | Steep learning curve, heavy for small organisations |
| SkillStation | UK construction compliance | From £3 per user per month | Limited mobile and integrations |
| Boxcore | UK & Irish construction site access | Quote only | Construction only, checks certificates rather than competence |
| Skills Base | General skills matrix | Free tier; US$2–3 per user per month | General purpose, not compliance-led |
| Kallidus, PowerDMS | LMS / policy-led training | Quote only | No true matrix view |
| LIMS (various) | Lab sample and data management, sometimes with analyst authorisation | Enterprise | Competence is a side module, expensive, heavy |

Sources: Cloud Assess "Best training matrix software 2026" (Apr 2026, a vendor-written list), Gitnux (Oct 2026), Capterra/GetApp listings (2026), AG5 product page.

## 3. Gaps we can see

1. **Nobody is built for research and testing labs.** The operations tools target factory floors and construction sites. Lab work is organised around instruments, SOP numbers and revisions, a person in charge, and authorisation levels such as "can train" and "can calibrate". Today that only fits in Excel or in an expensive LIMS.
2. **Pricing is opaque.** Almost every compliance tool is quote-only. A transparent price for 10–100 person teams would stand out.
3. **The audit trail is an add-on.** In spreadsheets the change log gets abandoned because it's a separate manual step. It should be impossible to change a level without the log entry being written.
4. **SOP version control is ignored.** Auditors ask which revision someone was trained on. Very few tools link a sign-off to an SOP revision or trigger retraining when the revision changes.
5. **Few tools warn about over-reliance on one person.** "Only one person can run the CT scanner" is a business risk. Tools mostly show gaps for each person, not cover for each piece of equipment.
6. **Competence lapses.** ISO 17025 guidance suggests stepping someone back to "requires supervision" after a long gap without using a method. Almost no matrix tool does this.

## 4. Positioning for SkillMatrix

> **The competence record for labs and technical teams, simple enough to replace the spreadsheet and strong enough for the auditor.**

- **Target customers:** university and state research centres, contract test labs (ISO 17025), medtech and pharma QC labs, and engineering firms with 10–150 technical staff. Ireland, the UK and the EU first.
- **Wedge:** import their existing Excel matrix in minutes, then give them cover, gaps, expiries and an automatic audit trail on day one.
- **Pricing hypothesis:** published per-user pricing (for example €3–6 per user per month), a free tier for one lab, and an add-on for audit-pack exports.

## 5. Roadmap from research

- **MVP (this repo):** people, equipment and SOPs, a 0–4 scale with target and current levels, cover counts, gaps, training plans, recurring training expiry, an automatic change log, and CSV/JSON export.
- **Next:** import from Excel/CSV, link sign-offs to SOP revisions with retraining when a revision changes, an evidence attachment for each sign-off, and email reminders.
- **Then:** accounts and roles (approver, viewer), a shared cloud database, an audit-pack PDF export, lapse rules (e.g. 6 months without use → supervised), and HRIS/LMS integrations.
- **Later:** multiple sites, QR codes on instruments ("am I authorised?"), and AI help to map SOPs to skills.

## Sources

- [LP Information – Skills Management Software Market 2025–2031](https://marketresearch.com/LP-Information-Inc-v4134/Global-Skills-Management-Software-Growth-39314579)
- [Reportprime – Skills Management Software Market](https://www.reportprime.com/skills-management-software-r11651)
- [Intel Market Research – Skills Matrix Software Market 2026–2032](https://www.intelmarketresearch.com/skills-matrix-software-market-23876)
- [Compono – Skills matrix software guide 2026](https://www.compono.com/articles/skills-matrix-software-guide-2026)
- [GlobalInfoResearch – Skills Management Software Market 2025](https://marketresearch.com/GlobalInfoResearch-v4117/Global-Skills-Management-Software-Company-39420391)
- [WTW 2025 Skills Survey summary](https://bizweek.mu/the-future-organisation-will-be-a-skills-focused-organisation)
- [iMocha – Skills statistics 2025](https://www.imocha.io/blog/skills-statistics)
- [Cloud Assess – Best training matrix software 2026](https://cloudassess.com/blog/best-training-matrix-software/)
- [Gitnux – Best skill matrix software 2026](https://gitnux.org/best/skill-matrix-software/)
- [AG5 – Skills matrix software](https://www.ag5.com/skills-matrix-software/)
- [GetApp – Skills Base](https://www.getapp.com/all-software/a/skills-base/)
- [Capterra – MuchSkills](https://www.capterra.co.nz/software/203859/muchskills)
- [Bassetti – ISO 17025 and authorisation management](https://bassetti-group.com/en/?p=373595)
- [Guideflow – Skills management software buyer's guide](https://www.guideflow.com/blog/skills-management-software)
