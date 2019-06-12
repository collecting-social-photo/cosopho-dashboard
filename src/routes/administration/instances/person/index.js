const Queries = require('../../../../classes/queries')
const GraphQL = require('../../../../classes/graphQL')
const Config = require('../../../../classes/config')
const Mutations = require('../../../../classes/mutations')
const utils = require('../../../../modules/utils')

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

  //  Ok, now we checked all that action stuff, lets go get the person too!
  let person = null
  let page = 0
  let perPage = 20
  if (req.params.page) page = req.params.page - 1

  let personQuery = queries.get('person', `(slug: "${req.params.slug}", instance: "${req.params.id}", photos_page: ${page}, photos_per_page: ${perPage})`)
  person = await graphQL.fetch({
    query: personQuery
  }, process.env.HANDSHAKE)

  if (person.data && person.data.person) {
    person = person.data.person
  } else {
    return res.redirect(`/administration/instances/${req.params.id}`)
  }

  if (person.photos && person.photos.length > 0 && person.photos[0]._sys && person.photos[0]._sys.pagination) {
    req.templateValues.pagination = utils.paginator(person.photos[0]._sys.pagination, `/administration/instances/${req.params.id}/person/${req.params.slug}/page/`, 2)
  }

  //  As we know we're allowed to do stuff to this instance, we check to see
  //  if want to actually do anything with it.
  if (req.fields && req.fields.action) {
    const mutations = new Mutations()

    if (req.fields.action === 'suspendPerson' || req.fields.action === 'unsuspendPerson') {
      let suspended = true
      if (req.fields.action === 'unsuspendPerson') suspended = false
      let mutation = mutations.get('updatePerson', `(instance: "${req.params.id}", id: "${person.id}", suspended: ${suspended})`)
      const payload = {
        query: mutation
      }
      await graphQL.fetch(payload, req.user.apitoken)
      return setTimeout(() => {
        res.redirect(`/${req.templateValues.selectedLang}/administration/instances/${req.params.id}/person/${req.params.slug}`)
      }, 1000)
    }

    //  If we are approving or rejecting the photo
    if (req.fields.action === 'approvePhoto' || req.fields.action === 'rejectPhoto') {
      // Set approving or rejecting the photo
      let approved = false
      if (req.fields.action === 'approvePhoto') {
        approved = true
      }

      const mutation = mutations.get('updatePhoto', `(instance: "${req.params.id}", id: "${req.fields.photoId}", reviewed: true, approved: ${approved})`)
      if (mutation) {
        const payload = {
          query: mutation
        }
        await graphQL.fetch(payload, process.env.HANDSHAKE)
        return setTimeout(() => {
          res.redirect(`/${req.templateValues.selectedLang}/administration/instances/${req.params.id}/person/${req.params.slug}`)
        }, 1000)
      }
    }

    if (req.fields.action === 'deletePhoto') {
      const mutation = mutations.get('deletePhoto', `(instance: "${req.params.id}", id: "${req.fields.photoId}")`)
      if (mutation) {
        const payload = {
          query: mutation
        }
        await graphQL.fetch(payload, process.env.HANDSHAKE)
        return setTimeout(() => {
          res.redirect(`/${req.templateValues.selectedLang}/administration/instances/${req.params.id}/person/${req.params.slug}`)
        }, 1000)
      }
    }
  }

  const config = new Config()
  req.templateValues.cloudinary = config.get('cloudinary')
  req.templateValues.person = person
  req.templateValues.instance = instance

  return res.render('administration/instances/person/index', req.templateValues)
}
