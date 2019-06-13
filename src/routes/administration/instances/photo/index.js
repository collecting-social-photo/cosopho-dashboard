const Queries = require('../../../../classes/queries')
const GraphQL = require('../../../../classes/graphQL')
const Config = require('../../../../classes/config')
const Mutations = require('../../../../classes/mutations')

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

  //  Ok, now we checked all that action stuff, lets go get the photo too!
  let photo = null
  let photoQuery = queries.get('photo', `(instance: "${req.params.id}", id: "${req.params.photoId}")`)

  photo = await graphQL.fetch({
    query: photoQuery
  }, process.env.HANDSHAKE)

  if (photo.data && photo.data.photo) {
    photo = photo.data.photo
  } else {
    return res.redirect(`/administration/instances/${req.params.id}`)
  }
  req.templateValues.photo = photo

  //  As we know we're allowed to do stuff to this instance, we check to see
  //  if want to actually do anything with it.
  if (req.fields && req.fields.action) {
    const mutations = new Mutations()

    //  If we are approving or rejecting the photo
    if (req.fields.action === 'approvePhoto' || req.fields.action === 'rejectPhoto') {
      // Set approving or rejecting the photo
      let approved = false
      if (req.fields.action === 'approvePhoto') {
        approved = true
      }

      const mutation = mutations.get('updatePhoto', `(instance: "${req.params.id}", id: "${req.params.photoId}", reviewed: true, approved: ${approved})`)
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
      const mutation = mutations.get('deletePhoto', `(instance: "${req.params.id}", id: "${req.params.photoId}")`)
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

    if (req.fields.action === 'updatePhoto') {
      const photoMutationValues = [
        `instance: "${req.params.id}"`,
        `id: "${req.params.photoId}"`
      ]
      if (req.fields[`title`]) photoMutationValues.push(`title: ${JSON.stringify(req.fields[`title`])}`)
      if (req.fields[`story`]) photoMutationValues.push(`story: ${JSON.stringify(req.fields[`story`])}`)
      if (req.fields[`license`]) photoMutationValues.push(`license: "${req.fields[`license`]}"`)
      if (req.fields[`location`]) photoMutationValues.push(`location: ${JSON.stringify(req.fields[`location`])}`)
      const d = new Date(req.fields[`date`])
      if (req.fields[`date`]) photoMutationValues.push(`date: "${`${d}`}"`)
      if (req.fields[`make`]) photoMutationValues.push(`make: "${req.fields[`make`]}"`)
      if (req.fields[`model`]) photoMutationValues.push(`model: "${req.fields[`model`]}"`)
      if (req.fields[`aperture`]) photoMutationValues.push(`aperture: ${parseFloat(req.fields[`aperture`])}`)
      if (req.fields[`shutterSpeed`]) photoMutationValues.push(`shutterSpeed: ${parseFloat(req.fields[`shutterSpeed`])}`)
      if (req.fields[`ISO`]) photoMutationValues.push(`ISO: ${parseInt(req.fields[`ISO`])}`)
      if (req.fields[`focalLength`]) photoMutationValues.push(`focalLength: ${parseInt(req.fields[`focalLength`])}`)

      if (req.fields[`tags`]) {
        let tags = req.fields[`tags`].split(',').map((tag) => tag.trim())
        photoMutationValues.push(`tags: ${JSON.stringify(tags)}`)
      }

      const where = []
      const socialMedias = ['facebook', 'instagram', 'snapchat', 'twitter', 'other']
      socialMedias.forEach((sm) => {
        if (req.fields[`where_${sm}`]) where.push(sm)
      })
      if (where.length > 0) photoMutationValues.push(`socialMedias: ${JSON.stringify(where)}`)

      const mutation = mutations.get('updatePhoto', `(${photoMutationValues.join(',')})`)
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

  const config = new Config()
  req.templateValues.cloudinary = config.get('cloudinary')
  req.templateValues.photo = photo
  req.templateValues.instance = instance

  return res.render('administration/instances/photo/index', req.templateValues)
}
