const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const GHL_API_KEY = process.env.GHL_API_KEY;

// Mapping from note labels to internal field keys
const FIELD_KEY_REMAP = {
  estimated_credit_score: "credit_range",
  zip_code: "zip",
  type_of_property: "property_type",
  how_will_this_property_be_used: "property_use_occupancy",
  employment: "employment",
  first_time_buyer: "first_time_buyer",
  property_purchase_progress: "property_purchase_progress",
  amount_for_qualification: "amount_for_qualification",
  downpayment: "downpayment",
  gross_annual_income: "gross_annual_income",
  monthly_expenses: "monthly_expenses",
  your_full_name: "your_full_name",
  your_email: "your_email",
  your_phone_number: "your_phone_number"
};

app.post("/api/parse", async (req, res) => {
  try {
    const { contactId, notes } = req.body.customData || {};

    console.log("Webhook Payload Received:", req.body);

    if (!contactId || !notes) {
      return res.status(400).json({ error: "Missing contactId or notes" });
    }

    // Normalize notes into key-value pairs
    const fields = {};
const matches = notes.match(/[^:,]+:\s*[^:,]+(?:,\d{3})*(?:\.\d+)?/g);
if (matches) {
  matches.forEach(pair => {
    const [rawKey, ...valueParts] = pair.split(":");
    const value = valueParts.join(":").trim();
    const normalizedKey = rawKey.trim().toLowerCase().replace(/\s+/g, "_");
    const finalKey = FIELD_KEY_REMAP[normalizedKey] || normalizedKey;
    fields[finalKey] = value;
  });
}


    // Split full name into first and last
    let firstName = "", lastName = "";
    if (fields.your_full_name) {
      const parts = fields.your_full_name.trim().split(" ");
      firstName = parts[0];
      lastName = parts.slice(1).join(" ") || " ";
    }

    // Extract only mapped custom field keys (no trimming or $ removal for now)
    const customFieldPayload = {};
    Object.values(FIELD_KEY_REMAP).forEach(key => {
      if (
        !["your_full_name", "your_email", "your_phone_number"].includes(key) &&
        fields[key]
      ) {
        customFieldPayload[key] = fields[key];
      }
    });

    const payload = {
      first_name: firstName,
      last_name: lastName,
      email: fields.your_email || "",
      phone: fields.your_phone_number || "",
      customField: customFieldPayload
    };

    console.log("Final GHL Payload:", payload);

    const result = await axios.put(
      `https://rest.gohighlevel.com/v1/contacts/${contactId}`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("GHL Update Success:", result.data);
    res.status(200).json({ success: true, updated: payload });

  } catch (error) {
    console.error("Update Error:", error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;
