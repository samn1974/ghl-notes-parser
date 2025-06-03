const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const GHL_API_KEY = process.env.GHL_API_KEY;

app.post("/api/parse", async (req, res) => {
  try {
    const { contactId, notes } = req.body;

    if (!contactId || !notes) {
      return res.status(400).json({ error: "Missing contactId or notes" });
    }

    const fields = {};
    notes.split(",").forEach(pair => {
      const [key, value] = pair.split(":").map(s => s.trim());
      if (key && value) {
        fields[key.toLowerCase().replace(/\s+/g, "_")] = value;
      }
    });

    // Split full name
    let firstName = "", lastName = "";
    if (fields.your_full_name) {
      const nameParts = fields.your_full_name.trim().split(" ");
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(" ");
    }

    const payload = {
      zip: fields.zip_code || "",
      property_type: fields.type_of_property || "",
      property_use_occupancy: fields.how_will_this_property_be_used || "",
      loan_amount: fields.amount_for_qualification || "",
      down_payment: fields.downpayment || "",
      income: fields.gross_annual_income || "",
      employment: fields.employment || "",
      monthly_expenses: fields.monthly_expenses || "",
      credit_range: fields.estimated_credit_score || "",
      how_soon_are_you_looking_to_buy: fields.property_purchase_progress || "",
      first_time_buyer: fields.first_time_buyer || "",
      first_name: firstName,
      last_name: lastName,
      email: fields.your_email || "",
      phone: fields.your_phone_number || ""
    };

    await axios.put(`https://rest.gohighlevel.com/v1/contacts/${contactId}`, payload, {
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    res.status(200).json({ success: true, updated: payload });
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;
