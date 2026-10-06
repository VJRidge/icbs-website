# Project Rules Starter

## Read before installing

This is editable guidance, not an automatic safety barrier. Review it alongside any existing project instructions. Do not overwrite existing rules. For Claude Code, merge appropriate guidance into CLAUDE.md. For Cursor, ask the agent to propose the correct project-rule location and format for your installed version. This download is not a ready-to-install Cursor .mdc rule file.

Fill in every bracket before using it. Remove guidance that does not fit the project. Keep one consistent set of requirements when switching tools. Do not include real secrets.

## Project purpose

We are building [product] for [user] to accomplish [job].
Current stack: [actual framework/backend/services].
Relevant instructions: [existing project files].

## Scope

Implement the agreed outcome: [outcome]. Prefer the smallest maintainable change that meets it. Do not rename, redesign, upgrade, or refactor unrelated code. If broader work is necessary, explain why and propose its scope first.

## Protect working behavior

These flows must keep working: [list].
These files or services need extra review: [list].
Do not modify database permissions, authentication, billing, email delivery, production configuration, or shared data without an explicit scoped instruction.

## Plan before changing

Read relevant files first. Explain the files involved, intended behavior, and checks for a substantial or uncertain change. Ask for missing facts when they prevent a reliable implementation; do not invent them.

## Evidence before done

Inspect the diff. Run the relevant existing checks: [actual commands]. Try the acceptance path: [steps]. Report the actual result, including anything not tested. Compilation alone does not prove behavior.

## Secrets and data

Never commit real secrets or bundle privileged keys into client code. Use approved server-side secret handling: [method]. Use dummy data for examples. Enforce access in the appropriate trusted layer; do not rely on hiding UI controls.

## Recovery

Preserve unrelated uncommitted work. Use the known-good baseline: [commit]. Do not run destructive resets, force pushes, delete files, or discard changes as an assumed recovery step. Explain a targeted recovery plan first.

## Handoff

Update ROADMAP.md with verified outcomes, remaining issues, and the next safe step. State the files changed and evidence collected. Never claim an email was sent, payment completed, or download delivered unless the relevant action was actually verified.
