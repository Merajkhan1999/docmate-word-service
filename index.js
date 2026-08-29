const express = require("express");
const Docxtemplater = require("docxtemplater");
const PizZip = require("pizzip");

const app = express();
// Accept large files (docx with logos can be a few MB)
app.use(express.json({ limit: "25mb" }));

// Simple health check so you can confirm it's alive
app.get("/", (req, res) => {
  res.send("DocMate Word Service is running.");
});

// The main endpoint Salesforce will call
app.post("/generate", (req, res) => {
  try {
    // Salesforce sends: the docx (base64) + the field values
    const { templateBase64, data } = req.body;

    if (!templateBase64) {
      return res
        .status(400)
        .json({ error: "No template file provided." });
    }

    // Turn the base64 back into the real docx file
    const buffer = Buffer.from(templateBase64, "base64");
    const zip = new PizZip(buffer);

    // Set up docxtemplater to use {{ }} placeholders
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: "{{", end: "}}" },
    });

    // Swap every {{placeholder}} for its value
    doc.render(data || {});

    // Build the finished docx
    const out = doc
      .getZip()
      .generate({ type: "nodebuffer" });

    // Send it back as base64 so Salesforce can save it
    res.json({
      success: true,
      fileBase64: out.toString("base64"),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("DocMate Word Service on port " + PORT);
});
