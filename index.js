const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const GHL_API_KEY = process.env.GHL_API_KEY;

// Use GHL custom field KEYS, not IDs
const CUSTOM_FIELD_MAP = {
  credit_range: "credit_range",
  zip: "zip",
  property_type: "property_type",
  property_use_occupancy: "property_use_occupancy",
  employment: "employment",
  first_time_buyer: "first_time_buyer",
  property_purchase_progress: "property_purchase_progress",
  amount_for_qualification: "amount_for_qualification",
  downpayment: "downpayment",
  gross_annual_income: "gross_annual_income",
  monthly_expenses: "monthly_expenses"
};

app.post("/api/parse", async (req, res) => {
  try {
    const { contactId, notes } = req.body.customData || {};
    console.log("Webhook Payload Received:", req.body);

    if (!contactId || !notes) {
      return res.status(400).json({ error: "Missing contactId or notes" });
    }

    // Parse key-value pairs from notes
    const fields = {};
    notes.split(",").forEach(pair => {
      const parts = pair.split(":");
      if (parts.length >= 2) {
        const [key, ...rest] = parts;
        const value = rest.join(":").trim();
        const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, "_");
        fields[normalizedKey] = value;
      }
    });

    let firstName = "", lastName = "";
    if (fields.your_full_name) {
      const parts = fields.your_full_name.trim().split(" ");
      firstName = parts[0];
      lastName = parts.slice(1).join(" ") || " ";
    }

    // Build payload using custom field KEYS
    const customFieldPayload = {};
    for (const [key, fieldKey] of Object.entries(CUSTOM_FIELD_MAP)) {
      if (fields[key]) {
        customFieldPayload[fieldKey] = fields[key];
      }
    }

    const payload = {
      first_name: firstName,
      last_name: lastName,
      email: fields.your_email || "",
      phone: (fields.your_phone_number || "").replace(/^\+?1/, ""),
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
