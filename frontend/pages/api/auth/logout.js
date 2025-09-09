export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  // Expire cookie
  res.setHeader("Set-Cookie", "auth=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax");
  return res.status(200).json({ message: "Logged out" });
}
