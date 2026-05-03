# Manual Test Checklist - ReloadPilot

Use this checklist before packaging or publishing ReloadPilot.

## Setup

- [ ] Load the extension temporarily in Firefox.
- [ ] Pin ReloadPilot to the toolbar.
- [ ] Open at least two normal `https://` pages.

## Current Tab

- [ ] Open the popup on a normal web page.
- [ ] Confirm the Current tab shows domain and truncated URL.
- [ ] Set interval to `5 Sec`.
- [ ] Click `Start Reloading`.
- [ ] Confirm state pill changes to `Active`.
- [ ] Confirm popup countdown starts.
- [ ] Confirm toolbar badge shows `5`, `4`, `3`, `2`, `1` before reload.
- [ ] Confirm the page reloads.
- [ ] Confirm popup countdown resets after reload if popup remains open.
- [ ] Click `Stop Reloading`.
- [ ] Confirm state pill changes to `Idle`.

## Bulk Add

- [ ] Open Bulk tab.
- [ ] Enter mixed lines: one valid `https://`, one valid `http://`, one `example.com`, and one `ftp://`.
- [ ] Confirm feedback shows valid and invalid counts.
- [ ] Confirm invalid preview lists the bad entries.
- [ ] Confirm `Add All URLs` is disabled when no valid URL is present.
- [ ] Add valid URLs.
- [ ] Confirm invalid lines stay in the textarea.
- [ ] Confirm valid URLs appear in Managed.

## Managed URLs

- [ ] Open Managed tab.
- [ ] Confirm each row shows domain, URL, interval, Edit, and delete.
- [ ] Click `Edit`.
- [ ] Change interval and click `Save`.
- [ ] Confirm the interval badge updates.
- [ ] If the edited URL is open in a tab, confirm its countdown uses the new interval.
- [ ] Click delete on one URL.
- [ ] Confirm the URL is removed.

## Pause All

- [ ] Add at least one active URL.
- [ ] Click `Pause All`.
- [ ] Confirm state pill changes to `Paused`.
- [ ] Confirm countdown disappears.
- [ ] Confirm toolbar badge clears.
- [ ] Wait longer than the interval and confirm the page does not reload.
- [ ] Click `Resume All`.
- [ ] Confirm timers resume.

## Options/About

- [ ] Open ReloadPilot options page.
- [ ] Confirm version and privacy copy are visible.
- [ ] Export managed URLs as JSON.
- [ ] Import the exported JSON.
- [ ] Confirm import merges URLs and updates managed count.
- [ ] Try importing invalid JSON and confirm an error message appears.

## Persistence

- [ ] Close and reopen Firefox.
- [ ] Confirm managed URLs persist.
- [ ] Confirm matching tabs resume when opened.
- [ ] Confirm Pause All state persists if left paused.

