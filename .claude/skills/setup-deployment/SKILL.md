---
name: setup-deployment
description: Link the project to Vercel, configure custom domain + DNS, set environment variables, verify the first deploy. Vercel-first because the user's projects all live there.
---

# setup-deployment

Use after `/bootstrap-website` (or any time a project still has no deploy target). The end state: pushing to `main` builds + ships to a `https://<user-domain>` URL automatically.

## Preflight

1. **GitHub remote exists**? `git remote -v` must show origin. If not, the user needs to create the GitHub repo first — usually via `gh repo create` once signed in with the right identity (see `/setup-multi-identity-git` if multiple accounts).
2. **Vercel CLI installed**? `vercel --version`. If missing: `npm i -g vercel`.
3. **User logged in to Vercel**? `vercel whoami`. If not, tell them to type `! vercel login` in the prompt — interactive flows can't run inside a tool call.

## Method

### 1. Link

```bash
vercel link
```

Pick the right Vercel team if prompted. This writes `.vercel/project.json` — gitignored by default, never commit it.

### 2. First deploy (preview)

```bash
vercel
```

Confirms the build pipeline works. Note the preview URL it returns.

### 3. Custom domain

If the user has a domain:

```bash
vercel domains add <domain>             # one-time
vercel alias set <preview-url> <domain> # only needed if not auto-aliased
```

Vercel handles SSL + provides DNS instructions:
- Apex (`example.com`): A record to `76.76.21.21`
- Subdomain (`www.example.com`): CNAME to `cname.vercel-dns.com`

Wait for DNS propagation (`dig <domain> +short` returns an IP) — usually under 5 minutes.

### 4. Production deploy

```bash
git push origin main          # auto-deploys via the GitHub integration
# OR manually:
vercel deploy --prod --yes
```

Vercel sometimes deploys a git push as preview, not prod. If `vercel ls` shows the latest as "Preview" instead of "Production," run `vercel deploy --prod --yes` from the same commit.

### 5. Environment variables

For every secret + config:

```bash
vercel env add RESEND_API_KEY production
vercel env add ADMIN_PASSWORD production
# ... repeat per env (production / preview / development)
```

Then pull a local snapshot for dev:

```bash
vercel env pull .env.local
```

Add `.env.local` to `.gitignore` if not already there.

### 6. Vercel auto-attribution off (per user's standing rule)

This is enforced at the harness level via `~/.claude/settings.json` — do not add Co-Authored-By or "Generated with Claude Code" to commits or PRs, ever.

## Verify

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://<domain>/         # 200
curl -sS -o /dev/null -w "%{http_code}\n" https://<domain>/api/health 2>/dev/null   # optional
# Visual: open <domain> in a browser, confirm the placeholder renders.
```

## Common errors

- **"No Vercel CLI" hangs in interactive prompts**: use `vercel <cmd> --yes` to auto-accept. For multi-prompt flows (`vercel integration add`), use an `expect` script.
- **DNS doesn't propagate**: `dig +short <domain> @8.8.8.8` against Google's resolver; sometimes the user's ISP caches the old NX record for an hour.
- **`vercel deploy` works but `git push` doesn't trigger a deploy**: GitHub app on the Vercel side may have been revoked; `vercel link` again.
- **First production deploy works, second one is preview**: `vercel ls --prod` shows what's actually live. Use `vercel promote <url>` to flip a preview to prod without redeploying.

## Next steps

1. `/setup-storage` — if the app needs persistence beyond static files.
2. `/setup-transactional-email` — if anything sends email.
3. After any subsequent push: `/post-deploy-verify` to prove the deploy landed.
