// Auto-generated from r2-kana.vercel.app snippet "ainvest.js" (3Dq8UP1)
// Source: https://r2-kana.vercel.app/#/snippet/3Dq8UP1
// Description: New code - ainvest.js

/**
 * [ *ainvest Scraper* ]
 *  Creator: nath
 *  Noted: follow ch, Selebihnya atur sendiri
 *  Source Code: https://gist.github.com/nathwolf-123/17bea7737bb91bf14e8ab8a3eb1411e1
 */


import { randomUUID } from "crypto";

const kukis = `nova_fingerPrint=f36e5672-9ba6-4449-9bc8-3bc943c54fa9; _gcl_au=1.1.1005277014.1775988004; _ga=GA1.1.1779620500.1775988008; cuc=2d5b0fa5ed4641ea894b2150b29a8887; sess_tk=eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiIsImtpZCI6InNlc3NfdGtfZW5fMSIsImJ0eSI6InNlc3NfdGtfZW4ifQ.eyJqdGkiOiJjZjU3ODNjYzU2N2FjMmQyZmNlZWY1OWI2MjA0NTVlYzIiLCJpYXQiOjE3NzU5ODgwMDUsImV4cCI6MTc3ODY2NjQwNSwic3ViIjoiMTg1MzQ4NDEwNyIsImlzcyI6InVwYXNzLmFpbnZlc3QuY29tIiwiYXVkIjoiMjAyMjAxMTIwMjczNTAxNSIsImFjdCI6Im10IiwiY3VocyI6IjE0MTgyYjA2YzY4ZWU4NmMwMWM4NTIyMjhlMDU4ZDEyOTY4YzM1NTRhOWQ2MWViMTA4NWM0Yjc2OTEyMGVmNTIifQ.IeUqkTjICUcq-S1cvKxfjX0nn9DCQDwGz9YgHoGKx6751BGrJNDGlcnOACUwV20vtBqf3bmXCQCtcsXafbTZ4Q; user_status=0; ticket=9cca9099c0b0529b603dd2c95e4b5e51; escapename=mt_1853484107; u_name=mt_1853484107; userid=1853484107; sessionid=22faddb1bc3811c4309c013713d7c78db`;

const user_id = kukis.match(/userid=(\d+)/)?.[1] ?? "0";

function stripVisual(text) {
  return text.replace(/```visual[\s\S]*?```/g, "").replace(/\n{3,}/g, "\n\n");
}

async function ask(question) {
  const sessionId = randomUUID().replace(/-/g, "");

  const body = {
    question,
    input_type: "typewrite",
    session_id: sessionId,
    user_id: user_id,
    source: "ths_wencai_international_pc_robot",
    events: [
      { event_name: "normal_agent", event_type: "user_input" },
      { event_name: "ab_test", event_type: "front_trigger", content: { deep_research: 1 } },
    ],
    entity_info: { comefrom: "WebaimeRobot", device_type: "pc" },
    add_info: { async_generate_data: true, urp: { component_version: "1.1.3" } },
    log_info: {},
    version: "3.4.1",
    suggest_resultpage_only: true,
  };

  const res = await fetch("https://tech.ainvest.com/gateway/aime/stream-query", {
    method: "POST",
    headers: {
      accept: "text/event-stream",
      "content-type": "application/json",
      "cache-control": "no-cache",
      pragma: "no-cache",
      origin: "https://www.ainvest.com",
      referer: "https://www.ainvest.com/",
      "x-source": "ths_wencai_international_pc_robot",
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      cookie: kukis,
    },
    body: JSON.stringify(body),
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let answerBuf = "";
  let printedAnswer = 0;
  let inVisual = false;
  let answerStarted = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop();

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (!raw) continue;

      let parsed;
      try { parsed = JSON.parse(raw); } catch { continue; }

      const { answer_path, section } = parsed;

      if (answer_path === "progress/searching_for" && section?.status === "deep_thinking") {
        process.stdout.write(section.info_texts?.[0] ?? "");
      }

      if (answer_path === "other/openAnswer" && section?.show_type === "rich_text") {
        const chunk = section.text_answer ?? "";
        if (!chunk && section.is_last) continue;
        answerBuf += chunk;

        const clean = stripVisual(answerBuf);
        const newText = clean.slice(printedAnswer);

        if (newText) {
          if (!answerStarted) {
            answerStarted = true;
          }
          process.stdout.write(newText);
          printedAnswer += newText.length;
        }
      }
    }
  }

  console.log("\n");
  return { thinking: "", answer: answerBuf };
}

export default {
    route: {
        method: "get",
        path: "/kana/ainvest",
        auth: false,
        tags: ["Kana · AI"],
        summary: "ainvest",
        description: "New code - ainvest.js",
        parameters: [
            {
                name: "prompt",
                in: "query",
                required: true,
                description: "Pertanyaan / prompt untuk AI",
                schema: { type: "string" },
            },
        ],
        responses: {
            "200": {
                description: "Berhasil",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                ok: { type: "boolean", example: true },
                                result: { type: "object" },
                            },
                        },
                    },
                },
            },
            "400": { description: "Parameter tidak valid" },
            "500": { description: "Kesalahan server" },
        },
    },

    handler: async (req, res) => {
        const { prompt } = req.query
        if (!prompt || !String(prompt).trim()) {
            return res.status(400).json({ ok: false, error: `prompt wajib diisi` })
        }
        try {
            const result = await ask(String(prompt).trim())
            return res.json({ ok: true, result })
        } catch (e) {
            return res.status(500).json({ ok: false, error: e.message })
        }
    },
}
