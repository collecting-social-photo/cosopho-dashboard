const Queries = require('../../../../classes/queries')
const GraphQL = require('../../../../classes/graphQL')
const Mutations = require('../../../../classes/mutations')
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
    if (req.fields.action === 'unsuspendPerson' || req.fields.action === 'suspendPerson') {
      let suspended = true
      if (req.fields.action === 'unsuspendPerson') suspended = false
      const mutations = new Mutations()
      let mutation = mutations.get('updatePerson', `(instance: "${req.params.id}", id: "${req.fields.personId}", suspended: ${suspended})`)
      const payload = {
        query: mutation
      }
      await graphQL.fetch(payload, req.user.apitoken)
      return setTimeout(() => {
        res.redirect(req.templateValues.selfURL)
      }, 1000)
    }
  }

  //  Ok, now we checked all that action stuff, lets go get the people too!
  let people = null
  let page = 0
  let perPage = 50
  let peopleQuery = queries.get('people', `(instance: "${req.params.id}", page: ${page}, per_page: ${perPage}, photos_per_page: 1)`)

  people = await graphQL.fetch({
    query: peopleQuery
  }, process.env.HANDSHAKE)
  if (people.data && people.data.people) {
    people = people.data.people.map((person) => {
      if (person.photos && person.photos.length > 0 && person.photos[0]._sys && person.photos[0]._sys.pagination && person.photos[0]._sys.pagination.total) {
        person.photos = person.photos[0]._sys.pagination.total
      }
      return person
    })
  } else {
    return res.redirect(`/administration/instances/${req.params.id}`)
  }

  const config = new Config()
  req.templateValues.cloudinary = config.get('cloudinary')
  req.templateValues.people = people
  req.templateValues.instance = instance

  return res.render('administration/instances/people/index', req.templateValues)
}
