export function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}

export function ensureAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.role === "Admin") return next();
  res.status(403).send("Access denied");
}