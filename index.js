const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const GHL_API_KEY = process.env.GHL_API_KEY;

// Clean "$" and "," from number strings
const cleanNumber = (val) => val ? val.replace(/[\$,]/g, "").trim() : "";

app.post("/api/parse", async (req, res) => {
  try {
    const { contactId, notes } = req.body;

    if (!contactId || !notes) {
      return res.status(400).json({ error: "Missing contactId or notes" });
    }

    // Parse the notes field into key-value pairs
    const fields = {};
    notes.split(",").forEach(pair => {
      const [key, value] = pair.split(":").map(str => str.trim());
      if (key && value) {
        const normalizedKey = key.toLowerCase().replace(/\s+/g, "_");
        fields[normalizedKey] = value;
      }
    });

    // Split full name into first and last
    let firstName = "", lastName = "";
    if (fields.your_full_name) {
      const parts = fields.your_full_name.trim().split(" ");
      firstName = parts[0];
      lastName = parts.slice(1).join(" ") || " ";
    }

    // Construct payload with your custom mappings
    const payload = {
      first_name: firstName,
      last_name: lastName,
      email: fields.your_email || "",
      phone: fields.your_phone_number || "",
      credit_range: fields.estimated_credit_score || "",                         // {{ contact.credit_range }}
      zip: fields.zip_code || "",                                               // {{ contact.zip }}
      property_type: fields.type_of_property || "",                             // {{ contact.property_type }}
      property_use_occupancy: fields.how_will_this_property_be_used || "",      // {{ contact.property_use_occupancy }}
      employment: fields.employment || "",                                      // {{ contact.employment }}
      first_time_buyer: fields.first_time_buyer || "",                          // {{ contact.first_time_buyer }}
      property_purchase_progress: fields.property_purchase_progress || "",      // {{ contact.property_purchase_progress }}
      amount_for_qualification: cleanNumber(fields.amount_for_qualification),   // {{ contact.amount_for_qualification }}
      downpayment: cleanNumber(fields.downpayment),                             // {{ contact.downpayment }}
      gross_annual_income: cleanNumber(fields.gross_annual_income),             // {{ contact.gross_annual_income }}
      monthly_expenses: cleanNumber(fields.monthly_expenses)                    // {{ contact.monthly_expenses }}
    };

    // Log for debugging
    console.log("Updating contact ID:", contactId);
    console.log("Parsed Notes:", fields);
    console.log("Final Payload:", payload);

    // Call GoHighLevel API
    await axios.put(`https://rest.gohighlevel.com/v1/contacts/${contactId}`, payload, {
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    res.status(200).json({ success: true, updated: payload });

  } catch (error) {
    console.error("Update Error:", error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;
