# CIEL by DSR — Official Landing Page & Web Experience

> Cloned, modularized, and configured from [https://www.cielbydsr.com/](https://www.cielbydsr.com/) for local development and offline preview.

---

## 📌 Project Overview

**CIEL by DSR** is a luxury residential development featuring:
- **1,140 Luxury 3 BHK Residences** across **6 towers of 38 floors**
- **7 Acres of Land** in Gopanpally, Financial District, Hyderabad
- **67 Amenities** (32 across grounds, 35 in a 60,000 sq ft social clubhouse)
- **70% Open Landscape** featuring a central Zen Garden
- **Possession Year:** 2030 | **RERA ID:** `P02400010929`

---

## 🚀 How to Run Locally

You have multiple zero-setup options to run and preview the site:

### Option 1: Node.js Server (Recommended)
This starts a local server that serves all assets (with video streaming support) and captures form leads into `leads.json`:
```bash
npm start
# or
node server.js
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser.

### Option 2: Python Server
If you prefer Python:
```bash
python server.py
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser.

### Option 3: Deploy to Vercel (Production)
You can deploy this project directly to Vercel with zero extra configuration:
1. Push this folder to a GitHub repository.
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your repository and click **"Deploy"**.
*(The included `api/lead.js` and `vercel.json` will automatically handle the lead capture backend and global CDN asset caching on Vercel).*

### Option 4: Direct Browser File
You can also directly double-click `index.html` to open it in your browser. All images, stylesheets, scripts, and media are linked locally.


---

## 📂 Modular Code Structure

The project has been separated into clean, modular code files:

```text
DSR/
├── index.html                   # Clean HTML5 markup referencing external CSS & JS
├── index.standalone.html        # Original all-in-one single-file version (backup)
├── css/
│   └── style.css                # Extracted stylesheet (typography, layout, responsive design)
├── js/
│   ├── analytics.js             # GA4, Microsoft Clarity, attention & attribution tracking
│   ├── lead.js                  # Lead validation, honeypot filter, and /api/lead submission
│   └── main.js                  # GSAP animations, 360 viewer, floorplans, modals, FAQ
├── assets/                      # 71 local media assets (images, renders, floor plans, videos)
│   ├── ClubHouse/               # Clubhouse interactive tour MP4 videos (games, lounge, etc.)
│   ├── Sample Apartment/        # Interior room renders (Living, Dining, Kitchen, Beds, Balcony)
│   ├── construction/            # Construction progress photos and update video
│   ├── floorplans/              # Unit floorplans (1905, 2205, 2420, 2800 sq ft)
│   ├── gallery/                 # High-resolution architectural renders & amenities
│   ├── hero/                    # Hero video loops and high-res poster frames
│   ├── logos/                   # DSR, CIEL brand logos, and favicon
│   ├── masterplan/              # Day masterplan render
│   └── renders/                 # Terrace bar, zen garden, clubhouse interior, pool, etc.
├── server.js                    # Node.js server with video streaming & /api/lead capture
├── server.py                    # Python HTTP server with /api/lead capture
├── package.json                 # npm configuration and scripts
├── leads.json                   # Stores submitted form leads locally (created on first submission)
└── README.md                    # Project documentation
```

---

## 🎯 Key Features & Interactive Sections

1. **Pinned Hero Experience**:
   - High-definition video background carousel with poster fallbacks
   - Floating CTA rail (WhatsApp, Brochure, Call, Quick Form)
   - Dynamic counter milestones

2. **Interactive Masterplan**:
   - Visual map of the 7-acre development with interactive hotspot indicators

3. **Clubhouse & Amenities**:
   - 360-degree interactive tour players with smooth crossfading video feeds
   - Filterable categories: Social, Active, Wellness, Kids

4. **Residences & Floor Plans**:
   - Unit size toggle: 1,905 sq.ft, 2,205 sq.ft, 2,420 sq.ft, 2,800 sq.ft
   - Facing switch: East Facing & West Facing floor plan renders

5. **Sample Apartment Walkthrough**:
   - Interactive room selector: Living Room, Master Bedroom, Balcony, Kitchen, Dining, Guest Room

6. **Webverse & 3D Walkthrough**:
   - Embedded virtual tour triggers for 3D exploration

7. **Gallery & Lightbox**:
   - High-res photo gallery with night facade, arrival court, preview theatre, and skyline view

8. **Location & Connectivity**:
   - Distance matrix to Wipro Circle, Gachibowli, ORR, Hyderabad International Airport, etc.

9. **Construction Updates**:
   - On-site progress video and monthly status snapshots

10. **Lead Capture & CRM**:
    - Embedded brochure download modals, inline enquiry inputs, and visit scheduling forms
    - Honeypot bot protection & Indian mobile number validation (`+91` / 10-digit check)
    - Submissions route to `/api/lead` and append cleanly to `leads.json`

---

## ⚙️ Customization & Configuration

- **Styles:** Modify [`css/style.css`](file:///c:/Users/AVINASH/OneDrive/Desktop/DSR/css/style.css) for branding colors, typography, or spacing.
- **Interactions:** Modify [`js/main.js`](file:///c:/Users/AVINASH/OneDrive/Desktop/DSR/js/main.js) for animations, carousel timings, or UI behavior.
- **Leads & Validation:** Modify [`js/lead.js`](file:///c:/Users/AVINASH/OneDrive/Desktop/DSR/js/lead.js) to connect to your live CRM or backend.
- **Analytics:** Configure your Google Analytics 4 (`ga4`) or Microsoft Clarity (`clarity`) IDs in [`js/analytics.js`](file:///c:/Users/AVINASH/OneDrive/Desktop/DSR/js/analytics.js).
