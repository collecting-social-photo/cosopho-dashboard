const fs = require('fs')
const path = require('path')
const langDir = path.join(__dirname, '../../lang/own')
const express = require('express')
const passport = require('passport')
const router = express.Router()
const User = require('../classes/user')
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn()
const Config = require('../classes/config')
const getDefaultTemplateData = require('../helpers').getDefaultTemplateData

const config = require('./config')
const main = require('./main')

//  Redirect to https, make sure...
//  app.enable('trust proxy')
//  is set in server.js
router.use(function (req, res, next) {
  let remoteAccess = true

  //  Because of the way we are hosting we need to do an extra weird check
  //  about coming in from outside or via a ip:port before we tie up the whole
  //  lot in a knot.
  const hostSplit = req.headers['host'].split(':')
  if (hostSplit.length > 1) {
    if (hostSplit[1] === process.env.PORT) {
      remoteAccess = false
    }
  }
  if (!(req.secure) && process.env.REDIRECT_HTTPS === 'true' && remoteAccess === true) {
    var secureUrl = 'https://' + req.headers['host'] + req.url
    res.writeHead(301, {
      Location: secureUrl
    })
    res.end()
  } else {
    next()
  }
})

// ############################################################################
//
/*
 * Always create a templateValues object that gets passed to the
 * templates. The config object from global (this allows use to
 * manipulate it here if we need to) and the user if one exists
 */
//
// ############################################################################
router.use(function (req, res, next) {
  req.templateValues = getDefaultTemplateData()
  const configObj = new Config()
  req.config = configObj
  req.templateValues.config = req.config

  const defaultLang = 'en'
  let selectedLang = 'en'

  if (req.user === undefined) {
    req.user = null
  } else {
    //  Shortcut the roles
    if ('user_metadata' in req.user && 'roles' in req.user.user_metadata) {
      req.user.roles = req.user.user_metadata.roles
    } else {
      req.user.roles = {
        isAdmin: false,
        isDeveloper: false,
        isStaff: false
      }
    }
    if ('user_metadata' in req.user && 'apitoken' in req.user.user_metadata) {
      req.user.apitoken = req.user.user_metadata.apitoken
    } else {
      req.user.apitoken = null
    }
  }

  //  Read in the language files and overlay the selected langage on the
  //  default one
  //  TODO: Cache all this for about 5 minutes
  //  TODO: break the cache if we update strings
  const langs = fs.readdirSync(langDir).filter((lang) => {
    const langSplit = lang.split('.')
    if (langSplit.length !== 3) return false
    if (langSplit[0] !== 'strings' || langSplit[2] !== 'json') return false
    return true
  }).map((lang) => {
    const langSplit = lang.split('.')
    return langSplit[1]
  })
  req.templateValues.langs = langs

  //  If we are *not* on a login, logout or callback url then
  //  we need to check for langage stuff
  const nonLangUrls = ['login', 'logout', 'callback', 'images', 'api']
  const urlClean = req.url.split('?')[0]
  const urlSplit = urlClean.split('/')
  if (urlSplit[0] === '') urlSplit.shift()
  if (!nonLangUrls.includes(urlSplit[0])) {
    //  Check to see if the first entry isn't a language,
    //  if it's not pop the selectedLang into the url
    //  and try again
    if (!(langs.includes(urlSplit[0]))) {
      if (req.user && req.user.lang) {
        return res.redirect(`/${req.user.lang}${req.url}`)
      }
      return res.redirect(`/${defaultLang}${req.url}`)
    } else {
      selectedLang = urlSplit[0]
    }

    //  Now we can work out the *rest* of the URL _without_ the
    //  langage part
    urlSplit.shift()
    req.templateValues.remainingUrl = `/${urlSplit.join('/')}`
  }
  if (req.user !== null) req.user.lang = selectedLang
  req.templateValues.user = req.user

  const i18n = JSON.parse(fs.readFileSync(path.join(langDir, `strings.${defaultLang}.json`)))
  if (selectedLang !== defaultLang) {
    const selectedi18n = JSON.parse(fs.readFileSync(path.join(langDir, `strings.${selectedLang}.json`)))
    Object.entries(selectedi18n).forEach((branch) => {
      const key = branch[0]
      const values = branch[1]
      if (!(key in i18n)) i18n[key] = {}
      Object.assign(i18n[key], values)
    })
  }
  req.templateValues.selectedLang = selectedLang
  req.templateValues.dbLang = 'en'
  req.templateValues.i18n = i18n

  //  If there is no Auth0 setting in config then we _must_
  //  check to see if we are setting Auth0 settings and if
  //  not, redirect to the Auth0 form.
  if (configObj.get('auth0') === null) {
    // Check to see if values are being posted to us
    if (req.method === 'POST') {
      if (
        'action' in req.body &&
        'AUTH0_DOMAIN' in req.body &&
        'AUTH0_CLIENT_ID' in req.body &&
        'AUTH0_SECRET' in req.body &&
        'AUTH0_CALLBACK_URL' in req.body &&
        'handshake' in req.body &&
        req.body.action === 'save' &&
        req.body.handshake === configObj.get('handshake')
      ) {
        const auth0 = {
          AUTH0_DOMAIN: req.body.AUTH0_DOMAIN,
          AUTH0_CLIENT_ID: req.body.AUTH0_CLIENT_ID,
          AUTH0_SECRET: req.body.AUTH0_SECRET,
          AUTH0_CALLBACK_URL: req.body.AUTH0_CALLBACK_URL
        }
        configObj.set('auth0', auth0)
        return res.redirect('/')
      }
    }

    //  If not, check to see if we've been passed a handshake
    if ('handshake' in req.query) {
      req.templateValues.handshake = req.query.handshake
    }

    //  Set up a nice handy default callback if we are developing
    if (process.env.NODE_ENV === 'development') {
      req.templateValues.callbackUrl = `http://${process.env.HOST}:${process.env.PORT}/callback`
    }
    req.templateValues.NODE_ENV = process.env.NODE_ENV
    return res.render('config/auth0', req.templateValues)
  }

  next()
})

