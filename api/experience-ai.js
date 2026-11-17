module.exports = async function handler(req, res) {
  res.status(200).json({ ok: true });
};
module.exports.config = { maxDuration: 300 };