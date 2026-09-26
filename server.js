// AI Receptionist — Step 1.5: Cartesia voice upgrade
//
// What this does:
//   Same as Step 1 (answers the call, speaks a fixed sentence), but now
//   the sentence is spoken using Cartesia's natural-sounding voice
//   instead of Twilio's built-in TTS.
//
// How it works:
//   1. On first request, we ask Cartesia's API to generate an MP3 of our
//      fixed sentence and save it to disk.
//   2. We serve that MP3 file from a route on our own server.
//   3. When Twilio calls our webhook, instead of <Say> (robotic TTS) we
//      use <Play> pointing at our MP3 URL — so Twilio just plays audio
//      instead of generating its own speech.
//
// This is still NOT real-time yet (Step 2+ adds live listening and a
// dynamic LLM brain). This step only proves Cartesia's voice quality
// works in the pipeline.

const express = require("express");
const { twiml } = require("twilio");
const fs = require("fs");
const path = require("path");
const app = express();

app.use(express.urlencoded({ extended: false }));

const AUDIO_DIR = path.join(__dirname, "audio-cache");
const GREETING_PATH = path.join(AUDIO_DIR, "greeting.mp3");
const GREETING_TEXT =
  "Hello! Thanks for calling. This is a test of the A.I. receptionist system. " +
  "If you can hear this clearly, the new voice is working. Goodbye for now.";

// Cartesia config — set these in Railway's environment variables
const CARTESIA_API_KEY = process.env.CARTESIA_API_KEY;
// Default voice below is a placeholder Cartesia sample voice.
// Browse Cartesia's voice library (in their dashboard) to find one you
// like the sound of, copy its Voice ID, and set it here or as an env var.
const CARTESIA_VOICE_ID = process.env.CARTESIA_VOICE_ID || "694f9389-aac1-45b6-b726-9d9369183238";

if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR);
}

// Calls Cartesia's TTS API and saves the result as an MP3 file.
// We only need to do this once per fixed sentence — cached to disk so
// we don't re-generate (and re-pay for) the same audio on every call.
async function generateGreetingAudio() {
  if (fs.existsSync(GREETING_PATH)) {
    console.log("Using cached greeting audio.");
    return;
  }

  if (!CARTESIA_API_KEY) {
    console.warn(
      "CARTESIA_API_KEY not set — skipping Cartesia generation. " +
      "Set it in Railway's environment variables to enable the natural voice."
    );
    return;
  }

  console.log("Generating greeting audio via Cartesia...");

  const response = await fetch("https://api.cartesia.ai/tts/bytes", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${CARTESIA_API_KEY}`,
      "Cartesia-Version": "2024-11-13",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_id: "sonic-2",
      transcript: GREETING_TEXT,
      voice: { mode: "id", id: CARTESIA_VOICE_ID },
      output_format: {
        container: "mp3",
        sample_rate: 44100,
        bit_rate: 128000,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Cartesia API error (${response.status}): ${errText}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(GREETING_PATH, audioBuffer);
  console.log("Greeting audio saved to", GREETING_PATH);
}

// Health check
app.get("/", (req, res) => {
  res.send("AI Receptionist server is running.");
});

// Serves the cached MP3 so Twilio's <Play> can fetch it
app.get("/audio/greeting.mp3", (req, res) => {
  if (!fs.existsSync(GREETING_PATH)) {
    return res.status(404).send("Greeting audio not generated yet.");
  }
  res.set("Content-Type", "audio/mpeg");
  res.sendFile(GREETING_PATH);
});

// Twilio's webhook for incoming calls
app.post("/voice/inbound", async (req, res) => {
  console.log("Incoming call event:", JSON.stringify(req.body, null, 2));

  const response = new twiml.VoiceResponse();

  const host = req.get("host");
  const protocol = req.protocol === "http" && host.includes("railway.app") ? "https" : req.protocol;

  if (fs.existsSync(GREETING_PATH)) {
    // Play our Cartesia-generated audio
    response.play(`${protocol}://${host}/audio/greeting.mp3`);
  } else {
    // Fallback to Twilio's built-in TTS if Cartesia audio isn't ready
    // (e.g. CARTESIA_API_KEY not set yet)
    response.say(
      { voice: "Polly.Olivia-Neural", language: "en-AU" },
      GREETING_TEXT
    );
  }
  response.hangup();

  res.set("Content-Type", "text/xml");
  res.send(response.toString());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`AI Receptionist server listening on port ${PORT}`);
  try {
    await generateGreetingAudio();
  } catch (err) {
    console.error("Failed to generate greeting audio:", err.message);
    console.error("Calls will fall back to Twilio's built-in voice until this is fixed.");
  }
});
