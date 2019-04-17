/* eslint-disable no-useless-constructor */
const request = require('request-promise')
const Config = require('../config')

/** Class allowing us to connect to a GraphQL server. */
class GraphQL {
  /**
   * Once again, wecause we are dealing with async stuff we have an empty constructor
   * so we can have a GraphQL object that we can then drop a handy method onto. We could
   * just turn this into a module, but I suspect we'll need this as a class in the
   * near future. So rather than refactor later I'm putting this here.
   */
  constructor () {}

  /**
   *
   * @param {json} payload The query and any other options to be sent to the GraphQL server
   * @returns {json|Array} The results from GraphQL as a json objects, or an array containing the error if the query failed
   */
  async fetch (payload, token) {
    //  Grab the graphQL host
    const configObj = new Config()
    const auth0 = configObj.get('auth0')
    if (!auth0.AUTH0_CALLBACK_URL_API) return []
    const graphQL = auth0.AUTH0_CALLBACK_URL_API.replace('/callback', '')

    const headers = {
      'content-type': 'application/json',
      Authorization: `bearer ${token}`
    }
    return request({
      url: `${graphQL}/graphql`,
      method: 'POST',
      headers,
      json: payload
    })
      .then(response => {
        return response
      })
      .catch(error => {
        console.log(error)
        return []
      })
  }
}
module.exports = GraphQL
