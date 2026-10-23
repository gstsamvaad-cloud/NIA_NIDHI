# NIA_NIDHI

Case management, litigation monitoring and legal reference app. Installable on phones as a web app (PWA) and hosted free on GitHub Pages.

## Publish
1. Create a repository (e.g. `NIA_NIDHI`) and upload everything in this folder, including the hidden `.github` folder, to the `main` branch.
2. Repository **Settings > Pages > Build and deployment > Source: GitHub Actions**.
3. The workflow runs on each push. Your app opens at `https://<your-username>.github.io/<repo-name>/`.

## Install on a phone
- **Android (Chrome):** open the link, menu > *Install app* / *Add to Home screen*.
- **iPhone (Safari):** open the link, Share > *Add to Home Screen*.

## Releasing updates
Edit `index.html`, change `VERSION` in `sw.js` (e.g. `nia-nidhi-v2`), commit. Installed apps refresh on next open.

## Data and security
- Data entered is stored in the browser on each device, not in the repository.
- A public repository and its Pages site are visible to anyone. Do not commit real case data, and do not enter sensitive investigation or accused-person data until a server, access control and security approval are in place.
