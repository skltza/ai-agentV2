# AI Receptionist — Step 1: Hello World Call (Twilio)

This is the first working piece of the custom AI receptionist. It does
ONE thing: when someone calls your Twilio number, the server answers
and speaks a fixed sentence, then hangs up. No AI yet — this step just
proves the phone → server → response wiring works.

## What you need before starting

1. A **Twilio** account (twilio.com).
2. An Australian phone number purchased through Twilio, registered
   under the **individual** path (your name, an Australian government
   ID or passport, and a residential address — no ABN needed since the
   business isn't formally registered yet).
3. A **Railway** account (railway.app) connected to GitHub, OR any
   other host that can run a Node.js app and give you a public HTTPS
   URL (Render, Fly.io, a VPS, etc.).
4. A GitHub repo containing these three files (package.json, server.js,
   this README).

## Step-by-step: buy your Twilio number

1. In the Twilio Console, go to **Phone Numbers → Buy a Number**.
2. Set country to Australia, search for a local number.
3. When prompted for regulatory/KYC info, choose the **individual**
   (not business) bundle, and provide:
   - Your full name
   - Australian government ID or passport
   - Residential address
4. Submit — approval is usually fast for the individual path, but can
   take from minutes to a day or two depending on Twilio's review queue.

## Step-by-step: deploy the server

1. Push this folder to a GitHub repo.
2. In Railway: **New Project → Deploy from GitHub repo** → select the repo.
3. Railway auto-detects it's a Node app and deploys it. Once live, it
   gives you a public URL like `https://ai-receptionist-production.up.railway.app`.
4. Visit that URL in a browser — you should see:
   `AI Receptionist server is running.`
   If you see that, the server is live and reachable from the internet.

## Step-by-step: connect Twilio to your server

1. In the Twilio Console, go to **Phone Numbers → Manage → Active
   Numbers**, click your number.
2. Scroll to **Voice Configuration**.
3. Under **"A call comes in"**, set:
   - Configure with: **Webhook**
   - URL: `https://YOUR-RAILWAY-URL/voice/inbound`
     (use the real URL Railway gave you, keep the `/voice/inbound` path)
   - HTTP method: **POST**
4. Save.

## Test it

Call your Twilio number from your own phone. You should hear:

> "Hello! Thanks for calling. This is a test of the A.I. receptionist
> system. If you can hear this clearly, step one is working. Goodbye
> for now."

(Voiced with an Australian-accented voice — Twilio's Polly.Nicole.)

If that works, the full pipeline's foundation is proven:
**Twilio number → webhook → your server → TwiML response → caller
hears speech.**

## What's next (Step 2)

Step 2 adds real-time speech-to-text: instead of the server only
*speaking*, it starts *listening* to what the caller says, using
Twilio's Media Streams (raw audio piped to our server over a
WebSocket) and Deepgram to transcribe it live. We'll build that once
Step 1 is confirmed working on a real call.

## Troubleshooting

- **Nothing happens when I call** → double check the webhook URL under
  "A call comes in" exactly matches your Railway URL +
  `/voice/inbound`, and that it's set to POST.
- **Call connects but goes silent / hangs up immediately** → check
  Railway's logs (Railway dashboard → your project → Deployments →
  View Logs) for errors; the `console.log` in server.js will print
  every incoming call event, which helps confirm Twilio is reaching
  the server at all.
- **"Application error, goodbye" from Twilio** → usually means the
  server returned invalid TwiML or a non-200 status. Check Railway
  logs for a stack trace, and check Twilio Console → Monitor → Logs →
  Errors for the specific TwiML error.
- **Number still pending approval** → KYC review can take a little
  time. Check Twilio Console → Phone Numbers → Regulatory Compliance
  for status.
