const Queries = require('../../../../classes/queries')
const GraphQL = require('../../../../classes/graphQL')
const Config = require('../../../../classes/config')

exports.index = async (req, res) => {
  //  Work out if the user is allowed to see this or not
  let isAllowed = false

  //  If the user is an admin user then of course they can see this thing
  if (req.user && req.user.roles && req.user.roles.isAdmin && req.user.roles.isAdmin === true) {
    isAllowed = true
  }

  //  Now we need to know if the user has the right to see the instance
  const graphQL = new GraphQL()
  const queries = new Queries()

  //  We have an initiative, now we want to check its instance against the ones this
  //  user has access too. NOTE, this is only important if we are not allowed yet
  if (isAllowed === false) {
    if (req.user && req.user.instances && req.user.instances.includes(req.params.id)) {
      isAllowed = true
    }
  }

  //  Get the instance
  let instance = null
  let instanceQuery = queries.get('instance', `(id: "${req.params.id}")`)
  instance = await graphQL.fetch({
    query: instanceQuery
  }, process.env.HANDSHAKE)
  if (instance.data && instance.data.instance) {
    instance = instance.data.instance
  } else {
    return res.redirect(`/administration/instances/`)
  }

  //  Now, if we aren't allowed to view this yet, then we need to bounce here...
  if (isAllowed === false) {
    return res.redirect(`/administration/instances/${req.params.id}`)
  }

  //  As we know we're allowed to do stuff to this instance, we check to see
  //  if want to actually do anything with it.
  if (req.fields && req.fields.action) {
    console.log('Doing an action')
    console.log(req.fields)
  }

  //  Ok, now we checked all that action stuff, lets go get the person too!
  let person = null
  let page = 0
  let perPage = 50
  let personQuery = queries.get('person', `(slug: "${req.params.slug}", instance: "${req.params.id}", photos_page: ${page}, photos_per_page: ${perPage})`)
  person = await graphQL.fetch({
    query: personQuery
  }, process.env.HANDSHAKE)

  if (person.data && person.data.person) {
    person = person.data.person
  } else {
    return res.redirect(`/administration/instances/${req.params.id}`)
  }

  const config = new Config()
  req.templateValues.cloudinary = config.get('cloudinary')
  req.templateValues.person = person
  req.templateValues.instance = instance

  return res.render('administration/instances/person/index', req.templateValues)
}
