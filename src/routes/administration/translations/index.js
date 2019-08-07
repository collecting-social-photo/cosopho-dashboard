const Queries = require('../../../classes/queries')
const Mutations = require('../../../classes/mutations')
const GraphQL = require('../../../classes/graphQL')
const Config = require('../../../classes/config')
const fs = require('fs')
const path = require('path')

exports.index = async (req, res) => {
  let isAdmin = true
  let isDeveloper = false

  //  Bounce the user is they are not an admin user
  if (!req.user || !req.user.roles || !('isAdmin' in req.user.roles) || req.user.roles.isAdmin === false) {
    isAdmin = false
    //  If they are the developer, then they are allowed to be here
    if (req.user && req.user.roles && 'isDeveloper' in req.user.roles && req.user.roles.isDeveloper === true) {
      isDeveloper = true
    } else {
      return res.redired('/', req.templateValues)
    }
  }
  const graphQL = new GraphQL()
  const queries = new Queries()

  //  Grab all the instances
  let instancesQuery = null
  if (req.user && req.user.instances) {
    instancesQuery = queries.get('instances', `(ids: ${JSON.stringify(req.user.instances)})`)
  }
  if (instancesQuery) {
    const results = await graphQL.fetch({
      query: instancesQuery
    }, process.env.HANDSHAKE)
    if (results.data && results.data.instances) {
      req.templateValues.instances = results.data.instances
    }
  }

  //  Make sure the instance is valid
  if (req.params.instance && !req.templateValues.instances.map((i) => i.id).includes(req.params.instance)) {
    return res.render('administration/translations/pickInstance', req.templateValues)
  }

  if (!isAdmin && isDeveloper && !('instance' in req.params)) {
    return res.render('administration/translations/pickInstance', req.templateValues)
  }

  //  Read in the languages
  const filename = path.join(__dirname, '..', '..', '..', '..', 'lang', 'langs.json')
  const langsMap = JSON.parse(fs.readFileSync(filename, 'utf-8'))

  const configObj = new Config()
  let languages = await configObj.get('languages')
  if (!languages) languages = []
  let defaultLanguage = configObj.get('defaultLanguage')
  if (!defaultLanguage) defaultLanguage = 'en'

  if (languages.length === 0) return res.redirect('/administration/languages')

  if (!req.params.primaryLanguage || !req.params.secondaryLanguage) {
    if ('instance' in req.params) {
      return res.redirect(`/administration/instances/${req.params.instance}/translations/${defaultLanguage}/${languages[0]}`)
    }
    return res.redirect(`/administration/translations/${defaultLanguage}/${languages[0]}`)
  }

  const mutations = new Mutations()

  //  Check to see if we have been passed an update
  if (req.fields.action && req.fields.action === 'updateTranslation') {
    //  Go grab the strings we already have for this token
    const checkToken = req.fields.id.split('.')
    checkToken.pop()
    if (req.params.instance) {
      checkToken.shift()
      checkToken.unshift(req.params.instance)
    }
    const checkQuery = queries.get('stringsShort', `(token: "${checkToken.join('.')}", language: ["${req.params.primaryLanguage}", "${req.params.secondaryLanguage}"])`)
    let checkResults = null
    checkResults = await graphQL.fetch({
      query: checkQuery
    }, process.env.HANDSHAKE)
    let checkStrings = []
    if (checkResults.data && checkResults.data.strings) {
      checkStrings = checkResults.data.strings
    }
    //  Now find out if we already have an entry for this language, in which case we may need to do an update
    //  or if we need to create a new record
    let foundPrimary = false
    let foundSecondary = false
    let changedPrimary = false
    let changedSeconary = false

    checkStrings.forEach((record) => {
      if (record.language === req.params.primaryLanguage) {
        foundPrimary = true
        if (req.fields.primary.trim() !== record.string) changedPrimary = true
      }
      if (record.language === req.params.secondaryLanguage) {
        foundSecondary = true
        if (req.fields.secondary.trim() !== record.string) changedSeconary = true
      }
    })

    //  See if we need to update or create a new record
    let mutation = null
    if (foundPrimary && changedPrimary) {
      mutation = mutations.get('updateString', `(id: "${checkToken.join('.')}.${req.params.primaryLanguage}", string:"${req.fields.primary.trim()}")`)
      const payload = {
        query: mutation
      }
      await graphQL.fetch(payload, configObj.get('handshake'))
    }
    if (!foundPrimary && req.fields.primary.trim() !== '') {
      if (req.params.instance) {
        mutation = mutations.get('createString', `(instance: "${req.params.instance}", section: "${req.fields.section}", stub: "${req.fields.stub}", language: "${req.params.primaryLanguage}", string:"${req.fields.primary.trim()}")`)
      } else {
        mutation = mutations.get('createString', `(section: "${req.fields.section}", stub: "${req.fields.stub}", language: "${req.params.primaryLanguage}", string:"${req.fields.primary.trim()}")`)
      }
      const payload = {
        query: mutation
      }
      await graphQL.fetch(payload, configObj.get('handshake'))
    }

    if (foundSecondary && changedSeconary) {
      mutation = mutations.get('updateString', `(id: "${checkToken.join('.')}.${req.params.secondaryLanguage}", string:"${req.fields.secondary.trim()}")`)
      const payload = {
        query: mutation
      }
      await graphQL.fetch(payload, configObj.get('handshake'))
    }
    if (!foundSecondary && req.fields.secondary.trim() !== '') {
      if (req.params.instance) {
        mutation = mutations.get('createString', `(instance: "${req.params.instance}", section: "${req.fields.section}", stub: "${req.fields.stub}", language: "${req.params.secondaryLanguage}", string:"${req.fields.secondary.trim()}")`)
      } else {
        mutation = mutations.get('createString', `(section: "${req.fields.section}", stub: "${req.fields.stub}", language: "${req.params.secondaryLanguage}", string:"${req.fields.secondary.trim()}")`)
      }
      const payload = {
        query: mutation
      }
      await graphQL.fetch(payload, configObj.get('handshake'))
    }

    return setTimeout(() => {
      res.redirect(req.templateValues.selfURL)
    }, 1000)
  }

  //  If we have been given a new stub and set of strings to add
  if (req.fields.action && req.fields.action === 'addTranslations') {
    //  Go grab the strings we already have for this token
    let mutation = null
    if (req.fields.primary && req.fields.primary.trim() !== '') {
      mutation = mutations.get('createString', `(section: "${req.fields.section}", stub: "${req.fields.stub}", language: "${req.params.primaryLanguage}", string:"${req.fields.primary.trim()}")`)
      const payload = {
        query: mutation
      }
      await graphQL.fetch(payload, req.user.apitoken)
    }
    if (req.fields.secondary && req.fields.secondary.trim() !== '') {
      mutation = mutations.get('createString', `(section: "${req.fields.section}", stub: "${req.fields.stub}", language: "${req.params.secondaryLanguage}", string:"${req.fields.secondary.trim()}")`)
      const payload = {
        query: mutation
      }
      await graphQL.fetch(payload, req.user.apitoken)
    }
    return setTimeout(() => {
      res.redirect(req.templateValues.selfURL)
    }, 1000)
  }

  //  Grab the primary
  let results = null
  let query = queries.get('stringsShort', `(instance: "${process.env.KEY}", language: ["${req.params.primaryLanguage}", "${req.params.secondaryLanguage}"])`)
  results = await graphQL.fetch({
    query: query
  }, process.env.HANDSHAKE)
  let primaryStrings = []
  if (results.data && results.data.strings) {
    primaryStrings = results.data.strings
  }

  //  Turn the strings into a JSON object that the template will understand
  const strings = {}
  primaryStrings.forEach((record) => {
    if (!strings[record.section]) strings[record.section] = {}
    if (!strings[record.section][record.token]) {
      let token = record.id.split('.')
      token[0] = 'i18n'
      token.pop()
      token = token.join('.')
      strings[record.section][record.token] = {
        id: record.id,
        token,
        stub: record.stub,
        strings: {}
      }
    }
    if (!strings[record.section][record.token].strings[record.language]) strings[record.section][record.token].strings[record.language] = record.string
  })

  //  Now if we have an instance then we need to get the strings for that too
  //  Which will overwrite the current strings
  if (req.params.instance && req.templateValues.instances.map((i) => i.id).includes(req.params.instance)) {
    results = null
    query = queries.get('stringsShort', `(instance: "${req.params.instance}", language: ["${req.params.primaryLanguage}", "${req.params.secondaryLanguage}"])`)
    results = await graphQL.fetch({
      query: query
    }, process.env.HANDSHAKE)
    let instanceStrings = []
    if (results.data && results.data.strings) {
      instanceStrings = results.data.strings
    }

    //  Turn the strings into a JSON object that the template will understand
    instanceStrings.forEach((record) => {
      record.token = record.token.replace(req.params.instance, process.env.KEY)
      if (!strings[record.section]) strings[record.section] = {}
      if (!strings[record.section][record.token]) {
        let token = record.id.split('.')
        token[0] = 'i18n'
        token.pop()
        token = token.join('.')
        strings[record.section][record.token] = {
          id: record.id,
          token,
          stub: record.stub,
          strings: {}
        }
      }
      if (!strings[record.section][record.token].strings[record.language]) strings[record.section][record.token].strings[record.language] = record.string
      strings[record.section][record.token].strings[record.language] = record.string
    })
  }

  req.templateValues.languages = languages

  req.templateValues.instance = req.params.instance
  req.templateValues.isAdmin = isAdmin
  req.templateValues.isDeveloper = isDeveloper
  req.templateValues.strings = strings
  req.templateValues.primaryLanguage = req.params.primaryLanguage
  req.templateValues.primaryLanguageLong = langsMap.code2lang[req.params.primaryLanguage]

  req.templateValues.secondaryLanguage = req.params.secondaryLanguage
  req.templateValues.secondaryLanguageLong = langsMap.code2lang[req.params.secondaryLanguage]

  return res.render('administration/translations/index', req.templateValues)
}
