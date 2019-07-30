const Queries = require('../../../classes/queries')
const GraphQL = require('../../../classes/graphQL')
const Config = require('../../../classes/config')
const fs = require('fs')
const path = require('path')

exports.index = async (req, res) => {
  //  Bounce the user is they are not an admin user
  if (!req.user || !req.user.roles || !req.user.roles.isAdmin) return res.render('main/redirect', req.templateValues)

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
    return res.redirect(`/administration/translations/${defaultLanguage}/${languages[0]}`)
  }

  const graphQL = new GraphQL()
  const queries = new Queries()

  //  Grab the primary and secondary strings
  let results = null
  let query = queries.get('stringsShort', `(language: "${req.params.primaryLanguage}")`)
  results = await graphQL.fetch({
    query: query
  }, process.env.HANDSHAKE)
  let primaryStrings = []
  if (results.data && results.data.strings) {
    primaryStrings = results.data.strings
  }

  results = null
  query = queries.get('stringsShort', `(language: "${req.params.secondaryLanguage}")`)
  results = await graphQL.fetch({
    query: query
  }, process.env.HANDSHAKE)
  let secondaryStrings = []
  if (results.data && results.data.strings) {
    secondaryStrings = results.data.strings
  }

  //  Turn the strings into a JSON object that the template will understand
  const strings = {}

  primaryStrings.forEach((record) => {
    if (!strings[record.section]) strings[record.section] = {}
    if (!strings[record.section][record.token]) {
      let token = record.id.split('.')
      token[0] = 'i18n'
      token = token.join('.')
      strings[record.section][record.token] = {
        id: record.id,
        token,
        strings: {}
      }
    }
    if (!strings[record.section][record.token].strings[record.language]) strings[record.section][record.token].strings[record.language] = record.string
  })

  secondaryStrings.forEach((record) => {
    if (!strings[record.section]) strings[record.section] = {}
    if (!strings[record.section][record.token]) {
      let token = record.id.split('.')
      token[0] = 'i18n'
      token = token.join('.')
      strings[record.section][record.token] = {
        id: record.id,
        token,
        strings: {}
      }
    }
    if (!strings[record.section][record.token].strings[record.language]) strings[record.section][record.token].strings[record.language] = record.string
  })

  req.templateValues.languages = languages

  req.templateValues.strings = strings
  req.templateValues.primaryLanguage = req.params.primaryLanguage
  req.templateValues.primaryLanguageLong = langsMap.code2lang[req.params.primaryLanguage]

  req.templateValues.secondaryLanguage = req.params.secondaryLanguage
  req.templateValues.secondaryLanguageLong = langsMap.code2lang[req.params.secondaryLanguage]

  return res.render('administration/translations/index', req.templateValues)
}
