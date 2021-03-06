const Queries = require('../../../classes/queries')
const Mutations = require('../../../classes/mutations')
const GraphQL = require('../../../classes/graphQL')
const Config = require('../../../classes/config')
const utils = require('../../../modules/utils')
const fs = require('fs')
const path = require('path')
const {
  Parser
} = require('json2csv')

const initiatives = require('./initiatives')
const people = require('./people')
const person = require('./person')
const photo = require('./photo')

exports.initiatives = initiatives
exports.people = people
exports.person = person
exports.photo = photo

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

  //  Get access to the config object and grab all the language information for this
  //  instance
  const config = new Config()
  const filename = path.join(__dirname, '..', '..', '..', '..', 'lang', 'langs.json')
  const langsMap = JSON.parse(fs.readFileSync(filename, 'utf-8'))
  let languages = await config.get('languages')
  if (!languages) languages = []
  let defaultLanguage = config.get('defaultLanguage')
  if (!defaultLanguage) defaultLanguage = 'en'

  const graphQL = new GraphQL()
  const queries = new Queries()

  //  If we have been told to do something, do it here
  let results = []
  if (req.fields && req.fields.action) {
    let mutation = null
    const mutations = new Mutations()

    //  ADDING AN INITIATIVE
    if (req.fields.action === 'addInitiative' && req.fields.title && req.fields.title !== '') {
      let description = ''
      if (req.fields.description) description = req.fields.description
      mutation = mutations.get('createInitiative', `(instance: "${req.params.id}", title: "${req.fields.title}", description: "${description}")`)
    }

    //  UPDATING AN INSTANCE
    if (req.fields.action === 'updateInstance' && req.fields.title && req.fields.title !== '') {
      const instanceMutationValues = [
        `id: "${req.params.id}"`,
        `title: "${req.fields.title}"`
      ]
      if (req.fields[`colour`]) {
        const colour = req.fields[`colour`].replace('#', '')
        instanceMutationValues.push(`colour: ${JSON.stringify(colour)}`)
      }

      //  See if a file has been uploaded
      if (req.files && req.files.logo && req.files.logo.size < 300000) {
        const bitmap = fs.readFileSync(req.files.logo.path)
        // convert binary data to base64 encoded string
        const encoded = Buffer.from(bitmap).toString('base64')
        if (encoded.length <= 100000) {
          instanceMutationValues.push(`logo: ${JSON.stringify(encoded)}`)
        }
      }
      mutation = mutations.get('updateInstance', `(${instanceMutationValues.join(',')})`)
    }

    //  UPDATING THE LANGUAGES
    if (req.fields.action === 'updateLanguages') {
      const newLangs = Object.entries(req.fields).map((field) => {
        const key = field[0]
        const keySplit = key.split('_')
        if (keySplit.length !== 2) return false
        if (keySplit[0] !== 'code') return false
        return keySplit[1]
      }).filter(Boolean)
      const defaultLanguage = req.fields.default
      const instanceMutationValues = [
        `id: "${req.params.id}"`,
        `languages: ${JSON.stringify(newLangs)}`,
        `defaultLanguage: "${defaultLanguage}"`
      ]
      mutation = mutations.get('updateInstance', `(${instanceMutationValues.join(',')})`)
    }

    //  DELETING AN INSTANCE
    if (req.fields.action === 'deleteInstance') {
      mutation = mutations.get('deleteInstance', `(id: "${req.params.id}")`)
    }

    //  APPROVE OR REJECT A PHOTO
    if (req.fields.action === 'approvePhoto' || req.fields.action === 'rejectPhoto') {
      // Set approving or rejecting the photo
      const approved = (req.fields.action === 'approvePhoto')
      mutation = mutations.get('updatePhoto', `(instance: "${req.params.id}", id: "${req.fields.photoId}", reviewed: true, approved: ${approved})`)
    }

    //  If we are adding or removing the photo from the homepage
    if (req.fields.action === 'homepagePhoto' || req.fields.action === 'unhomepagePhoto') {
      // Set approving or rejecting the photo
      const homepage = (req.fields.action === 'homepagePhoto')
      mutation = mutations.get('updatePhoto', `(instance: "${req.params.id}", id: "${req.fields.photoId}", homepage: ${homepage})`)
    }

    if (req.fields.action === 'deletePhoto') {
      mutation = mutations.get('deletePhoto', `(instance: "${req.params.id}", id: "${req.fields.photoId}")`)
    }

    //  If we are (un)suspending a user
    if (req.fields.action === 'unsuspendPerson' || req.fields.action === 'suspendPerson') {
      const suspended = (req.fields.action === 'suspendPerson')
      mutation = mutations.get('updatePerson', `(instance: "${req.params.id}", id: "${req.fields.personId}", suspended: ${suspended})`)
    }
    //  If we are (un)deleting a user
    if (req.fields.action === 'undeletePerson' || req.fields.action === 'deletePerson') {
      const deleted = (req.fields.action === 'deletePerson')
      mutation = mutations.get('updatePerson', `(instance: "${req.params.id}", id: "${req.fields.personId}", deleted: ${deleted})`)
    }

    if (mutation) {
      const payload = {
        query: mutation
      }
      await graphQL.fetch(payload, process.env.HANDSHAKE)
      return res.redirect(req.templateValues.selfURL)
    }

    if (req.fields.action === 'createCSV') {
      if (!global.csvs) global.csvs = {}
      if (!global.csvs[req.params.id]) global.csvs[req.params.id] = {}

      global.csvs[req.params.id].progress = {
        status: 'started',
        lastTick: new Date(),
        finished: false,
        page: 0,
        maxPage: null,
        photos: {
          page: {}
        }
      }

      //  Kick off the loading of the CSV
      utils.makeCSV(req.params.id)
      return setTimeout(() => {
        res.redirect(`${req.templateValues.selfURL}#downloadCSV`)
      }, 1000)
    }

    if (req.fields.action === 'downloadCSV') {
      if (!global.csvs || !global.csvs[req.params.id] || global.csvs[req.params.id].progress.finished !== true) {
        return setTimeout(() => {
          res.redirect(`${req.templateValues.selfURL}#downloadCSV`)
        }, 1000)
      }

      //  Grab all the rows out of the data
      let allrows = []
      for (let page = 0; page <= global.csvs[req.params.id].progress.maxPage; page++) {
        allrows = [...allrows, ...global.csvs[req.params.id].progress.photos.page[page]]
      }
      const cloud = config.get('cloudinary')
      allrows = allrows.map((row) => {
        //  List up the social media
        if (row.socialMedias) row.socialMedias = row.socialMedias.join()
        //  Grab the image data
        if (row.data) {
          if (row.data.height) row['image.height'] = row.data.height
          if (row.data.width) row['image.width'] = row.data.width
          if (row.data.public_id && row.data.version) row['image.url'] = `http://res.cloudinary.com/${cloud.cloud_name}/image/upload/v${row.data.version}/${row.data.public_id}.jpg`
          delete row.data
        }
        //  Grab the person data
        if (row.person) {
          if (row.person.id) row['person.id'] = row.person.id
          if (row.person.username) row['person.username'] = row.person.username
          if (row.person.slug) row['person.slug'] = row.person.slug
          delete row.person
        }
        delete row._sys
        return row
      })
      const json2csvParser = new Parser()
      const csv = json2csvParser.parse(allrows)
      res.setHeader('Content-disposition', 'attachment; filename=testing.csv')
      res.set('Content-Type', 'text/csv')
      return res.status(200).send(csv)
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
      req.templateValues.photosPagination = utils.paginator(allPhotos.data.photos[0]._sys.pagination, `/administration/instances/${req.params.id}/page/`, 2)
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

  //  Get some the people for this instance
  let people = null
  let peoplePage = 0
  let peoplePerPage = 20
  let peopleQuery = queries.get('people', `(instance: "${req.params.id}", page: ${peoplePage}, per_page: ${peoplePerPage}, photos_per_page: 1)`)

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
  }
  //  See if we need to show more people
  if (people.length > 0 && people[0]._sys && people[0]._sys.pagination) {
    if (people[0]._sys.pagination.page < people[0]._sys.pagination.maxPage) req.templateValues.showMorePeople = true
  }
  req.templateValues.people = people

  //  See if we have a CSV already in global
  let csvProgress = null
  if (global.csvs && global.csvs[req.templateValues.instance.id]) {
    csvProgress = global.csvs[req.templateValues.instance.id].progress
  }
  req.templateValues.csvProgress = csvProgress

  //  Grab the languages we can use
  const langs = Object.entries(langsMap.lang2code).map((langMap) => {
    if (!languages.includes(langMap[1])) return false
    const newLang = {
      name: langMap[0],
      code: langMap[1],
      selected: false
    }
    if (req.templateValues.instance.languages && req.templateValues.instance.languages.includes(langMap[1])) newLang.selected = true
    return newLang
  }).filter(Boolean)
  if (req.templateValues.instance.defaultLanguage) defaultLanguage = req.templateValues.instance.defaultLanguage
  req.templateValues.langs = langs
  req.templateValues.defaultLanguage = defaultLanguage

  req.templateValues.cloudinary = config.get('cloudinary')
  return res.render('administration/instances/instance', req.templateValues)
}
