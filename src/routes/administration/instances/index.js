const Queries = require('../../../classes/queries')
const Mutations = require('../../../classes/mutations')
const GraphQL = require('../../../classes/graphQL')

exports.index = async (req, res) => {
  //  Bounce the user is they are not an admin user
  if (!req.user || !req.user.roles || !req.user.roles.isAdmin) return res.render('main/redirect', req.templateValues)

  const graphQL = new GraphQL()
  const queries = new Queries()

  //  If we have been told to do something, do it here
  let results = []
  if (req.fields && req.fields.action) {
    if (req.fields.action === 'addInstance' && req.fields.title && req.fields.title !== '') {
      const mutations = new Mutations()

      let mutation = mutations.get('createInstance', `(title:"${req.fields.title}")`)
      const payload = {
        query: mutation
      }
      results = await graphQL.fetch(payload, req.user.apitoken)
      return setTimeout(() => {
        res.redirect(`/${req.templateValues.selectedLang}/administration/instances`)
      }, 1000)
    }
  }

  //  Grab all the instances
  let query = queries.get('instances', '')
  results = await graphQL.fetch({
    query: query
  }, req.user.apitoken)
  if (results.data && results.data.instances) {
    req.templateValues.instances = results.data.instances
  }

  return res.render('administration/instances/index', req.templateValues)
}

exports.instance = async (req, res) => {
  //  Bounce the user is they are not an admin user
  if (!req.user || !req.user.roles || !req.user.roles.isAdmin) return res.render('main/redirect', req.templateValues)

  const graphQL = new GraphQL()
  const queries = new Queries()

  //  If we have been told to do something, do it here
  let results = []
  if (req.fields && req.fields.action) {
    if (req.fields.action === 'updateInstance' && req.fields.title && req.fields.title !== '') {
      const mutations = new Mutations()

      let mutation = mutations.get('updateInstance', `(id: "${req.params.id}", title:"${req.fields.title}")`)
      const payload = {
        query: mutation
      }
      results = await graphQL.fetch(payload, req.user.apitoken)
      return setTimeout(() => {
        res.redirect(`/${req.templateValues.selectedLang}/administration/instances/${req.params.id}`)
      }, 1000)
    }

    if (req.fields.action === 'deleteInstance') {
      const mutations = new Mutations()

      let mutation = mutations.get('deleteInstance', `(id: "${req.params.id}")`)
      const payload = {
        query: mutation
      }
      results = await graphQL.fetch(payload, req.user.apitoken)
      return setTimeout(() => {
        res.redirect(`/${req.templateValues.selectedLang}/administration/instances`)
      }, 1000)
    }
  }

  //  Grab all the instances
  let query = queries.get('instance', `(id: "${req.params.id}")`)
  results = await graphQL.fetch({
    query: query
  }, req.user.apitoken)

  if (results.data && results.data.instance) {
    req.templateValues.instance = results.data.instance
  } else {
    return res.redirect(`/${req.templateValues.selectedLang}/administration/instances`)
  }

  //  Grab all the users so we can figure out which ones have control over these instances
  //  Grab all the users
  results = []
  query = queries.get('users', '')
  results = await graphQL.fetch({
    query: query
  }, req.user.apitoken)

  if (results.data && results.data.users) {
    //  Filter out the users that don't match this instance
    req.templateValues.users = results.data.users.filter((user) => {
      if (!user.instances) return false
      let foundMatch = false
      user.instances.forEach((instance) => {
        if (instance.id === req.templateValues.instance.id) foundMatch = true
      })
      return foundMatch
    }).filter(Boolean)
  }

  return res.render('administration/instances/instance', req.templateValues)
}
