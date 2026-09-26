// AI Receptionist — Step 1: "Hello World" call
//
// What this does:
//   Twilio calls this webhook whenever someone dials your number.
//   We respond with TwiML (Twilio's call-control markup) telling Twilio
//   to speak a fixed sentence back to the caller, then hang up.
//
// This proves the wiring works end-to-end:
//   caller -> Twilio number -> this server -> TwiML response -> Twilio speaks it
//
// Nothing here is AI yet — that comes in Step 2 (speech-to-text) and
// Step 3 (the LLM brain). This step is purely "can a call reach my server
// and can my server control the call."

const express = require("express");
const { twiml } = require("twilio");
const app = express();

// Twilio sends webhook data as URL-encoded form data (not JSON)
app.use(express.urlencoded({ extended: false }));

// Simple health check — visit this URL in a browser to confirm the
// server is live once deployed (e.g. https://your-app.up.railway.app/)
app.get("/", (req, res) => {
  res.send("AI Receptionist server is running.");
});

// This is the webhook URL you'll paste into your Twilio phone number's
// configuration under "Voice Configuration" -> "A call comes in".
// Path: /voice/inbound
app.post("/voice/inbound", (req, res) => {
  console.log("Incoming call event:", JSON.stringify(req.body, null, 2));

  // TwiML is XML. <Say> converts text to speech using Twilio's built-in
  // TTS (robotic-sounding for now — we swap this for Cartesia's natural
  // voice in a later step).
  const response = new twiml.VoiceResponse();
  response.say(
    { voice: "Polly.Olivia-Neural", language: "en-AU" }, // Olivia-Neural: natural-sounding Australian English
    "Hello! Thanks for calling. This is a test of the A.I. receptionist system. " +
    "If you can hear this clearly, step one is working. Goodbye for now."
  );
  response.hangup();

  res.set("Content-Type", "text/xml");
  res.send(response.toString());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AI Receptionist server listening on port ${PORT}`);
});
