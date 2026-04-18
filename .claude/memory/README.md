# Claude Memory — Backup

These files are a copy of Claude's project memory. They travel with the git repo so context is never lost when moving computers.

## Restore on a new machine

1. Find your encoded project path — it's based on the full folder path:
   Replace `\` with `-` and `:` with `-` in the path, e.g.:
   `C:\Users\YOU\12.Gustavo\1. Jarvis` → `C--Users-YOU-12-Gustavo-1--Jarvis`

2. Create the memory folder:
   ```
   C:\Users\YOU\.claude\projects\C--Users-YOU-12-Gustavo-1--Jarvis\memory\
   ```

3. Copy all `.md` files from this folder (except this README) into that path.

4. Open the project in Claude Code — memory will be loaded automatically.

## Keep in sync

Whenever Claude saves something important to memory during a session, also run:
```
cp C:\Users\YOU\.claude\projects\...\memory\*.md  .claude\memory\
git add .claude/memory && git commit -m "Update Claude memory backup"
```
