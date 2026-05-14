---
name: setup-multi-identity-git
description: Configure git + SSH so the right GitHub account is used for the right folder, even when one Mac is signed in to 3+ identities. Replays cleanly to other Macs via age-encrypted secrets.
---

# setup-multi-identity-git

Use when the user has multiple GitHub accounts (personal, client, work) AND wants pushing from `~/Developer/<project>/` to "just work" without manually picking an identity.

## Decision: per-folder identity vs. per-host alias

This user's pattern is **per-folder identity selected by directory location**, configured via `~/.gitconfig` includeIfs. Reasons:

- Doesn't require remembering aliases like `git@github-personal:foo/bar.git`
- Survives `git clone` from anywhere — the cloned repo picks up the right identity by where it landed
- Replays to a new Mac with one `install.sh`

## Steps

### 1. Generate one SSH key per GitHub account

```bash
# Personal
ssh-keygen -t ed25519 -C "personal-name@example.com" -f ~/.ssh/id_ed25519_personal

# Client / second account
ssh-keygen -t ed25519 -C "client-name@example.com" -f ~/.ssh/id_ed25519_client

# Add to ssh-agent
ssh-add --apple-use-keychain ~/.ssh/id_ed25519_personal
ssh-add --apple-use-keychain ~/.ssh/id_ed25519_client
```

Add each `.pub` to its GitHub account at `https://github.com/settings/keys`.

### 2. SSH config — pick the key by alias host

```ssh-config
# ~/.ssh/config
Host github-personal
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_personal
  IdentitiesOnly yes
  AddKeysToAgent yes
  UseKeychain yes

Host github-client
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_client
  IdentitiesOnly yes
  AddKeysToAgent yes
  UseKeychain yes
```

### 3. Git includeIf — pick the identity by folder

```ini
# ~/.gitconfig
[user]
  name = Personal Name
  email = personal-name@example.com

[includeIf "gitdir:~/Developer/personal/"]
  path = ~/.gitconfig-personal

[includeIf "gitdir:~/Developer/client/"]
  path = ~/.gitconfig-client
```

```ini
# ~/.gitconfig-client
[user]
  name = Client Name
  email = client-name@example.com
[url "git@github-client:"]
  insteadOf = git@github.com:
[url "git@github-client:"]
  insteadOf = https://github.com/
```

The `url.insteadOf` is the key: any `git clone git@github.com:client/foo.git` from inside `~/Developer/client/` automatically rewrites to `git@github-client:client/foo.git` and uses the right SSH key.

### 4. Replay to other Macs

The user's `mihaela-automate` repo has:
- `dotfiles/install.sh` — symlinks dotfiles into place
- `mihaela-agents/secrets/bootstrap-ssh-keys.sh` — drops age-encrypted private keys + passphrase from iCloud Keychain

If setting up a new Mac, point them at that. Otherwise carry the SSH keys via age:

```bash
# Source Mac
tar -czf /tmp/ssh-bundle.tgz -C ~/.ssh id_ed25519_personal id_ed25519_personal.pub id_ed25519_client id_ed25519_client.pub config
age -p /tmp/ssh-bundle.tgz > ~/Desktop/ssh-bundle.tgz.age
# Move the .age file to the new Mac (AirDrop, iCloud Drive, etc.)

# Target Mac
age -d ssh-bundle.tgz.age | tar -xzf - -C ~/.ssh
chmod 600 ~/.ssh/id_ed25519_* ~/.ssh/config
ssh-add --apple-use-keychain ~/.ssh/id_ed25519_*
```

## Verify

```bash
# In ~/Developer/personal/some-repo/
git config user.email      # → personal email
ssh -T git@github-personal # → "Hi <personal-username>!"

# In ~/Developer/client/some-repo/
git config user.email      # → client email
ssh -T git@github-client   # → "Hi <client-username>!"
```

## Common pitfalls

- **`Permission denied (publickey)` after the includeIf changes**: the URL rewrite needs an existing remote. Run `git remote set-url origin git@github.com:foo/bar.git` first; the rewrite then catches it.
- **Wrong identity used for commits, right one for pushes**: `git config user.email` reads from the topmost `[user]` block. Make sure the includeIf is BELOW the global `[user]` block in `~/.gitconfig` (later wins).
- **VS Code source-control panel uses the wrong identity**: it shells out to git like everyone else; the includeIf should work. If not, the repo was probably cloned outside the includeIf path and physically moved later — `cd` actually has to be inside the path at git invocation time.
- **macOS `ssh-add` doesn't persist across reboots**: add `UseKeychain yes` + `AddKeysToAgent yes` in the SSH config (shown above) AND run `ssh-add --apple-use-keychain <key>` once.

## Next steps

- `/setup-deployment` — `vercel link` will pick the right git account automatically once the SSH layer works.
- Any future `gh repo create`: prefix with the right identity, e.g. `GH_HOSTS=...` or `gh auth login` per account.
