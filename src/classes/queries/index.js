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

    this.photoBody = `
      id
      instance
      initiative
      title
      story
      tags
      location
      date
      socialMedias
      make
      model
      aperture
      shutterSpeed
      license
      uploaded
      approved
      reviewed
      data {
        width
        height
        public_id
        version
      }
      _sys {
        pagination {
          page
          maxPage
          total
        }
      }
    `

    this.personBody = `
      id
      instance
      slug
      username
      avatar
      photos {
        ${this.photoBody}
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
          slug
          title
          description
          created
          isActive
          isFeatured
        }
      }
    }`

    this.instances = `query {
      instances[[]] {
        id
        title
        initiatives {
          id
          slug
          title
          description
          created
          isActive
          isFeatured
        }
      }
    }`

    this.initiative = `query {
      initiative[[]] {
        id
        slug
        title
        description
        created
        isActive
        isFeatured
        instance
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

    this.person = `query {
      person[[]] {
        ${this.personBody}
      }
    }`

    this.people = `query {
      people[[]] {
        ${this.personBody}
      }
    }`

    this.photos = `query {
      photos[[]] {
        ${this.photoBody}
        person {
          id
          username
          slug
        }
        _sys {
          pagination {
            total
          }
        }
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
