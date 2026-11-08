# UI seam snapshot

Type: grilling
Status: open
Blocked by: 01, 08

## Question

What do the new core's snapshot and event stream hold for the slice? Keep the shape the UI uses today (create from seed and configuration, step one Tick, read a plain read-only snapshot, subscribe to events) and decide its contents against what src/ui/main.ts reads, including whether events come from Decisions' Reasons and how the chronicle is fed.
