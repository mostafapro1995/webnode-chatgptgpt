
const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const multer = require("multer");
const dotenv = require("dotenv");
const fs = require("fs");

dotenv.config();
const app = express();
const upload = multer({ dest: "uploads/" });
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSEMBLY_API_KEY = process.env.ASSEMBLY_API_KEY;
const NFT_STORAGE_API_KEY = process.env.NFT_STORAGE_API_KEY;

app.post("/chat", async (req, res) => {
  const { message } = req.body;
  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: message }],
      }),
    });
    const data = await openaiRes.json();
    res.json({ reply: data.choices?.[0]?.message?.content || "خطأ في الرد." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "فشل الاتصال بـ OpenAI" });
  }
});

app.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    const file = fs.createReadStream(req.file.path);
    const uploadRes = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: { authorization: ASSEMBLY_API_KEY },
      body: file,
    });
    const uploadData = await uploadRes.json();

    const transcriptRes = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        authorization: ASSEMBLY_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({ audio_url: uploadData.upload_url }),
    });
    const transcriptData = await transcriptRes.json();

    let status = "processing";
    let result = null;
    while (status !== "completed" && status !== "error") {
      await new Promise((res) => setTimeout(res, 3000));
      const polling = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptData.id}`, {
        headers: { authorization: ASSEMBLY_API_KEY },
      });
      result = await polling.json();
      status = result.status;
    }

    fs.unlinkSync(req.file.path);

    if (status === "completed") {
      res.json({ text: result.text });
    } else {
      res.status(500).json({ error: "فشل في التفريغ" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "خطأ في تفريغ الصوت" });
  }
});

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = fs.readFileSync(req.file.path);
    const nftRes = await fetch("https://api.nft.storage/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NFT_STORAGE_API_KEY}`,
      },
      body: file,
    });
    const nftData = await nftRes.json();
    fs.unlinkSync(req.file.path);
    res.json({ url: `https://${nftData.value.cid}.ipfs.nftstorage.link` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "فشل رفع الملف" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