// ############################################################################
//
//  Log in and log out tools
//
// ############################################################################

const configObj = new Config()
if (configObj.get('auth0') !== null) {
  const auth0Obj = configObj.get('auth0')
  router.get(
    '/login',
    passport.authenticate('auth0', {
      clientID: auth0Obj.AUTH0_CLIENT_ID,
      domain: auth0Obj.AUTH0_DOMAIN,
      redirectUri: auth0Obj.AUTH0_CALLBACK_URL,
      audience: `https://${auth0Obj.AUTH0_DOMAIN}/userinfo`,
      responseType: 'code',
      scope: 'openid profile'
    }),
    function (req, res) {
      res.redirect('/')
    }
  )

  // Perform session logout and redirect to homepage
  router.get('/logout', (req, res) => {
    req.logout()
    req.user = null
    req.session.destroy(function (err) {
      req.user = null
      req.session = null
      res.clearCookie('connect.sid')
      res.redirect(`https://${auth0Obj.AUTH0_DOMAIN}/v2/logout?returnTo=${auth0Obj.AUTH0_CALLBACK_URL.replace('/callback', '')}`)
      if (err) {
        res.redirect(`https://${auth0Obj.AUTH0_DOMAIN}/v2/logout?returnTo=${auth0Obj.AUTH0_CALLBACK_URL.replace('/callback', '')}`)
      }
    })
  })

  // Perform the final stage of authentication and redirect to '/user'
  router.get(
    '/callback',
    passport.authenticate('auth0', {
      failureRedirect: '/'
    }),
    async function (req, res) {
      // Update the user with extra information
      req.user = await new User().get(req.user)
      res.redirect(req.session.returnTo || '/')
    }
  )
}

router.get('/:lang', main.index)
router.post('/:lang', main.index)
router.get('/:lang/config', ensureLoggedIn, config.index)
router.post('/:lang/config', ensureLoggedIn, config.index)

module.exports = router
