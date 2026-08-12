# Smart College Queue Management System

QueueMate is a frontend prototype for a smart college queue management system.

## Features
- Student registration and login
- Service selection
- Digital token generation
- Queue status
- Estimated waiting time
- Leave queue
- Token history
- Admin dashboard
- Live queue
- Call next token
- Service management
- LocalStorage persistence
- QR code access for students

## QR Code Access
The Student App includes a **Scan to Use the App** section.

1. Deploy the extracted project to a public HTTPS/static hosting service.
2. Open the deployed app URL.
3. In the QR section, enter the public app URL.
4. Click **Update QR Code**.
5. Print or display the generated QR code at the college.
6. Students scan it with their phone camera and open the app.

The QR code uses the public URL you enter, so it is ready to be used after deployment.

## Run
1. Extract the ZIP.
2. Open `index.html` in Chrome/Edge for a local demo.
3. Register a student account.
4. Login and select a service to generate a token.
5. Open **Admin Dashboard** to manage the queue.

## Notes
This is a frontend prototype. Student accounts and queue data are stored in browser LocalStorage, so this is suitable for a demo/prototype rather than production authentication or multi-device synchronization.

The QR generator library is loaded from a CDN, so the QR section needs an internet connection when the page is loaded.
