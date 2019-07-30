const fs = require('fs')
const path = require('path')
const Config = require('../../../classes/config')

exports.index = async (req, res) => {
  //  Bounce the user is they are not an admin user
  if (!req.user || !req.user.roles || !req.user.roles.isAdmin) return res.render('main/redirect', req.templateValues)

  //  Read in the languages
  const filename = path.join(__dirname, '..', '..', '..', '..', 'lang', 'langs.json')
  const langsMap = JSON.parse(fs.readFileSync(filename, 'utf-8'))

  //  Grab the stuff from confif that tells use the default languages used
  const configObj = new Config()
  let languages = await configObj.get('languages')
  if (!languages) languages = []
  let defaultLanguage = configObj.get('defaultLanguage')
  if (!defaultLanguage) defaultLanguage = 'en'

  //  Check to see if we have been passed an action
  if (req.fields.action) {
    if (req.fields.action === 'updateLanguages') {
      const newLangs = Object.entries(req.fields).map((field) => {
        const key = field[0]
        const keySplit = key.split('_')
        if (keySplit.length !== 2) return false
        if (keySplit[0] !== 'code') return false
        return keySplit[1]
      }).filter(Boolean)
      await configObj.set('languages', newLangs)
    }

    if (req.fields.action === 'updateDefaultLanguage' && req.fields.default) {
      await configObj.set('defaultLanguage', req.fields.default)
    }

    return res.redirect('/administration/languages')
  }

  //  Convert to something more useful for the frontend to work with
  const langs = Object.entries(langsMap.lang2code).map((langMap) => {
    const newLang = {
      name: langMap[0],
      code: langMap[1],
      selected: false
    }
    if (languages.includes(langMap[1])) newLang.selected = true
    return newLang
  })

  req.templateValues.langs = langs
  req.templateValues.defaultLanguage = defaultLanguage
  return res.render('administration/languages/index', req.templateValues)
}
