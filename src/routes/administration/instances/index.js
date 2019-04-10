const Instances = require('../../../classes/instances')

exports.index = async (req, res) => {
  if (!req.user || !req.user.roles || !req.user.roles.isAdmin) return res.render('main/redirect', req.templateValues)
  req.templateValues.instances = await new Instances().get()
  return res.render('administration/instances/index', req.templateValues)
}
