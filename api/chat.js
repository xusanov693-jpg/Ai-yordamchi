export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Faqat POST so'rov qabul qilinadi" });
  }

  try {
    const { prompt, mode } = req.body || {};
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: "Savol bo'sh bo'lmasligi kerak" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY sozlanmagan" });
    }

    const modeInstructions = {
      smm: "Sen tajribali SMM mutaxassisisiz. Qisqa, jozibali va sotuvga yo'naltirilgan post yoki ssenariy yoz.",
      resume: "Sen professional HR va karyera maslahatchisiz. Tizimli va aniq rezyume (CV) matni tayyorla.",
      business: "Sen biznes tahlilchisisiz. Amaliy, real va foydali biznes g'oya hamda qadamlarni yoz.",
      chat: "Sen foydali va aniq javob beruvchi sun'iy intellekt yordamchisisiz."
    };

    const systemInstruction = modeInstructions[mode] || modeInstructions.chat;
    const fullPrompt = `${systemInstruction}\n\nFoydalanuvchi so'rovi: ${prompt}`;

    const models = ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-2.0-flash"];
    let lastError = "Javob olishda xatolik yuz berdi.";

    for (const model of models) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: fullPrompt }]
              }
            ]
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        const reply =
          data?.candidates?.[0]?.content?.parts?.[0]?.text ||
          "Javob qaytarilmadi.";
        return res.status(200).json({ reply });
      }

      lastError = data?.error?.message || lastError;
      const isTemporary =
        response.status === 429 ||
        response.status === 503 ||
        /high demand|overloaded|unavailable/i.test(lastError);

      if (!isTemporary) {
        return res.status(response.status).json({ error: lastError });
      }
    }

    return res.status(503).json({ error: lastError });
  } catch (err) {
    return res.status(500).json({ error: "Server xatoligi: " + err.message });
  }
}
