const bcrypt = require("bcryptjs");

const password = "Donor123!"; // 👈 change this to your real admin password
const saltRounds = 10;

bcrypt.hash(password, saltRounds).then(hash => {
  console.log("Hashed password:", hash);
});