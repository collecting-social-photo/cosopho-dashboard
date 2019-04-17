const Queries = require('../../../classes/queries')
const Mutations = require('../../../classes/mutations')
const GraphQL = require('../../../classes/graphQL')

exports.index = async (req, res) => {
  //  Bounce the user is they are not an admin user
  if (!req.user || !req.user.roles || !req.user.roles.isAdmin) return res.render('main/redirect', req.templateValues)

  const graphQL = new GraphQL()
  const queries = new Queries()

  //  Grab all the users
  let results = []
  let query = queries.get('users', '')
  results = await graphQL.fetch({
    query: query
  }, req.user.apitoken)
  if (results.data && results.data.users) {
    req.templateValues.users = results.data.users
  }

  return res.render('administration/users/index', req.templateValues)
}

exports.user = async (req, res) => {
  //  Bounce the user is they are not an admin user
  if (!req.user || !req.user.roles || !req.user.roles.isAdmin) return res.render('main/redirect', req.templateValues)

  const graphQL = new GraphQL()
  const queries = new Queries()

  //  If we have been told to do something, do it here
  let results = []
  if (req.fields && req.fields.action) {
    if (req.fields.action === 'updateUser') {
      let instances = []
      let isAdmin = false
      let isDeveloper = false

      //  Grab all the instances
      Object.entries(req.fields).forEach((fieldPair) => {
        let fieldSplit = fieldPair[0].split('_')
        if (fieldSplit[0] === 'instance') { //  If the 1st part is "instance"
          fieldSplit.shift() //  shift off the "instance" part
          fieldSplit = fieldSplit.join('_') //  put it back together
          instances.push(fieldSplit) // Pop it into the array
        }
      })

      if (req.fields.isAdmin && req.fields.isAdmin === 'on') isAdmin = true
      if (req.fields.isDeveloper && req.fields.isDeveloper === 'on') isDeveloper = true

      const mutations = new Mutations()
      let mutation = mutations.get('updateUser', `(id: "${req.params.id}", isAdmin: ${isAdmin}, isDeveloper: ${isDeveloper}, instances: ${JSON.stringify(instances)})`)
      const payload = {
        query: mutation
      }
      await graphQL.fetch(payload, req.user.apitoken)
      return setTimeout(() => {
        res.redirect(`/${req.templateValues.selectedLang}/administration/users`)
      }, 1000)
    }
  }

  //  Grab the user
  let query = queries.get('user', `(id: "${req.params.id}")`)
  results = await graphQL.fetch({
    query: query
  }, req.user.apitoken)

  if (results.data && results.data.user) {
    req.templateValues.thisUser = results.data.user
  } else {
    return res.redirect(`/${req.templateValues.selectedLang}/administration/users`)
  }

  //  Grab the instances
  query = queries.get('instances', '')
  let allInstances = []
  results = await graphQL.fetch({
    query: query
  }, req.user.apitoken)
  if (results.data && results.data.instances) {
    allInstances = results.data.instances
  }

  req.templateValues.instances = allInstances.map((instance) => {
    instance.isMember = false
    if (req.templateValues.thisUser.instances) {
      req.templateValues.thisUser.instances.forEach((userInstance) => {
        if (userInstance.id === instance.id) {
          instance.isMember = true
        }
      })
    }
    return instance
  })

  return res.render('administration/users/user', req.templateValues)
}
