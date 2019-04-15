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

  const defaultLang = 'en'
  let selectedLang = 'en'

  if (req.session && req.session.user) {
    req.user = req.session.user
  } else {
    req.user = null
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
  let auth0 = configObj.get('auth0')
  const handshake = configObj.get('handshake')

  if (auth0 === null || !auth0.AUTH0_CALLBACK_URL_DASHBOARD) {
    // Check to see if values are being posted to us
    if (req.method === 'POST') {
      if (
        'action' in req.fields &&
        'AUTH0_DOMAIN' in req.fields &&
        'AUTH0_CLIENT_ID' in req.fields &&
        'AUTH0_SECRET' in req.fields &&
        'AUTH0_CALLBACK_URL' in req.fields &&
        'handshake' in req.fields &&
        req.fields.action === 'save' &&
        req.fields.handshake === configObj.get('handshake')
      ) {
        const auth0 = {
          AUTH0_DOMAIN: req.fields.AUTH0_DOMAIN,
          AUTH0_CLIENT_ID: req.fields.AUTH0_CLIENT_ID,
          AUTH0_SECRET: req.fields.AUTH0_SECRET,
          AUTH0_CALLBACK_URL_DASHBOARD: req.fields.AUTH0_CALLBACK_URL
        }
        configObj.set('auth0', auth0)
        setTimeout(() => {
          global.doRestart = true
          process.exit()
        }, 500)
        return res.redirect('/wait')
      }
    }

    //  If not, check to see if we've been passed a handshake
    if ('handshake' in req.query) {
      req.templateValues.handshake = req.query.handshake
    }
    if (handshake) {
      req.templateValues.handshake = handshake
    }

    //  Hand over the auth details
    if (configObj.get('auth0')) {
      req.templateValues.auth0 = configObj.get('auth0')
    }

    //  Set up a nice handy default callback if we are developing
    if (process.env.NODE_ENV === 'development') {
      req.templateValues.callbackUrl = `http://${process.env.HOST}:${process.env.PORT}/callback`
    }
    req.templateValues.NODE_ENV = process.env.NODE_ENV

    //  Send over the config object
    req.templateValues.config = configObj

    return res.render('administration/configuration/auth0', req.templateValues)
  }

  //  Send over the graphQL host
  if (auth0.AUTH0_CALLBACK_URL_API) req.templateValues.graphQLHost = auth0.AUTH0_CALLBACK_URL_API.replace('/callback', '')

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
      redirectUri: auth0Obj.AUTH0_CALLBACK_URL_DASHBOARD,
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
      res.redirect(`https://${auth0Obj.AUTH0_DOMAIN}/v2/logout?returnTo=${auth0Obj.AUTH0_CALLBACK_URL_DASHBOARD.replace('/callback', '')}`)
      if (err) {
        res.redirect(`https://${auth0Obj.AUTH0_DOMAIN}/v2/logout?returnTo=${auth0Obj.AUTH0_CALLBACK_URL_DASHBOARD.replace('/callback', '')}`)
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
      req.session.user = await new User().get(req.user)
      req.session.save()
      let pow = JSON.stringify(req.session.user)
      pow = JSON.parse(pow)
      req.session.save()
      return setTimeout(() => {
        req.session.save()
        console.log(`Logging in >> ${pow.id}`)
        req.session.save()
        res.redirect(307, req.session.returnTo || '/')
      }, 1000)
    }
  )
}

// ############################################################################
//
//  Finally the routes
//
// ############################################################################

const administration = require('./administration')
const main = require('./main')

router.get('/:lang', main.index)
router.post('/:lang', main.index)
router.get('/:lang/wait', main.wait)

router.get('/:lang/administration', administration.index)

router.get('/:lang/administration/configuration', ensureLoggedIn, administration.configuration.index)
router.post('/:lang/administration/configuration', ensureLoggedIn, administration.configuration.index)
router.get('/:lang/administration/auth0', ensureLoggedIn, administration.configuration.auth0)

router.get('/:lang/administration/instances', administration.instances.index)
router.post('/:lang/administration/instances', administration.instances.index)
router.get('/:lang/administration/instances/:id', administration.instances.instance)
router.post('/:lang/administration/instances/:id', administration.instances.instance)

module.exports = router