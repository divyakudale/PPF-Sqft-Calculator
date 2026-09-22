# PPF Sqft Calculator

A standalone calculator for working out how much PPF (paint protection film)
a vehicle needs — Simple (4-panel) and Detailed (itemised) modes, unit
conversion (mm/cm/m/inch/ft), and a saved-vehicles list sorted A→Z.

Three files, no build step, no dependencies:
- `index.html`
- `style.css`
- `script.js`

## Run it locally
Just open `index.html` in a browser — that's it.

## Publish on GitHub Pages
1. Create a new repository on GitHub (e.g. `ppf-calculator`).
2. Add these three files to the repo (drag-and-drop on github.com works,
   or `git add . && git commit -m "PPF calculator" && git push`).
3. In the repo, go to **Settings → Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a branch**.
5. Pick the `main` branch and `/ (root)` folder, then **Save**.
6. GitHub gives you a live URL after a minute or two, usually:
   `https://<your-username>.github.io/<repo-name>/`
   Share that link with anyone — no login required to use the calculator.

## Note on saved vehicles
Saved vehicles are stored in the visitor's own browser (`localStorage`) —
private to each device/browser, not shared between visitors or synced
across devices. If you later want everyone who opens the page to see the
same shared list (or want it to follow one person across their own
devices), that needs a small backend or a service like Firebase/Supabase
to hold the data — happy to help wire that up if you want it.
