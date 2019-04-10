// const Queries = require('../../../classes/queries')
const Mutations = require('../../../classes/mutations')
const GraphQL = require('../../../classes/graphQL')

exports.index = async (req, res) => {
  if (!req.user || !req.user.roles || !req.user.roles.isAdmin) return res.render('main/redirect', req.templateValues)

  // const queries = new Queries()
  const mutations = new Mutations()
  const graphQL = new GraphQL()

  let mutation = mutations.get('createInstance', `(title:"fnord")`)
  const payload = {
    query: mutation
  }
  const records = await graphQL.fetch(payload, req.user.apitoken)
  console.log(records)
  return res.render('administration/instances/index', req.templateValues)
}