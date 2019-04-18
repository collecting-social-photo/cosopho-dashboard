const Queries = require('../../classes/queries')
const GraphQL = require('../../classes/graphQL')

exports.index = async (req, res) => {
  // if (!req.user || !req.user.roles || !req.user.roles.isAdmin) return res.render('main/pleaselogin', req.templateValues)

  if (req.user && req.user.instances) {
    const graphQL = new GraphQL()
    const queries = new Queries()

    let query = queries.get('instances', `(ids: ${JSON.stringify(req.user.instances)})`)

    const results = await graphQL.fetch({
      query: query
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
