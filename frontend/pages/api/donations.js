import Database from "better-sqlite3";

const db = new Database("./db/database.sqlite");

export default function handler(req, res) {
  if (req.method === "POST") {
    const { name, email, address, postcode, phone, itemName, category, description, condition } = req.body;

    console.log("📥 Incoming donation request:", req.body); // log form data

    try {
      // Check if user already exists
      let user = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
      let userId;

      if (!user) {
        const result = db
          .prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'donor')")
          .run(name, email, "placeholder");
        userId = result.lastInsertRowid;

        console.log(`👤 New user created (id=${userId}, email=${email})`);
      } else {
        userId = user.id;
        console.log(`👤 Existing user found (id=${userId}, email=${email})`);
      }

      // Ensure donor profile exists
      let donor = db.prepare("SELECT id FROM donors WHERE user_id = ?").get(userId);
      let donorId;
      if (!donor) {
        const result = db
          .prepare("INSERT INTO donors (user_id, address, postcode, phone) VALUES (?, ?, ?, ?)")
          .run(userId, address, postcode, phone);
        donorId = result.lastInsertRowid;

        console.log(`🏠 New donor profile created (id=${donorId})`);
      } else {
        donorId = donor.id;
        console.log(`🏠 Existing donor profile (id=${donorId})`);
      }

      // Insert item
      const itemResult = db.prepare(
        "INSERT INTO items (donor_id, name, category, description, condition, status) VALUES (?, ?, ?, ?, ?, 'pending')"
      ).run(donorId, itemName, category, description, condition);

      console.log(`📦 New item created (id=${itemResult.lastInsertRowid}, name=${itemName})`);

      res.status(200).json({ message: "Donation submitted successfully!" });
    } catch (err) {
      console.error("❌ Error saving donation:", err);
      res.status(500).json({ error: "Failed to save donation" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}