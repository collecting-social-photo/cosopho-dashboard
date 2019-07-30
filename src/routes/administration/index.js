const configuration = require('./configuration')
const instances = require('./instances')
const languages = require('./languages')
const users = require('./users')

exports.configuration = configuration
exports.instances = instances
exports.languages = languages
exports.users = users

exports.index = (req, res) => {
  if (req.user.roles.isAdmin !== true) {
    return res.redirect('/')
  }
  return res.render('administration/index', req.templateValues)
}
