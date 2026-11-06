# ParcelDesk — Campus Courier Prototype

A clean, responsive front-end prototype for the CSE326 campus parcel collection problem statement.

## Run the project
1. Extract the ZIP file.
2. Open the `Campus_Courier_Prototype` folder in VS Code.
3. Open `index.html` in a browser, or use the VS Code Live Server extension.
4. Sample data is loaded automatically on first run.

No npm install, build process, API key, or backend is required.

## Included features
- Overview dashboard with live counts and collection progress
- Receive parcel form with validation for Students, Faculty, Staff and Other recipients
- All 15 numbered hostel choices: BH-01 to BH-08 and GH-01 to GH-07, plus Boys Apartment
- Faculty/staff destination fields for department, office, block or other campus location
- Automatic parcel ID and unique pending pickup token
- Student lookup by roll number
- Pickup verification and delivery status update
- Parcel history with search, status filter, and sorting
- CSV export
- Printable collection receipt
- Dark mode
- Responsive mobile layout
- LocalStorage persistence
- Reset sample data option

## Demo data
Use student roll number `12345678` in Recipient Lookup.
Sample parcel ID `PKG-1001` has pickup token `4826` for the verification demo.

## Important limitations
Hostel dropdowns use the numbered 8-boys / 7-girls structure published by LPU. Confirm the currently active labels and any renaming with Residential Services before a real deployment. The public LPU material confirms 15 hostels (8 boys and 7 girls), while an older official annual report lists the numbered BH-01…BH-08 and GH-01…GH-07 names. See the official [LPU residential facilities page](https://www.lpu.in/student-services/residence.php) and [LPU accommodation information](https://www.lpu.in/SUSTAINABLE/sdg11/residential-facility.php).

This is an educational front-end prototype. LocalStorage is stored separately in each browser/device and is not a shared database. There is no real authentication, SMS/email notification, server-side authorization, or multi-device synchronization. Do not use real student personal data or real parcel credentials in this demo.

For a real deployment, add a backend, database, authenticated role-based access, server-side token verification, audit logs, and privacy/security review.
