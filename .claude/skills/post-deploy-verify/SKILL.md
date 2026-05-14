---
name: post-deploy-verify
description: After pushing to main, wait for Vercel to rebuild and curl-test the live site to prove the new behavior is actually deployed.
---

# post-deploy-verify

Use after any `git push` to `main` on the housey repo (`tankaraca14a/housey`), or when the user says "verify on live", "is it deployed yet", "check production".

This is a hard requirement, not optional. See `~/.claude/projects/-Users-mm-Developer-ivanadrag/memory/post_deploy_verification.md`.

## Method

1. **Poll for the deploy to be reachable:**
   ```bash
   for i in 1 2 3 4 5 6 7 8 9 10; do
     st=$(curl -sS -o /dev/null -w "%{http_code}" https://www.tankaraca.com/admin)
     echo "  attempt $i: $st"
     [ "$st" = "200" ] && sleep 25 && break
     sleep 15
   done
   ```
   The `sleep 25` after the first 200 is to let edge cache repopulate.

2. **Curl the specific URL the change should affect** (not just the homepage). Examples:
   - New `/images/ivana/*.jpg` files: hit each one, expect 200.
   - New admin behavior: hit `/admin` HTML, grep for the new testid or label text.
   - Email behavior: not curlable; run `npm run test:live` which hits real Resend + KV.

3. **Prove the new behavior with a positive assertion**, not just "page loads":
   ```bash
   curl -sS https://www.tankaraca.com/gallery | grep -oE 'undo-confirm-toast' | head -1
   curl -sS https://www.tankaraca.com/images/ivana/terrace-01.jpg -o /dev/null -w "%{http_code} %{size_download}\n"
   ```

4. **Run `npm run test:live`** for any change that touches admin, bookings, images, or scheduling. The live suite exercises real production KV + Blob + Resend with sentinel-emails for cleanup.

## Cleanup before next run

If `npm run test:live` left any orphans on production (rare; cleanup is in `finally`), delete them via the admin API:

```bash
# List + delete leftover sentinel-email rows
curl -sS https://www.tankaraca.com/api/admin/bookings -H "x-admin-password: $ADMIN_PW" | \
  node -e 'let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>{
    const a=JSON.parse(s).bookings||[];
    a.filter(b=>b.email.includes(".invalid")).forEach(b=>console.log(b.id));
  })' | while read id; do
    curl -sS -X DELETE "https://www.tankaraca.com/api/admin/bookings/$id" \
         -H "x-admin-password: $ADMIN_PW" -w "  %{http_code}\n"
  done
```

For leaked blocked-dates, do NOT mass-delete. Ivana has real dates blocked. Diff against the test's recorded baseline first, then surgical DELETE only known-test dates.

## Report format

```
**Deploy verified live** (commit `<sha>`):
- <URL or behavior> → 200 / <expected content found>
- npm run test:live: N / N ✓
```

If anything fails:
- name the URL or assertion
- show the actual response
- propose either: (a) retry after another wait, (b) data drift cleanup, (c) real regression — fix and re-deploy.
