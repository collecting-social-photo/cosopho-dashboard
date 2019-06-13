const Queries = require('../../../classes/queries')
const Mutations = require('../../../classes/mutations')
const GraphQL = require('../../../classes/graphQL')
const Config = require('../../../classes/config')

const initiatives = require('./initiatives')
const people = require('./people')
const person = require('./person')
const utils = require('../../../modules/utils')

exports.initiatives = initiatives
exports.people = people
exports.person = person

exports.index = async (req, res) => {
  //  Bounce the user is they are not an admin user
  if (!req.user || !req.user.roles || !req.user.roles.isAdmin) {
    //  Check to see if they are a user who actually has control of this instance
    if (req.user && req.user.instances) {
      // Actually this user controls this thing, we are good
    } else {
      return res.render('main/redirect', req.templateValues)
    }
  }

  let isNotAdmin = true
  if (req.user && req.user.roles && req.user.roles.isAdmin && req.user.roles.isAdmin === true) {
    isNotAdmin = false
  }

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
        res.redirect(req.templateValues.selfURL)
      }, 1000)
    }
  }

  //  Grab all the instances
  let query = queries.get('instances', '')
  if (isNotAdmin) {
    query = queries.get('instances', `(ids: ${JSON.stringify(req.user.instances)})`)
  }
  results = await graphQL.fetch({
    query: query
  }, process.env.HANDSHAKE)
  if (results.data && results.data.instances) {
    req.templateValues.instances = results.data.instances
  }

  return res.render('administration/instances/index', req.templateValues)
}

exports.instance = async (req, res) => {
  //  Bounce the user is they are not an admin user
  if (!req.user || !req.user.roles || !req.user.roles.isAdmin) {
    //  Check to see if they are a user who actually has control of this instance
    if (req.user && req.user.instances && req.user.instances.includes(req.params.id)) {
      // Actually this user controls this thing, we are good
    } else {
      return res.redirect('/administration/instances')
    }
  }

  const graphQL = new GraphQL()
  const queries = new Queries()

  //  If we have been told to do something, do it here
  let results = []
  if (req.fields && req.fields.action) {
    const mutations = new Mutations()

    if (req.fields.action === 'addInitiative' && req.fields.title && req.fields.title !== '') {
      let description = ''
      if (req.fields.description) description = req.fields.description
      let mutation = mutations.get('createInitiative', `(instance: "${req.params.id}", title: "${req.fields.title}", description: "${description}")`)
      const payload = {
        query: mutation
      }
      results = await graphQL.fetch(payload, process.env.HANDSHAKE)
      return setTimeout(() => {
        res.redirect(req.templateValues.selfURL)
      }, 1000)
    }

    if (req.fields.action === 'updateInstance' && req.fields.title && req.fields.title !== '') {
      let mutation = mutations.get('updateInstance', `(id: "${req.params.id}", title:"${req.fields.title}")`)
      const payload = {
        query: mutation
      }
      results = await graphQL.fetch(payload, process.env.HANDSHAKE)
      return setTimeout(() => {
        res.redirect(req.templateValues.selfURL)
      }, 1000)
    }

    if (req.fields.action === 'deleteInstance') {
      let mutation = mutations.get('deleteInstance', `(id: "${req.params.id}")`)
      const payload = {
        query: mutation
      }
      results = await graphQL.fetch(payload, process.env.HANDSHAKE)
      return setTimeout(() => {
        res.redirect(`/${req.templateValues.selectedLang}/administration/instances`)
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

  //  Grab the instance
  let query = queries.get('instance', `(id: "${req.params.id}")`)
  results = await graphQL.fetch({
    query: query
  }, process.env.HANDSHAKE)

  if (results.data && results.data.instance) {
    if (results.data.instance.initiatives) {
      let newInitiatives = []
      for (const initiative of results.data.instance.initiatives) {
        let photos = null
        let photosQuery = queries.get('photos', `(instance: "${req.params.id}", initiatives: "${initiative.slug}", per_page: 1)`)
        photos = await graphQL.fetch({
          query: photosQuery
        }, process.env.HANDSHAKE)

        if (photos.data && photos.data.photos && photos.data.photos.length === 1 && photos.data.photos[0]._sys && photos.data.photos[0]._sys.pagination && photos.data.photos[0]._sys.pagination.total) {
          initiative.reviewCount = photos.data.photos[0]._sys.pagination.total
        }
        newInitiatives.push(initiative)
      }
      results.data.instance.initiatives = newInitiatives
    }
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
  }, process.env.HANDSHAKE)

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

  //  Grab all the photos for this instance
  //  Lets get the photos for this initiatives
  let allPhotos = null
  let page = 0
  let perPage = 20
  if (req.params.page) page = req.params.page - 1
  let photosQuery = queries.get('photos', `(instance: "${req.params.id}", sort: "desc", sort_field: "uploaded", page: ${page}, per_page: ${perPage})`)
  allPhotos = await graphQL.fetch({
    query: photosQuery
  }, process.env.HANDSHAKE)

  if (allPhotos.data && allPhotos.data.photos) {
    if (allPhotos.data.photos.length > 0 && allPhotos.data.photos[0]._sys && allPhotos.data.photos[0]._sys.pagination) {
      req.templateValues.pagination = utils.paginator(allPhotos.data.photos[0]._sys.pagination, `/administration/instances/${req.params.id}/page/`, 2)
    }

    req.templateValues.photos = allPhotos.data.photos.map((photo) => {
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
  return res.render('administration/instances/instance', req.templateValues)
}
