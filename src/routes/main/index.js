const Queries = require('../../classes/queries')
const GraphQL = require('../../classes/graphQL')

exports.index = async (req, res) => {
  if (!req.user || !req.user.roles || (('isAdmin' in req.user.roles && req.user.roles.isAdmin === false) && (!('isDeveloper' in req.user.roles) || req.user.roles.isDeveloper === false))) return res.render('main/pleaselogin', req.templateValues)

  let isNotAdmin = true
  if (req.user && req.user.roles && req.user.roles.isAdmin && req.user.roles.isAdmin === true) {
    isNotAdmin = false
  }

  const graphQL = new GraphQL()
  const queries = new Queries()

  //  If we are an admin user then get all the instance
  let instancesQuery = null
  if (isNotAdmin === false) {
    instancesQuery = queries.get('instances', '')
  } else {
    //  Otherwuse if we have some instances listed get those
    if (req.user && req.user.instances) {
      instancesQuery = queries.get('instances', `(ids: ${JSON.stringify(req.user.instances)})`)
    }
  }

  if (instancesQuery) {
    const results = await graphQL.fetch({
      query: instancesQuery
    }, process.env.HANDSHAKE)
    if (results.data && results.data.instances) {
      req.templateValues.instances = results.data.instances
    }
  }

  return res.render('main/index', req.templateValues)
}

exports.wait = (req, res) => {
  return res.render('administration/configuration/wait', req.templateValues)
}
