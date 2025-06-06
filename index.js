const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const GHL_API_KEY = process.env.GHL_API_KEY;

const CUSTOM_FIELD_MAP = {
  credit_range: "custom_field_1QakOdKIuo0qHDTA9VhS",
  zip: "custom_field_S9wHJcWBMsdCjHtBCy9c",
  property_type: "custom_field_nofDhYJy2dwWBH55mqNK",
  property_use_occupancy: "custom_field_wvNx8g9nJalk62iW9tw6",
  employment: "custom_field_pr8caZ14fkGStYsB2yyX",
  first_time_buyer: "custom_field_q7Qo3VqK6aNqEgOdi3nD",
  property_purchase_progress: "custom_field_Jb2qp78TEwnYLo1AK8Gd",
  amount_for_qualification: "custom_field_64S8oop42NAR1zYrdF4L",
  downpayment: "custom_field_ztu7bVHm07nfXZV73xtG",
  gross_annual_income: "custom_field_996ZBqgv4SB8qEHjz0e7",
  monthly_expenses: "custom_field_dgK3k6ImFuZ83FmupWDE"
};

app.post("/api/parse", async (req, res) => {
  try {
    const { contactId, notes } = req.body.customData || {};

    console.log("Webhook Payload Received:", req.body);

    if (!contactId || !notes) {
      return res.status(400).json({ error: "Missing contactId or notes" });
    }

    const fields = {};
    notes.split(",").forEach(pair => {
      const [key, value] = pair.split(":").map(str => str.trim());
      if (key && value) {
        const normalizedKey = key.toLowerCase().replace(/\s+/g, "_");
        fields[normalizedKey] = value;
      }
    });

    let firstName = "", lastName = "";
    if (fields.your_full_name) {
      const parts = fields.your_full_name.trim().split(" ");
      firstName = parts[0];
      lastName = parts.slice(1).join(" ") || " ";
    }

    const customFieldPayload = {};
    for (const [key, fieldId] of Object.entries(CUSTOM_FIELD_MAP)) {
      if (fields[key]) {
        customFieldPayload[fieldId] = fields[key];
      }
    }

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
