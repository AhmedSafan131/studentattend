# Attendance roster selection

An optional input method beside Excel and manual ID entry. It is disabled by default and uses the existing `system_settings` table; no database migration is required.

## Enable

In the admin dashboard, open Settings → Attendance roster (الإعدادات ← قائمة طلاب الحضور). Enable the feature, choose dashboard and/or flexible attendance, then choose all doctors or specific doctor accounts and save. Saving requires the same admin permission used for student access settings: system admin, `manage_permissions`, or `full_dashboard_access`.

The doctor dashboard and staff flexible-attendance page use three tabs with the original card layouts. Manage session always shows the attendance and manual-entry cards, initially empty with entry disabled until a session is selected or created; choosing matching faculty/subject/type/group/week details automatically loads the saved session and its students in management. Choosing details with no matching session clears the previous roster. Staff can start a new session or explicitly reopen the selected closed session; viewing it does not reopen it. Bulk attendance selects an existing target session through cascading faculty (where available), subject, class type, group and week dropdowns before Excel and the optional roster method. Only existing non-migrated sessions appear; changing any detail clears dependent choices and the target until the selection is complete. These choices are independent of session management. If several sessions share the same details, staff explicitly choose the matching session. My sessions opens only the chosen session's attendance at full width in the same tab, with a Back to my sessions button; manual entry, QR and close/reopen controls remain in management. Each tab retains its selected target independently; returning to Manage session restores the session matching its form details. The flexible QR panel uses the session matching the management form independently of the history/bulk selection, so browsing saved sessions does not request their QR tokens. There is no separate selected-session card or automatic navigation to management. Shared attendance inputs and QR remain mounted once to avoid duplicate polling and preserve drafts.

Doctors choose “Bulk attendance” → “Student roster” → “Select from student roster”. The roster loads 50 students per page, supports name/university/national ID search, preserves selections across pages, and marks existing attendance. “Select search results” selects up to 500 eligible students, excluding those already present. Saving requires confirmation and sends batches of 100. Completed batches are removed from selection; unfinished rows remain available for retry. A new session or term starts a new selection. Excel remains available when the roster feature is disabled.

## Rules

- Dashboard: current-term subject, type and group registration, or subject registration when the session allows all groups. The existing manual attendance writer applies its weekly duplicate rule.
- Flexible: current-term subject registration, across types/groups. The existing flexible writer creates both the flexible record and its linked official attendance. Existing manual ID and Excel behavior remains available for students outside the roster.
- Both reads and writes enforce the feature switch, selected accounts, selected mode, session ownership and term on the server. Migrated flexible sessions cannot be edited. Existing historical-term write protection still applies.
- Disabling the feature does not delete attendance, change reports, or disable Excel/manual entry. Existing sessions refresh feature availability when the window regains focus; every roster request checks the current setting.

## Verification

Backend feature tests cover admin permissions, account/mode/owner/term restrictions, registration rechecks, all-group sessions, pagination, partial failures, retries, weekly duplicates, official flexible synchronization and matching report rows for manual and roster attendance.

Frontend tests cover feature visibility, pagination and retained choices, confirmation, existing attendance, term changes, cancellation, batch retry after connection failure, and admin settings.

Run from the respective project directories:

```text
php vendor/bin/phpunit
npm test -- --watchAll=false --runInBand
npm run build
```

Automated database tests use isolated in-memory SQLite, not the application's configured production database. These checks do not substitute for a deployment smoke test on the target database and browser.

See [the 2026-10-19 verification report](attendance-audit-2026-10-19.md) for browser scenarios, fixes found during the audit, evidence, remaining drawbacks and test limits. Flexible leave-page handling follows the session explicitly created/reopened during the visit, independently of the history or bulk-upload target.
