# Nucleus — desktop app (Windows)

A single-user version of Nucleus that runs as its own Windows program and
saves your data to a file on this computer — no internet needed to open it
or save your work, no sign-in, nothing shared with anyone else.

## Important — one step I could not finish

I built and tested the app itself (see "What was actually verified" below),
but the network this was built on has no internet access, so I could not
download Electron (the toolkit that turns this into a real `.exe`) or run
the packaging step myself. **The last step — turning this folder into
`Nucleus Setup.exe` — needs to run once somewhere with normal internet
access.** Below are two ways to do that: building it in the cloud on
GitHub (nothing to install on your own computer, recommended if installing
Node.js locally didn't go smoothly), or building it directly on your own
Windows computer.

## Option A — build it in the cloud with GitHub Actions (nothing to install)

This runs the whole build on a free Windows computer GitHub provides —
you never install Node, npm, or Electron yourself. You just need a free
GitHub account.

1. Go to https://github.com and sign up (free) if you don't already have
   an account.
2. Click the **+** in the top-right corner → **New repository**. Name it
   anything (e.g. `nucleus-desktop`), leave it Private or Public (either
   works), click **Create repository**.
3. On the new repository's page, click **uploading an existing file**
   (or **Add file → Upload files**).
4. Drag the entire contents of this `nucleus-desktop` folder into the
   browser window — all the files and folders, including the hidden
   `.github` folder (if your file browser hides folders starting with a
   dot, show hidden files first, or see the note below). Click
   **Commit changes** at the bottom.
5. Click the **Actions** tab near the top of the repository page. You
   should see a build already running (a yellow dot) — it starts
   automatically once the files are uploaded. Wait for it to turn into a
   green checkmark (a few minutes).
6. Click into that finished run, scroll down to **Artifacts**, and click
   **Nucleus-Windows-Installer** to download a zip. Inside is
   `Nucleus Setup 1.0.0.exe` — run it on your Windows computer to install
   Nucleus.

**If GitHub's uploader won't let you drag a hidden `.github` folder**:
on the repository page, click **Add file → Create new file**, type the
filename `.github/workflows/build.yml` exactly (typing the slashes creates
the folders automatically), and paste in the contents of the
`.github/workflows/build.yml` file from this project. Commit, then upload
the rest of the files normally and continue from step 5.

You only need to repeat this when you want a newer version of Nucleus in
the future — hand Claude the new files, upload them over the old ones in
the same repository (drag them in again, GitHub will ask to replace), and
the Actions build reruns automatically.

## Option B — build it on your own Windows computer

1. **Install Node.js** (skip if you already have it): go to
   https://nodejs.org, download the "LTS" version for Windows, run the
   installer, accept the defaults.
2. **Open this folder in a terminal.** In File Explorer, open the
   `nucleus-desktop` folder, then in the address bar at the top type `cmd`
   and press Enter — that opens a command prompt already inside this
   folder.
3. Run:
   ```
   npm install
   npm run dist
   ```
   The first command downloads Electron (a few hundred MB, one time only);
   the second builds the installer. Both can take several minutes.
4. When it finishes, look in the new `dist` folder for
   **`Nucleus Setup 1.0.0.exe`**. Run it — it installs Nucleus like any
   other Windows program, with a Start Menu entry and a desktop shortcut if
   you want one.

If `npm install` or `npm run dist` fails with an error, copy the error
text and share it — that's usually a quick fix (a missing prerequisite, a
blocked download, etc.), but without seeing the actual error it's hard to
guess what went wrong on your machine.

## Where your data actually lives

Everything you type into Nucleus is saved to:

```
%APPDATA%\Nucleus\nucleus-data.json
```

(In File Explorer, paste `%APPDATA%\Nucleus` into the address bar to open
it directly.) Every save also drops a timestamped copy into the `backups`
subfolder there and keeps the most recent 30 — so if anything ever goes
wrong with the main file, a recent backup is sitting right next to it.
Saves are written safely (to a temp file, then renamed into place), so a
crash or power loss mid-save can't corrupt your data.

There's also a **"Backup data"** button in Nucleus's own top bar — that
saves a full copy of everything as a `.json` file wherever you choose
(a USB drive, a cloud-synced folder, etc.), independent of the automatic
backups above.

**This data does not sync anywhere else.** It's specific to this Windows
user account on this computer. If you want to use Nucleus from a second
computer too, or share it with your team, that's what the separate
Microsoft Teams build (already delivered earlier) is for — this desktop
version is deliberately just for you, on this machine.

## What was actually verified

- The app itself (all the job tracking, Safety Docs, Welding Procedures,
  Water Testing, etc.) is the same Nucleus already tested extensively —
  unchanged in this build.
- The only new code is the save/load layer (`main.js` + `preload.js`) that
  replaces Claude's Artifact saving with a real local file. That exact
  logic (load, save, corrupt-file handling, atomic writes, backup rotation
  capped at 30) was run directly against a real filesystem in a standalone
  test: round-trip save/load, a deliberately corrupted data file recovering
  to an empty state without crashing or losing the corrupt file, and 35
  consecutive saves correctly keeping only the most recent 30 backups.
- **Not yet verified**: the actual Electron window opening and the app
  running inside it end-to-end, since Electron could not be downloaded in
  the environment this was built in. Please do a quick pass after your
  first build — create a job, add a few things, close Nucleus, reopen it,
  and confirm everything's still there — and let Claude know if anything
  looks off.

## Uninstalling / starting over

Uninstall Nucleus the normal Windows way (Settings → Apps). This removes
the program but **not** your data in `%APPDATA%\Nucleus` — delete that
folder yourself if you ever want a completely clean slate (back it up
first if you're not sure).
