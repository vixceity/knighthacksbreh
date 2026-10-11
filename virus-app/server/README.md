# Schedule screenshot import

From `virus-app`, copy `server/.env.example` to `server/.env` and set `GEMINI_API_KEY` in that file. Never put that key in an EXPO_PUBLIC variable. Create a Gemini API key in Google AI Studio and ensure your project has available quota.

Run `npm.cmd run schedule-server` in one terminal and `npm.cmd run web` in another. On Home choose a screenshot, review each extracted class, add its building coordinates, and save it. Existing classes are preserved. You can skip classes or discard the remaining import. Nothing is saved until you choose Save class.

For a phone on your local network, set `SCHEDULE_HOST=0.0.0.0` in `server/.env`, copy `.env.example` to `.env`, and set `EXPO_PUBLIC_SCHEDULE_API_URL=http://YOUR_COMPUTER_LAN_IP:3001`. Restart both processes. Allow the local server through your firewall if needed. For a different web port, add its exact origin to `SCHEDULE_ALLOWED_ORIGINS`.

This server is for local development. Do not expose it publicly without authentication and per-user rate limits. It accepts one import at a time, limits upload size, and times out upstream requests. Screenshots are sent to Google Gemini using the generateContent API; the local server does not write them to disk or log their content. Review AI output carefully, especially calendar grids. It does not infer GPS coordinates from room names.

Implementation references: https://ai.google.dev/gemini-api/docs/image-understanding and https://ai.google.dev/gemini-api/docs/structured-output.

Automatic building coordinates: Gemini extracts campus clues and building names from the screenshot. Set GOOGLE_MAPS_API_KEY in server/.env to a server key with Places API (New) enabled and billing configured. Building names are looked up with Google Places Text Search. Ambiguous or unavailable matches remain blank. Users must review the suggested location in Google Maps and confirm it before saving. The Gemini key alone does not enable Places lookups.

When a plan or screenshot omits the college, it defaults to UCF Main Campus. Explicit colleges are preserved.
