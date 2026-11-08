# Domain docs

This is a single-context repo. Engineering skills should use the project's domain language and respect recorded decisions.

## Before exploring

- Read root `GLOSSARY.md`. Use its terms in issue titles, proposals, hypotheses, and tests, and avoid the synonyms it lists under _Avoid_.
- Read the ADRs in `docs/adr/` that touch the area you are about to work in.
- Read `README.md` and `docs/ARCHITECTURE.md` for the current simulation concepts and documented architecture.

If one of these files is missing, carry on without flagging it. The `/domain-modeling` skill creates glossary entries and ADRs when a term or decision is resolved.

## File structure

```
/
├── GLOSSARY.md
├── docs/adr/
│   ├── 0001-actor-decisions-live-with-the-actor.md
│   └── ...
└── src/
```

## Use the glossary's vocabulary

When your output names a domain concept, use the term as `GLOSSARY.md` defines it. A concept missing from the glossary means you are inventing language the project does not use, or there is a gap to note for `/domain-modeling`.

## Flag ADR conflicts

If your output contradicts an ADR, say so explicitly instead of silently overriding it:

> _Contradicts ADR-0002 (beings decide through nature, mind and world), but worth reopening because…_
