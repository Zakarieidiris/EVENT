# Somaliland Event QR System

A minimal two-page QR code system for event entrance validation.
No server required — runs fully in the browser.

---

## Files

```
somaliland-event-qr/
├── generate.html        ← Create the event QR code
└── admin/
    └── scan.html        ← Admin scanner for entrance
```

---

## How To Use

### 1. Generate the QR Code
- Open `generate.html` in any browser
- Fill in event name, date, time, venue, organizer
- Set a **secret key** (remember this — the admin needs it)
- Click **Generate QR Code**
- Print or save the QR code

### 2. Admin Scanning at Entrance
- Open `admin/scan.html` on a phone or tablet
- Enter the same **secret key** used during generation
- Click **Start Camera** and point at the QR code
- A green screen = ✓ Valid Entry
- A red screen = ✗ Invalid / Wrong QR

---

## Notes
- No internet needed after first load (fonts/libs load once)
- The secret key is what makes the QR tamper-proof
- One QR code is generated per event — share it with attendees
- The admin scanner works on any device with a camera
- You can also paste the token manually if camera isn't available

---

Built for Somaliland events · Minimal · Offline-capable
