# Deploying to Google Cloud Run

The app ships with a `Dockerfile`, so Cloud Run can build it straight from this GitHub repo.

## One-time setup

1. Open the Google Cloud console for the app's Firebase project
   (https://console.cloud.google.com, project `utopian-elysium-m6pck`) and make sure billing is enabled.
2. Go to **Cloud Run → Deploy container → Service → Continuously deploy from a repository**.
   Connect GitHub, choose `sean-tje/helpful-hillgrover`, branch `main`, build type **Dockerfile**.
3. Settings:
   - **Region:** `asia-southeast1 (Singapore)`
   - **Authentication:** Allow public access
   - **Billing:** Request-based
   - **Minimum instances:** 0. **Maximum instances:** 1 (the server keeps data in memory; one instance keeps every user in sync)
4. Under **Variables & Secrets**, add `KEY_ENCRYPTION_SECRET` (a long random password; never change it).
   `ANTHROPIC_API_KEY` is optional: committee members can add keys in the AI Settings tab instead.
5. Under **Security**, note the **service account** (usually `…-compute@developer.gserviceaccount.com`).
   In **IAM & Admin → IAM**, make sure it has the **Cloud Datastore User** role so it can use the database.
6. Click **Create**. Every push to `main` now redeploys automatically.

On Cloud Run the server signs in to Firestore automatically, so `FIREBASE_SERVICE_ACCOUNT` is not needed.
The logs should show `Database: using Firebase Admin (secure mode).`

## Then close the database to browsers

Only after the app works on Cloud Run: Firebase console → **Firestore Database** → choose the
`ai-studio-basecamp-…` database → **Rules** → paste the contents of `firestore.rules` → **Publish**.

## Using a different Firebase project

Set `FIREBASE_PROJECT_ID` and `FIRESTORE_DATABASE_ID` (leave empty for the `(default)` database)
on the Cloud Run service. The app fills an empty database with its starter data on first load.
