// api/session.js
// GET — 현재 로그인 상태인지 확인합니다. 관리자 페이지가 로드될 때 호출합니다.

const { isAuthenticated } = require("./_lib/auth");

module.exports = async (req, res) => {
  const authenticated = await isAuthenticated(req);
  res.status(200).json({ authenticated });
};
