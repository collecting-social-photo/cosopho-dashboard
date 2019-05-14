const Config = require('../../../classes/config')

exports.index = (req, res) => {
  if (req.user.roles.isAdmin !== true) {
    return res.redirect('/')
  }

  const configObj = new Config()
  req.templateValues.cloudinary = configObj.get('cloudinary')

  if (req.fields.action) {
    if (req.fields.action === 'updateCloudinary') {
      if (req.fields.cloud_name && req.fields.api_key && req.fields.api_secret) {
        const cloudinary = {
          cloud_name: req.fields.cloud_name,
          api_key: req.fields.api_key,
          api_secret: req.fields.api_secret
        }
        configObj.set('cloudinary', cloudinary)
        return res.redirect('/administration/configuration')
      }
    }
  }

  return res.render('administration/configuration/index', req.templateValues)
}

exports.auth0 = (req, res) => {
  if (req.user.roles.isAdmin !== true) {
    return res.redirect('/')
  }

  const configObj = new Config()
  req.templateValues.auth0 = configObj.get('auth0')

  return res.render('administration/configuration/auth0', req.templateValues)
}
