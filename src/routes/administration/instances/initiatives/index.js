const Queries = require('../../../../classes/queries')
const Mutations = require('../../../../classes/mutations')
const GraphQL = require('../../../../classes/graphQL')

exports.index = async (req, res) => {
  //  Work out if the user is allowed to see this or not
  let isAllowed = false

  //  If the user is an admin user then of course they can see this thing
  if (req.user && req.user.roles && req.user.roles.isAdmin && req.user.roles.isAdmin === true) {
    isAllowed = true
  }

  //  Now we need to know if the user has the right to see the instance this inititative belongs to
  //  1. Get the actual instance
  const graphQL = new GraphQL()
  const queries = new Queries()

  let initiative = null
  const initiativeQuery = queries.get('initiative', `(instance: "${req.params.id}", slug: "${req.params.slug}")`)
  initiative = await graphQL.fetch({
    query: initiativeQuery
  }, process.env.HANDSHAKE)
  if (initiative.data && initiative.data.initiative) {
    initiative = initiative.data.initiative
  } else {
    return res.redirect(`/administration/instances/${req.params.id}`)
  }

  //  We have an initiative, now we want to check its instance against the ones this
  //  user has access too. NOTE, this is only important if we are not allowed yet
  if (isAllowed === false) {
    if (req.user && req.user.instances && req.user.instances.includes(req.params.id)) {
      isAllowed = true
    }
  }

  //  Now, if we aren't allowed to view this yet, then we need to bounce here...
  if (isAllowed === false) {
    return res.redirect(`/administration/instances/${req.params.id}`)
  }

  //  As we know we're allowed to do stuff to this initiative, we check to see
  //  if want to actually do anything with it.
  if (req.fields && req.fields.action) {
    const mutations = new Mutations()

    //  If we are updating
    if (req.fields.action === 'updateInitiative' && req.fields.title && req.fields.title !== '') {
      let isActive = false
      if (req.fields.isActive) isActive = true
      let description = ''
      if (req.fields.description) description = req.fields.description
      let mutation = mutations.get('updateInitiative', `(instance: "${req.params.id}", id: "${initiative.id}", title: "${req.fields.title}", isActive: ${isActive}, description: "${description}")`)
      const payload = {
        query: mutation
      }
      await graphQL.fetch(payload, process.env.HANDSHAKE)
      return setTimeout(() => {
        res.redirect(`/${req.templateValues.selectedLang}/administration/instances/${req.params.id}`)
      }, 1000)
    }

    //  If we are deleting
    if (req.fields.action === 'deleteInitiative') {
      let mutation = mutations.get('deleteInitiative', `(instance: "${req.params.id}", id: "${initiative.id}")`)
      const payload = {
        query: mutation
      }
      await graphQL.fetch(payload, process.env.HANDSHAKE)
      return setTimeout(() => {
        res.redirect(`/${req.templateValues.selectedLang}/administration/instances/${req.params.id}`)
      }, 1000)
    }
  }

  //  Ok, now we checked all that action stuff, lets go get the instance too!
  let instance = null
  let instanceQuery = queries.get('instance', `(id: "${req.params.id}")`)
  instance = await graphQL.fetch({
    query: instanceQuery
  }, process.env.HANDSHAKE)

  if (instance.data && instance.data.instance) {
    instance = instance.data.instance
  } else {
    return res.redirect(`/administration/instances`)
  }

  req.templateValues.instance = instance
  req.templateValues.initiative = initiative

  return res.render('administration/instances/initiative/index', req.templateValues)
}
