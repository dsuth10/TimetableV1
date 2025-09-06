# Linear MCP Integration

This project uses a Linear MCP integration to automate common issue‑management tasks from the IDE.

## Prerequisites

- Linear workspace and team (e.g., team: `Joshua-ai`)
- Linear API token configured in your MCP client

## Common Operations

- List teams, issue statuses, labels
- List issues by team
- Create project and move issues into it
- Assign or update cycle
- Update issue state (Todo, In Progress, In Review, Done)

## Example Session (used in this repo)

1) Create project and add issues

- Create project: "QA Hardening (Sep 2025)"
- Add issues: JOS-37, JOS-10, JOS-38, JOS-27
- Keep states: JOS-37/JOS-10 (In Progress), set JOS-38/JOS-27 (Todo)

2) Reconcile statuses

- Mark JOS-29 and JOS-30 as Done (descriptions indicate completion)
- Move JOS-36 (tracking) into the project

3) Create cycle and assign

- Create/assign cycle "QA Hardening (Sep 2025)" to JOS-37, JOS-10, JOS-38, JOS-27

## Notes

- If cycles are disabled for the team, use a project or label as a fallback.
- Use issue identifiers (e.g., `JOS-37`) or IDs in commands when supported.
- Keep tracking issues free of execution tasks; link focused tickets instead.

## Troubleshooting

- Ensure the MCP has a valid Linear token.
- Verify the team name matches exactly (e.g., `Joshua-ai`).
- Some operations (like cycle creation) may vary by workspace settings.
