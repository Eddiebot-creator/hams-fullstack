# HAMS Web App Fixes Applied

## Fixed issues

1. Role-safe global search and quick launcher
- Admin now only sees admin quick actions.
- Laundry now only sees laundry quick actions.
- Kitchen now only sees kitchen quick actions.
- Student now only sees student quick actions.
- Clicking a search result no longer sends laundry/kitchen users into admin-only pages.

2. Login role enforcement
- The selected login card is now enforced.
- Example: a laundry account cannot log in through the admin/student/kitchen card.
- Backend also blocks mismatched role login attempts.

3. Laundry basket filter/dropdown issue
- Removed the clipping problem around the filter dropdown.
- Added direct per-basket status changing from the Manage Baskets table/cards.
- Users no longer need to reset to All statuses just to change basket statuses.

4. Laundry dashboard time readability
- Activity time is now formatted into a clearer readable date/time.
- Activity text has stronger contrast.

5. Color visibility
- Added additional contrast fixes for dark mode and status labels.
- Improved readability of dropdowns, timestamps, and status text.

6. Admin meal management
- Rebuilt admin meal page into a Monday-Friday schedule.
- Admin can add/edit meals by weekday.
- Meals are grouped neatly by weekday.
- Added day filter, status filter, and search.
- Backend meals table now supports a weekday column.
- Existing databases auto-migrate by adding weekday with default Monday.

## Validation done

- Frontend production build passed with `npm run build`.
- Backend Python syntax check passed with `python3 -m py_compile server/app.py`.

## Important note

If you already have a deployed database, restart the backend after uploading this version. The app will auto-add the new `weekday` column for meals during startup/repair.
