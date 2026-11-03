# SkillMatrix

**A skills & competence matrix for labs and technical teams, built around ISO 9001.** It shows who is authorised to run which equipment, where you depend on one person, who needs training next, and which safety training is about to expire. Every sign-off carries the evidence ISO 9001 clause 7.2 asks for, and the evidence pack is ready to hand to an auditor.

It's built to replace the large Excel matrices most labs keep, where each person has two columns, every training plan is its own tab, and the change log stops being updated after a few months.

**[Open the live demo →](https://aarunanton.github.io/SkillMatrix/)** (fictional sample data)

## What it does

| | |
|---|---|
| **Skills matrix** | Equipment and skills grouped by area, with one column per person. Each cell shows the current level, and an orange dot means the person is below their target. Filter by area or person, or switch to *Gaps only* or *Who can operate*. |
| **Cover** | For each item, the number of people who can operate it independently. Items with one or no operator are flagged on the overview. |
| **People** | Each profile works as that person's training plan: open gaps, who can train them, the planned date and status, competence by area, and recurring training. |
| **Equipment & SOPs** | Make, model, location, SOP number and revision, and the person in charge. Changing an SOP revision is logged. |
| **Recurring training** | Courses have a validity period, and the app works out expiry dates. Each entry is valid, due within 60 days, or overdue. |
| **Roles & requirements** | Set what each role needs once (ISO 9001 7.2 a). Everyone in the role inherits it as their target, and new joiners get it automatically. |
| **ISO 9001 sign-offs** | Each sign-off records what competence is based on (training, qualification or experience, 7.2 b), how its effectiveness was checked and the result (7.2 c), who signed it off and an evidence reference (7.2 d). A level can't be raised without a check, and "not yet competent" keeps the level where it was. |
| **ISO 9001 evidence pack** | Per person or the whole team: requirements, current level, basis, effectiveness check, sign-off and recurring training, including the 7.3 quality policy, culture & ethics awareness briefing. Filter to *missing evidence only*, print or save as PDF, or export CSV. |
| **Change log** | Written automatically for every sign-off, target change, new person, SOP change and training record. It can be exported but not edited. |
| **Data** | Saved in your browser. Export the matrix as CSV, or back up and restore everything as JSON. |

### Authorisation scale (editable)

| Level | Meaning |
|---|---|
| 0 | Not authorised to operate |
| 1 | Supervised: can run a set-up task under an authorised person |
| 2 | Authorised to operate independently |
| 3 | Authorised to operate and train others |
| 4 | Expert: can calibrate / maintain |

## Run it

There's no build step and nothing to install.

```bash
git clone https://github.com/aarunanton/SkillMatrix.git
cd SkillMatrix
python3 -m http.server 8000   # then open http://localhost:8000
```

You can also open `index.html` directly in a browser.

## Project layout

```
index.html        App shell
css/styles.css    Design tokens, layout, light/dark themes
js/app.js         Router, pages, dialogs, change log, export/import
js/sample.js      Fictional sample lab (no real people or records)
docs/RESEARCH.md  Market research, competitors, gaps, positioning, roadmap
```

## Status and roadmap

This is an MVP for testing the idea. See [docs/RESEARCH.md](docs/RESEARCH.md) for the market research behind it.

- [x] Matrix, cover, gaps, training plans, recurring training expiry, automatic change log, CSV/JSON export
- [x] ISO 9001 7.2/7.3: role requirements, basis of competence, effectiveness checks, evidence pack (print/PDF/CSV)
- [ ] Import an existing Excel/CSV matrix
- [ ] Link sign-offs to SOP revisions, with retraining when a revision changes
- [ ] Evidence file attachments for each sign-off (today: a reference to your QMS record)
- [ ] Accounts, roles (approver / viewer) and a shared cloud database
- [ ] Email reminders for expiring training
- [ ] Lapse rules (e.g. no use for 6 months → back to supervised)

## Licence

MIT
