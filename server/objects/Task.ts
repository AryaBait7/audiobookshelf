import uuid = require('uuid')
const uuidv4 = uuid.v4

interface TaskString {
  text: string
  key: string
  subs?: string[]
}

class Task {
  id: string
  action: string
  data: Record<string, any>
  title: string
  titleKey: string
  titleSubs: string[]
  description: string
  descriptionKey: string
  descriptionSubs: string[]
  error: string
  errorKey: string
  errorSubs: string[]
  showSuccess: boolean
  isFailed: boolean
  isFinished: boolean
  startedAt: number
  finishedAt: number
  /** Only set by setFailed(), not initialised in the constructor */
  declare failedAt?: number

  constructor() {
    /** @type {string} */
    this.id = null
    /** @type {string} */
    this.action = null // e.g. embed-metadata, encode-m4b, etc
    /** @type {Object} custom data */
    this.data = null // additional info for the action like libraryItemId

    /** @type {string} */
    this.title = null
    /** @type {string} - Used for translation */
    this.titleKey = null
    /** @type {string[]} - Used for translation */
    this.titleSubs = null

    /** @type {string} */
    this.description = null
    /** @type {string} - Used for translation */
    this.descriptionKey = null
    /** @type {string[]} - Used for translation */
    this.descriptionSubs = null

    /** @type {string} */
    this.error = null
    /** @type {string} - Used for translation */
    this.errorKey = null
    /** @type {string[]} - Used for translation */
    this.errorSubs = null

    /** @type {boolean} client should keep the task visible after success */
    this.showSuccess = false

    /** @type {boolean} */
    this.isFailed = false
    /** @type {boolean} */
    this.isFinished = false

    /** @type {number} */
    this.startedAt = null
    /** @type {number} */
    this.finishedAt = null
  }

  toJSON() {
    return {
      id: this.id,
      action: this.action,
      data: this.data ? { ...this.data } : {},
      title: this.title,
      titleKey: this.titleKey,
      titleSubs: this.titleSubs,
      description: this.description,
      descriptionKey: this.descriptionKey,
      descriptionSubs: this.descriptionSubs,
      error: this.error,
      errorKey: this.errorKey,
      errorSubs: this.errorSubs,
      showSuccess: this.showSuccess,
      isFailed: this.isFailed,
      isFinished: this.isFinished,
      startedAt: this.startedAt,
      finishedAt: this.finishedAt
    }
  }

  /**
   * Set initial task data
   *
   * @param {string} action
   * @param {TaskString} titleString
   * @param {TaskString|null} descriptionString
   * @param {boolean} showSuccess
   * @param {Object} [data]
   */
  setData(action: string, titleString: TaskString, descriptionString: TaskString | null, showSuccess: boolean, data: Record<string, any> = {}) {
    this.id = uuidv4()
    this.action = action
    this.data = { ...data }
    this.title = titleString.text
    this.titleKey = titleString.key || null
    this.titleSubs = titleString.subs || null
    this.description = descriptionString?.text || null
    this.descriptionKey = descriptionString?.key || null
    this.descriptionSubs = descriptionString?.subs || null
    this.showSuccess = showSuccess
    this.startedAt = Date.now()
  }

  /**
   * Set task as failed
   *
   * @param {TaskString} messageString
   */
  setFailed(messageString: TaskString) {
    this.error = messageString.text
    this.errorKey = messageString.key || null
    this.errorSubs = messageString.subs || null
    this.isFailed = true
    this.failedAt = Date.now()
    this.setFinished()
  }

  /**
   * Set task as finished
   *
   * @param {TaskString} [newDescriptionString] update description
   * @param {boolean} [clearDescription] clear description
   */
  setFinished(newDescriptionString: TaskString | null = null, clearDescription: boolean = false) {
    if (newDescriptionString) {
      this.description = newDescriptionString.text
      this.descriptionKey = newDescriptionString.key || null
      this.descriptionSubs = newDescriptionString.subs || null
    } else if (clearDescription) {
      this.description = null
      this.descriptionKey = null
      this.descriptionSubs = null
    }
    this.isFinished = true
    this.finishedAt = Date.now()
  }
}
export = Task
