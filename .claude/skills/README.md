# `.claude/skills/`

Project-scoped Claude Code skills. Any Claude Code agent running inside this repo can invoke them with `/<skill-name>`.

| Skill | When to use |
|---|---|
| `/test-everything` | Run the full pyramid (unit → integration → e2e → live) with state isolation. |
| `/recoverability-audit` | Map every destructive action in a UI, verify each is reversible from the UI alone. |
| `/post-deploy-verify` | After `git push` to main, wait for Vercel rebuild and curl-test the live behavior. |
| `/regenerate-admin-screenshots` | Re-seed admin demo data + run EN + HR Playwright generators for the docs' embedded shots. |
| `/check-everything` | Selenium visual + functional sweep of every public page and the admin flow. Screenshots each step. Local or live via `BASE=` env. |
| `/selenium-sweep` | Run every Selenium-driven test (5 local + 2 production), count assertions per suite, prove WebDriver execution with timestamped screenshots. |

Each skill is a `SKILL.md` file with frontmatter (`name`, `description`) followed by the runbook the agent follows. To add a new one, drop in `.claude/skills/<name>/SKILL.md` with the same shape.
