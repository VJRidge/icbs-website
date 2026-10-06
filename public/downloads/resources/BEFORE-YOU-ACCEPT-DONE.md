# Before You Accept Done

Use this checklist for one change at a time. Write down what you actually checked. Mark irrelevant items N/A with a reason. It is not a complete security audit or launch approval.

Change: [describe]
Date: [date]
Branch and baseline: [details]
Expected behavior: [observable result]
Must keep working: [related flows]

## Check the change

- [ ] Relevant page loads and the app starts.
- [ ] The actual user path produces the expected result.
- [ ] Expected saved data survives refresh or return.
- [ ] Relevant empty, error, or boundary case is checked.
- [ ] Related flows still work.
- [ ] Access/session behavior is checked if affected.
- [ ] Diff matches scope and exposes no real secrets.
- [ ] Relevant automated checks run; results recorded.
- [ ] Real service actions are checked in a suitable test environment if affected.

## Keep the evidence

Steps performed: [steps]
Actual result: [result]
Evidence location: [non-sensitive file/screenshot/test output]
Not checked: [items and reasons]
Remaining issues: [issues]
Decision: [ready for this scoped change / needs work]
Verified commit: [identifier, after committing]
Next step: [step]

## Example receipt

Fictional example: Added an empty-state message in a practice notes app. Checked empty list, first saved note, last deletion, and refresh using dummy data. Message appeared only with zero notes. No account or payment flow exists in this practice app; those checks are N/A. Record real results separately in your own project.
