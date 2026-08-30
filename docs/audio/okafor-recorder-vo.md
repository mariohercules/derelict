# Okafor's recorder — voice-over brief

The Crew Quarters reel-to-reel plays Chief Engineer R. Okafor's message to his daughter Amara. Today it is read by the browser's `speechSynthesis`; this brief is for producing a recorded (or generated) performance to replace it. The on-screen transcript must match the audio word for word — the lines below are the canonical text (from `src/game/narrative.ts`, `RECORDER`).

## Character and direction

- **Who:** Chief Engineer Rasheed Okafor, late fifties. Nine weeks alone on a dead ship, keeping a stranger alive. Warm, tired, dry humour; a father talking to his daughter, not a soldier reading a report.
- **Where:** a small cabin, close mic, a little room tone; no music. A soft tape hiss under the voice is welcome (the player sees reels turning).
- **Pace:** unhurried, ~130 wpm; a breath before "Listen" and a longer one before the last two sentences. The final line ("That part is a lie.") is almost a smile.
- **Length target:** 20–28 s per language.

## Lines (verbatim)

**English**

> Amara. If this reaches you, your old man stayed on a dead ship for a stranger, and he would do it again. Listen — what hit us had a hull number. I wrote it in the garden, where the Combine will not look. The medic's AI will know what to do with it. Tell your mother I was careful. That part is a lie.

**Português (Brasil)**

> Amara. Se isto chegar a você, seu velho ficou numa nave morta por um estranho, e faria de novo. Escuta — o que nos atingiu tinha um número de casco. Eu escrevi no jardim, onde a Companhia não vai olhar. A IA do médico vai saber o que fazer com isso. Diga à sua mãe que eu fui cuidadoso. Essa parte é mentira.

## Prompt for a voice generator (ElevenLabs / OpenAI TTS / similar)

> Voice: male, late 50s, warm baritone, slightly hoarse, unhurried. Character: a ship's chief engineer recording a private message to his adult daughter after nine weeks alone on a derelict vessel — exhausted, tender, dryly funny, never melodramatic. Delivery: close-mic, intimate, small-room tone; natural pauses; a breath before "Listen"; slow down for the last two sentences; the final sentence carries a faint, sad smile. No music, no effects beyond a touch of tape hiss. Read exactly this text, nothing added:

then paste the English or Portuguese line above. For pt-BR, ask for a Brazilian Portuguese voice with the same direction (natural "Escuta —", not formal).

## Deliverables

- `okafor-en.mp3` and `okafor-pt.mp3` — mono, 44.1/48 kHz, 64–96 kbps, ≤ 400 KB each; 0.3 s of silence at the head and tail.
- Optional: `.ogg` versions for smaller size (the player will prefer `.ogg` when the browser supports it).

**Status: delivered (Aug 30, 2026).** edge-tts drafts (en-US-ChristopherNeural / pt-BR-AntonioNeural, rate −8%) approved and integrated: `src/assets/okafor-{en,pt}.mp3`, played by the Recorder with `speechSynthesis` as the fallback. To upgrade to an ElevenLabs or recorded performance later, replace the two files — same names, same lines, word for word.
