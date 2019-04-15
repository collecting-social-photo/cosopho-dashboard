/** Class representing a collection of mutations. */
class Mutations {
  /**
   * Create a collection of mutations
   */
  constructor () {
    this.createInstance = `mutation {
      createInstance[[]] {
        id
        title
      }
    }`

    this.updateInstance = `mutation {
      updateInstance[[]] {
        id
        title
      }
    }`

    this.deleteInstance = `mutation {
      deleteInstance[[]] {
        id
      }
    }`
  }

  /**
   *
   * @param {string} mutation The name of the mutation, needs to match one of those defined in the constructor, i.e. 'schema', 'hello', places'
   * @param {string} filter The filter we want to apply to the mutation i.e. '(limit: 20)'
   * @returns {string|null} A representation of the mutation ready to be used if found, or null if not.
   */
  get (mutation, filter) {
    if (!(mutation in this)) return null
    if (!filter) filter = ''
    return this[mutation].replace('[[]]', filter)
  }
}
/** A handy mutation class that contains a bunch of predefined GraphQL mutations */
module.exports = Mutations