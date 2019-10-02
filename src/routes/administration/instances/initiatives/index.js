const Queries = require('../../../../classes/queries')
const Mutations = require('../../../../classes/mutations')
const GraphQL = require('../../../../classes/graphQL')
const Config = require('../../../../classes/config')
const utils = require('../../../../modules/utils')

exports.index = async (req, res) => {
  console.log('In admin/instances/initiatives')
  //  Work out if the user is allowed to see this or not
  let isAllowed = false

  //  If the user is an admin user then of course they can see this thing
  if (req.user && req.user.roles && req.user.roles.isAdmin && req.user.roles.isAdmin === true) {
    isAllowed = true
  }

  console.log('isAllowed: ', isAllowed)
  //  Now we need to know if the user has the right to see the instance this inititative belongs to
  //  1. Get the actual instance
  const graphQL = new GraphQL()
  const queries = new Queries()

  let initiative = null
  const initiativeQuery = queries.get('initiative', `(instance: "${req.params.id}", slug: "${req.params.slug}")`)
  console.log(initiativeQuery)
  initiative = await graphQL.fetch({
    query: initiativeQuery
  }, process.env.HANDSHAKE)
  console.log(initiative)

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
      let isFeatured = false
      if (req.fields.isFeatured) isFeatured = true
      let description = ''
      if (req.fields.description) description = req.fields.description
      let mutation = mutations.get('updateInitiative', `(instance: "${req.params.id}", id: "${initiative.id}", title: "${req.fields.title}", isActive: ${isActive}, isFeatured: ${isFeatured}, description: "${description}")`)
      const payload = {
        query: mutation
      }
      await graphQL.fetch(payload, process.env.HANDSHAKE)
      return setTimeout(() => {
        res.redirect(req.templateValues.selfURL)
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
          res.redirect(req.templateValues.selfURL)
        }, 1000)
      }
    }

    //  If we are adding or removing the photo from the homepage
    if (req.fields.action === 'homepagePhoto' || req.fields.action === 'unhomepagePhoto') {
      // Set approving or rejecting the photo
      let homepage = false
      if (req.fields.action === 'homepagePhoto') {
        homepage = true
      }

      const mutation = mutations.get('updatePhoto', `(instance: "${req.params.id}", id: "${req.fields.photoId}", homepage: ${homepage})`)
      if (mutation) {
        const payload = {
          query: mutation
        }
        await graphQL.fetch(payload, process.env.HANDSHAKE)
        return setTimeout(() => {
          res.redirect(req.templateValues.selfURL)
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
          res.redirect(req.templateValues.selfURL)
        }, 1000)
      }
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

  //  Lets get the photos for this initiative
  let photos = null
  let page = 0
  let perPage = 20
  if (req.params.page) page = req.params.page - 1

  let photosQuery = queries.get('photos', `(instance: "${req.params.id}", initiatives: "${req.params.slug}", sort: "desc", sort_field: "uploaded", page: ${page}, per_page: ${perPage})`)
  photos = await graphQL.fetch({
    query: photosQuery
  }, process.env.HANDSHAKE)

  if (photos.data.photos && photos.data.photos.length > 0 && photos.data.photos[0]._sys && photos.data.photos[0]._sys.pagination) {
    req.templateValues.photosPagination = utils.paginator(photos.data.photos[0]._sys.pagination, `/administration/instances/${req.params.id}/initiatives/${req.params.slug}/page/`, 2)
  }

  if (photos.data && photos.data.photos) {
    req.templateValues.photos = photos.data.photos.map((photo) => {
      if (photo.tags) {
        if (Array.isArray(photo.tags)) {
          photo.tags = photo.tags.join(', ')
        } else {
          photo.tags = [photo.tags]
        }
      }
      return photo
    })
  }

  const config = new Config()
  req.templateValues.cloudinary = config.get('cloudinary')
  req.templateValues.instance = instance
  req.templateValues.initiative = initiative

  return res.render('administration/instances/initiative/index', req.templateValues)
}