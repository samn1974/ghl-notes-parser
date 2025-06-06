const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const GHL_API_KEY = process.env.GHL_API_KEY;

// Use field keys — NOT field IDs
const CUSTOM_FIELD_KEYS = [
  "credit_range",
  "zip",
  "property_type",
  "property_use_occupancy",
  "employment",
  "first_time_buyer",
  "property_purchase_progress",
  "amount_for_qualification",
  "downpayment",
  "gross_annual_income",
  "monthly_expenses"
];

app.post("/api/parse", async (req, res) => {
  try {
    const { contactId, notes } = req.body.customData || {};

    console.log("Webhook Payload Received:", req.body);

    if (!contactId || !notes) {
      return res.status(400).json({ error: "Missing contactId or notes" });
    }

    // Parse the notes into key-value pairs
    const fields = {};
    notes.split(",").forEach(pair => {
      const [key, value] = pair.split(":").map(str => str.trim());
      if (key && value) {
        const normalizedKey = key.toLowerCase().replace(/\s+/g, "_");
        fields[normalizedKey] = value;
      }
    });

    // Extract first and last name
    let firstName = "", lastName = "";
    if (fields.your_full_name) {
      const parts = fields.your_full_name.trim().split(" ");
      firstName = parts[0];
      lastName = parts.slice(1).join(" ") || " ";
    }

    // Build customField object using keys
    const customFieldPayload = {};
    CUSTOM_FIELD_KEYS.forEach(key => {
      if (fields[key]) {
        customFieldPayload[key] = fields[key]; // No trimming or dollar removal
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
