const Config = require('../../../classes/config')

exports.auth0 = (req, res) => {
  if (req.user.roles.isAdmin !== true) {
    return res.redirect('/')
  }

  const configObj = new Config()
  req.templateValues.auth0 = configObj.get('auth0')

  return res.render('administration/configuration/auth0', req.templateValues)
}
