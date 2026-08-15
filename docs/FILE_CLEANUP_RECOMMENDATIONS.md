# File Cleanup Recommendations

This document is intentionally advisory. Nothing here requires deletion now. The goal is to identify likely candidates for future cleanup while preserving the current live application.

## 1. /pickupold.html

Why it appears unnecessary:

- It is a legacy pickup page and not the active workflow used by the current app.

Safe to remove?

- Possibly, but only after verifying no active route or internal reference still points to it.

What depends on it:

- Unknown from the current repo scan.

Recommended action:

- Keep for now; review in a future cleanup pass only after route usage and documentation are checked.

## 2. /assistant.html

Why it appears unnecessary:

- It appears to be an alternate assistant/portal surface rather than the current main portal shell.

Safe to remove?

- Possibly, but route references and old workflows should be checked first.

What depends on it:

- Unknown.

Recommended action:

- Keep for now; treat as historical or alternate UI until a deliberate cleanup pass is approved.

## 3. /login.html

Why it appears unnecessary:

- The app uses /client-login.html as the active customer login route, and there are multiple alternate login shells in the repo.

Safe to remove?

- Probably not without confirming all references and user flows.

What depends on it:

- Unknown.

Recommended action:

- Keep unless there is a documented migration replacing it.

## 4. /backup_pre_reorg

Why it appears unnecessary:

- It is a historical folder containing prior versions of pages and Avery files.

Safe to remove?

- Likely safe only after ensuring it is intentionally archived and no product references still depend on it.

What depends on it:

- No active runtime code is expected to depend on it.

Recommended action:

- Leave intact as a historical backup; archive or remove later with project-owner approval.

## 5. /Coding projects

Why it appears unnecessary:

- It looks like a miscellaneous workspace folder or old development area rather than the active application layer.

Safe to remove?

- Possibly yes, but only after confirming there are no links or active references.

What depends on it:

- Unknown.

Recommended action:

- Keep in the current repo and review later if a formal cleanup initiative is approved.

## 6. /supabase/.temp

Why it appears unnecessary:

- It appears to be a local metadata/temp folder used by tooling rather than application code.

Safe to remove?

- Likely safe to remove from a developer workspace, but not necessarily from version control if tool metadata is intentionally tracked.

What depends on it:

- It may be used by the local Supabase tooling environment.

Recommended action:

- Leave it alone unless a developer deliberately wants to clean local tool cache files.

## 7. /Avery/prompts.js

Why it appears unnecessary:

- The file exists but is empty.

Safe to remove?

- Likely safe to remove, but the current project may still rely on it for future prompt storage or as a placeholder.

What depends on it:

- No direct runtime dependency is evident from the current code scan.

Recommended action:

- Keep it as a placeholder for now; remove later only if the project intentionally no longer uses prompt files in the browser layer.

## 8. Duplicate root-level redirect pages

Why they appear unnecessary:

- Several root-level pages such as /quote.html and /pickup.html exist as shallow redirects to /pages variants.

Safe to remove?

- Usually safe to keep because they provide a backward-compatible route and reduce broken links.

What depends on it:

- Some older bookmarks or links may still rely on them.

Recommended action:

- Keep them unless the app intentionally standardizes on the /pages route only.

## 9. Legacy business data and ad hoc scripts

Why they appear unnecessary:

- Files such as /business-data.js may have been used during earlier prototypes or local development.

Safe to remove?

- Possibly, but only after confirming no current page includes or depends on them.

What depends on it:

- Unknown.

Recommended action:

- Keep for now; review with the project owner before removal.

## 10. Unclear files in the repository root

Why they appear uncertain:

- Some files are likely historical, prototype, or alternate UI surfaces.

Safe to remove?

- Not without stronger evidence.

What depends on it:

- Unknown.

Recommended action:

- Leave them in place and document them as historical artifacts until a deliberate reorganization is approved.

## Summary

The repository has several likely historical or development-only files, but no clear evidence indicates that any of them are currently serving a critical runtime function. The safe path is to leave them where they are for now and only perform cleanup later with explicit approval and route verification.
