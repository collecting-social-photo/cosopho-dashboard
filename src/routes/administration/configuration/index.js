const Config = require('../../../classes/config')

exports.index = (req, res) => {
  if (req.user.roles.isAdmin !== true) {
    return res.redirect('/')
  }

  const configObj = new Config()
  const graphQL = configObj.get('graphQL')

  req.templateValues.graphQL = graphQL

  if (req.fields && req.fields.action) {
    if (req.fields.action === 'updateGraphQL') {
      configObj.set('graphQL', req.fields.graphQL)
      return res.redirect('/administration/configuration')
    }
  }

  return res.render('administration/configuration/index', req.templateValues)
}

exports.auth0 = (req, res) => {
  if (req.user.roles.isAdmin !== true) {
    return res.redirect('/')
  }

  const configObj = new Config()
  req.templateValues.graphQL = configObj.get('graphQL')
  req.templateValues.auth0 = configObj.get('auth0')

  return res.render('administration/configuration/auth0', req.templateValues)
}
