const configuration = require('./configuration')
const instances = require('./instances')

exports.configuration = configuration
exports.instances = instances

exports.index = (req, res) => {
  if (req.user.roles.isAdmin !== true) {
    return res.redirect('/')
  }
  return res.render('administration/index', req.templateValues)
}
