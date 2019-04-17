/** Class representing a collection of queries. */
class Queries {
  /**
   * Create a collection of queries
   */
  constructor () {
    this.userBody = `
    apitoken
    created
    displayName
    icon
    id
    instances {
      id
      title
    }
    lastLoggedIn
    lastUpdated
    roles {
      isAdmin
      isDeveloper
    }`

    this.hello = `query {
      hello[[]]
    }`

    this.instance = `query {
      instance[[]] {
        id
        title
        initiatives {
          id
          title
          created
          isActive
        }
      }
    }`

    this.instances = `query {
      instances[[]] {
        id
        title
        initiatives {
          id
          title
          created
          isActive
        }
      }
    }`

    this.user = `query {
      user[[]] {
        ${this.userBody}
      }
    }`

    this.users = `query {
      users[[]] {
        ${this.userBody}
      }
    }`
  }

  /**
   *
   * @param {string} query The name of the query, needs to match one of those defined in the constructor, i.e. 'schema', 'hello', places'
   * @param {string} filter The filter we want to apply to the query i.e. '(limit: 20)'
   * @returns {string|null} A representation of the query ready to be used if found, or null if not.
   */
  get (query, filter) {
    if (!(query in this)) return null
    if (!filter) filter = ''
    return this[query].replace('[[]]', filter)
  }
}
/** A handy query class that contains a bunch of predefined GraphQL queries */
module.exports = Queries
