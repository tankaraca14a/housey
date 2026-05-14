# How to manage tankaraca.com

This is your complete guide to the Housey admin page. Every action you can take is here, with a screenshot of exactly what you'll see.

The admin page lives at **<https://www.tankaraca.com/admin>**. Bookmark it.

---

## 1. Logging in

Go to <https://www.tankaraca.com/admin> in any browser.

![Login screen](./admin-screenshots/01-login-empty.png)

Type your password (the same one you've been using), then click **Login**.

![Login filled](./admin-screenshots/02-login-filled.png)

> **Tip:** The page knows your language. There's a small **HR/EN** button in the top-right corner — click it to switch between Croatian and English at any time.

---

## 2. The admin page at a glance

Once you're logged in, you'll see one big page with three sections:

![Full admin overview](./admin-screenshots/03-overview-top.png)

1. **The Calendar at the top** — for blocking dates when you'll be using the house yourself.
2. **Images** — to upload and manage the photos on the public site.
3. **Bookings** (scroll down) — every reservation from guests, plus a way to add your own.

You can scroll the whole page — nothing is hidden behind buttons or menus.

---

## 3. Blocking dates on your own calendar

Use this when **you** are going to be at the house and don't want guests to book. The dates you mark stay blocked until you remove them.

![Calendar section](./admin-screenshots/05-calendar.png)

**To block a date:** click any future day. It turns red.

![Date clicked](./admin-screenshots/06-calendar-date-clicked.png)

**To unblock a date:** click a red day. It turns back to normal.

**You can mark multiple dates before saving.** Use the **← Previous** / **Next →** buttons to scroll through months — you can go as far into the future as you need.

When you're done, click the big **Save Changes** button at the top right. A green **"Changes saved!"** message confirms:

![Save confirmation](./admin-screenshots/07-calendar-save-confirmation.png)

> **What guests see:** Blocked dates show as strike-through with an "Unavailable" tooltip on the booking page. Guests cannot select them.

---

## 4. Guest bookings

Every reservation a guest submits through the website lands here, with status **Pending**. You decide what happens next.

![Bookings list](./admin-screenshots/08-bookings-list.png)

Each booking shows:
- **Guest name + status badge** (Pending / Confirmed / Declined)
- **Email** (clickable — opens your email app to reply)
- **Phone**
- **Check-in and check-out dates**
- **Number of guests**
- **Their message to you**
- **When they submitted it**

### 4.1 Confirming a booking

Every pending booking has these buttons on the right:

![Pending row close-up](./admin-screenshots/09-pending-row.png)

Click the green **✓ Confirm** button to accept the reservation.

You will see **two confirmation dialogs in a row** before anything actually happens — this is on purpose so you can't accidentally confirm:

1. *"Confirm this booking?"* → click **OK** to proceed
2. *"This will EMAIL the guest that their booking is CONFIRMED and block these dates: [guest name + dates]"* → click **OK** if you're sure

After both OKs, three things happen automatically:
- The booking status flips to **Confirmed** (green badge)
- The dates of the stay are added to your blocked calendar (so no other guest can book the same nights)
- An email is sent to the guest with their booking confirmation, including the check-in/check-out times and the property address

> **Important:** Once you click through both dialogs, the email goes out immediately and cannot be unsent. The two-dialog flow is your safety net.

### 4.2 Declining a booking

Same pattern, but click the red **✗ Decline** button:

1. *"Decline this booking?"* → **OK**
2. *"This will EMAIL the guest that their booking is declined: [guest name + dates]"* → **OK**

The status changes to **Declined** and the guest receives a polite "we can't accommodate you, please try different dates" email.

> Declined bookings stay in the list (so you have a record), but they don't reserve the calendar — someone else can book the same dates.

### 4.3 Editing booking details

Sometimes you need to fix a typo, shift the dates after a phone conversation, or update the guest's message. Click the **✎ Edit** button on any row.

A form appears with every field editable:

![Edit panel](./admin-screenshots/12-edit-panel.png)

Change anything — name, email, phone, dates, guest count, status, or the message — then click **Save**.

> **Undo:** After saving, a small toast appears at the bottom-right corner with an **Undo** button. You have **10 seconds** to click it if you saved by mistake — the booking will revert to exactly how it was. After 10 seconds, the change is permanent.

### 4.4 Changing status freely

Each row also has a small status dropdown:

![Status dropdown](./admin-screenshots/11-status-select-focused.png)

You can switch any booking between Pending / Confirmed / Declined in **any direction** — for example, if you accidentally confirmed and want to switch it back to pending.

> **Difference vs the Confirm button:** This dropdown only changes the status. It does NOT send any email and does NOT touch the blocked calendar. Use it for corrections; use the green Confirm button when you actually want to notify the guest.

### 4.5 Adding a manual booking (phone reservations)

When someone calls or texts to book, click the **+ Add booking** button at the top of the bookings section.

![Add booking](./admin-screenshots/13-add-booking-empty.png)

Fill in everything you know, pick a starting status (Pending if you want to confirm later, Confirmed if it's already a sure thing), click **Save**.

> Manual bookings don't trigger the confirmation email. If you want the guest to get one anyway, email them yourself or change the status to Pending and then click the green **✓ Confirm** button.

### 4.6 Deleting a booking

The 🗑 **Delete** button is on every row, no matter the status. It's protected by **two confirmations AND a 10-second undo**:

1. *"Delete this booking?"* → **OK**
2. *"Are you sure you want to permanently delete the booking for: [guest name + dates]"* → **OK**

The row immediately disappears from the list, AND a toast appears at the bottom-right with a countdown and an **Undo** button:

![Delete undo toast](./admin-screenshots/14-delete-toast.png)

- **Click Undo within 10 seconds** → the booking comes back, exactly as it was. No email, no permanent change.
- **Wait 10 seconds** → the booking is permanently removed.

> **Important quirk:** If the booking was Confirmed, deleting it does NOT free up the calendar dates automatically. This is a safety feature so a misclick can't accidentally re-open a paying guest's nights. To free the dates: click them off in the calendar at the top of the page and Save Changes.

---

## 5. Photos

Photos uploaded here automatically appear on your public **/gallery** page within seconds. No code change, no waiting on a developer.

![Images section](./admin-screenshots/15-images-grid.png)

### 5.1 Uploading photos

Click the blue **+ Upload** button.

![Upload button](./admin-screenshots/17-upload-button.png)

A file picker opens. You can:
- Pick **one photo or many** at once (hold Cmd/Ctrl while clicking)
- Upload **JPEG, PNG, WebP, or HEIC** (HEIC is what iPhones produce — it gets converted to JPEG automatically in your browser, you don't have to do anything)
- Files up to **12 MB each** are accepted

A counter appears showing "uploading N..." while photos transfer. When the count reaches 0, your photos are live.

### 5.2 Featuring photos

Hover over any photo to reveal its action buttons:

![Image hover actions](./admin-screenshots/16-image-hover-actions.png)

Click **★ Feature** to mark it. Featured photos get a yellow ★ FEATURED badge:

> **Note about featured photos:** The gallery currently shows the first 3 featured photos in a hero layout, and the rest in the main grid. If you have many featured photos, only the first 3 get the hero treatment.

Click **Unstar** to unfeature.

### 5.3 Deleting photos

Click the 🗑 trash button on any photo. You'll see two confirmations:

1. *"Delete this image?"* → **OK**
2. *"This cannot be undone. Really delete?"* → **OK**

The photo is permanently removed from both your gallery and the storage. **Unlike booking deletes, photo deletes do not have an undo window** — once you click through both dialogs, the photo's bytes are gone. Be sure before clicking.

---

## 6. Switching language

The small button in the top-right corner toggles between Croatian and English. The current language label is shown:

- Button says **EN** → site is currently in HR; click to switch to English
- Button says **HR** → site is currently in EN; click to switch to Croatian

![HR mode](./admin-screenshots/18-hr-mode-top.png)

Everything — calendar labels, button text, status badges, confirmation dialogs — adapts to the chosen language.

![HR mode bookings](./admin-screenshots/19-hr-mode-bookings.png)

---

## 7. Logging out

Click the **Logout** button (top right).

![Logged out](./admin-screenshots/20-logged-out.png)

This wipes your password from the browser's memory. Useful if you're on a shared computer.

> **Closing the browser tab** also logs you out — your password is never stored to disk.

---

## 8. What to do if something goes wrong

### "I confirmed the wrong booking and the email already went out"

- The guest will already have received the confirmation email — you can't unsend it.
- Email them directly from your own inbox (mailto link is on the booking row) and explain.
- Use the **status dropdown** to switch the booking back to Pending or Declined.
- The dates that auto-blocked when you confirmed will still be blocked — click them off the calendar at the top and Save Changes.

### "I declined the wrong one"

- Email the guest directly to apologize.
- Use the status dropdown to switch them back to Pending.

### "I deleted a booking by mistake"

- **Within 10 seconds:** click the **Undo** button in the toast at the bottom-right.
- **After 10 seconds:** the booking is gone. Ask the guest to resubmit via the website, or use **+ Add booking** to recreate it from email/notes.

### "I accidentally blocked the wrong date"

- Click the red date on the calendar again — it turns transparent.
- Click **Save Changes**. That's all.

### "I uploaded the wrong photo"

- Hover the photo, click 🗑, click through both confirmations.
- Photo is gone immediately.

### "The page won't load / something looks broken"

- Refresh the page (Cmd/Ctrl + R).
- If you're logged out after refresh, log in again — your in-progress edits will be lost but your saved data is fine.
- If a button does nothing when clicked, wait 5 seconds — the server might be slow.
- If something keeps failing, write down what happened (which button, what you saw) and the time, and message Mihaela.

### "A guest says they didn't get a confirmation email"

- Check the booking's status badge — if it's still **Pending**, you never clicked Confirm (only Confirm sends the email; the status dropdown doesn't).
- If status is **Confirmed**, the email was sent. Ask the guest to check their spam folder. The email comes from `noreply@tankaraca.com`.

---

## What the system protects you from

You don't need to remember these — the admin page enforces them automatically:

- **Double-bookings:** If two guests submit overlapping dates, the second one is rejected with a clear error. They never both land as pending.
- **Misclicks on destructive actions:** Confirm, Decline, and Delete each require two clicks through confirmation dialogs.
- **Permanent loss from a fumble:** Delete has a 10-second undo. Edit has a 10-second undo (after Save).
- **Lost reservations from a Resend hiccup:** Bookings save to the database BEFORE the email goes out. If email fails for any reason, the booking is still there and you see it in the list.

---

## What's not in this guide (yet)

These exist on the backlog as GitHub issues — none of them block you from running things today:

- **Instagram / Facebook links** ([#2](https://github.com/tankaraca14a/housey/issues/2)) — once you create the accounts, ping Mihaela with the URLs.
- **More featured photos visible at once** ([#7](https://github.com/tankaraca14a/housey/issues/7)) — currently only the first 3 featured photos get the hero spots.

---

*Last updated: this document and its screenshots were regenerated by running `node scripts/generate-admin-guide-screenshots.mjs` against a local copy of the housey admin page. If anything ever looks different from what's pictured here, the page itself is the source of truth.*
