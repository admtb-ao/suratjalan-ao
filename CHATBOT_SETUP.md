# suratjalan-ao

Admin AO Portal — deployed on Vercel.

## Gemini chatbot setup

The floating assistant is available on the main portal and Address Label page. It uses the serverless function at `/api/chat`; the Gemini API key is never sent to the browser.

1. Open the Vercel project connected to this repository.
2. Go to **Settings → Environment Variables**.
3. Add `GEMINI_API_KEY` with your Gemini API key as the value.
4. Enable it for Production (and Preview/Development if needed), then redeploy.

The API currently uses model ID `gemini-3.1-flash-lite-preview`. If that model is not enabled for your Google AI project, update `GEMINI_MODEL` in `api/chat.js` to the exact model ID available in your Gemini API account.

## What the chatbot can answer

- Explain the existing portal features.
- Search records returned by the existing Google Apps Script sources for Surat Jalan AO, Surat Pengantar GME, address labels, and Memo.
- It only returns matching records from a live search; it should not guess when a match is not found.

## Notes

- This is a read-only Q&A/search assistant; it does not create, update, or delete records.
- The chatbot can only search data exposed by the configured Apps Script endpoints. It does not automatically read every private file, every page, or the contents of PDFs stored in the repository.
- The current login is implemented in client-side HTML. Do not treat it as strong authorization for sensitive data. Before exposing sensitive records to a wider audience, move authentication/authorization to a trusted server and add server-side access checks and rate limiting.
