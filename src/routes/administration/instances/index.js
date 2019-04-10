const Queries = require('../../../classes/queries')
const GraphQL = require('../../../classes/graphQL')

exports.index = async (req, res) => {
  if (!req.user || !req.user.roles || !req.user.roles.isAdmin) return res.render('main/redirect', req.templateValues)

  const queries = new Queries()
  const graphQL = new GraphQL()

  let query = queries.get('hello', '')
  const payload = {
    query
  }
  const records = await graphQL.fetch(payload, req.user.apitoken)
  console.log(records)
  return res.render('administration/instances/index', req.templateValues)
}
