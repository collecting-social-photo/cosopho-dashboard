exports.index = (req, res) => {
  if (!req.user || !req.user.roles || !req.user.roles.isAdmin) return res.render('main/pleaselogin', req.templateValues)
  return res.render('main/index', req.templateValues)
}

exports.wait = (req, res) => {
  return res.render('config/wait', req.templateValues)
}
