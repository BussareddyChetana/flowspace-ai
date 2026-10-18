# FlowSpace AI

A Flask web app with two stateless modes:
- **Plan:** converts typed text or audio into a prioritized task plan.
- **Vent & Reflect:** gives a gentle reflection, optional reframe, and one small next step.
- Voice recording/audio upload, multilingual prompting, and exports to CSV, Markdown, calendar (.ics), and print/PDF.
- Responsive centered layout.

## Run on Windows (PowerShell)

1. Extract the ZIP and open PowerShell in the folder containing `app.py`.
2. Install dependencies:
   `py -m pip install -r requirements.txt`
3. Create `.env` by copying `.env.example`:
   `Copy-Item .env.example .env`
4. Open `.env` and paste your own Google AI Studio key. Keep it secret. Confirm the model name is enabled for your key.
5. Start:
   `py app.py`
6. Open http://127.0.0.1:5000

Stop with Ctrl+C.

## Troubleshooting
- If Python is not recognized, use `py` instead of `python`.
- If Gemini rejects the model, check the available model names in Google AI Studio and update `GEMINI_MODEL`.
- If quota is reached, wait and retry.
- If microphone access fails, allow microphone permission for localhost or upload a short supported audio file.
- The browser may record WebM audio; audio support varies by model. If it fails, test a WAV or MP3 file.

## Privacy and safety
The app has no conversation database and does not intentionally save chat text/audio to browser storage or disk. It sends current input to Google's Gemini API; provider retention/use is governed by Google's current terms. Do not promise complete confidentiality and avoid sharing sensitive details. Data may exist in memory during processing. Crisis detection is limited and cannot identify every risk or language; this is a reflection tool, not therapy or emergency care.

## Structure
`app.py`, `requirements.txt`, `.env.example`, `.gitignore`, `templates/index.html`, `static/style.css`, `static/app.js`.
