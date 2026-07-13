# Execution Plan Rules

An execution plan records how a multi-step change moves from an approved design
to verified code. Put current plans in [active](exec-plans/active/README.md) and
move finished plans to [completed](exec-plans/completed/README.md).

Every active plan must contain these exact second-level sections:

## Status

State whether the plan is proposed, active, paused, or blocked. Name the owner
and the next action when this information helps coordination.

## Progress

Keep a dated record of completed work and remaining work. Update it during the
change so another person or agent can continue without guessing.

## Decisions

Record important choices, their reasons, and any rejected option that may
matter later. Link a lasting architecture choice from the
[decision index](decisions/README.md).

## Verification

List the exact commands and manual checks that prove the result. Record their
latest outcomes. Do not mark a plan complete while a required check fails.

Keep each plan focused on one outcome. Link its design or product specification
and move it to the completed directory when all required work and verification
finish.
