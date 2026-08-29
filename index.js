const express = require("express");
const Docxtemplater = require("docxtemplater");
const PizZip = require("pizzip");

const app = express();
app.use(express.json({ limit: "25mb" }));

app.get("/", (req, res) => {
  res.send("DocMate Word Service is running.");
});

app.post("/generate", (req, res) => {
  try {
    const { templateBase64, data } = req.body;

    if (!templateBase64) {
      return res
        .status(400)
        .json({ error: "No template file provided." });
    }

    const buffer = Buffer.from(templateBase64, "base64");
    const zip = new PizZip(buffer);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: "{{", end: "}}" },
    });

    doc.render(data || {});

    const out = doc
      .getZip()
      .generate({ type: "nodebuffer" });

    res.json({
      success: true,
      fileBase64: out.toString("base64"),
    });
  } catch (err) {
    // Send back the detailed reason so we can see it
    let message = err.message;
    if (err.properties && err.properties.errors) {
      message = err.properties.errors
        .map((e) => e.properties.explanation)
        .join("; ");
    }
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("DocMate Word Service on port " + PORT);
});
