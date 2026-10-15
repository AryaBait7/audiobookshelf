/// <reference path="../../types/shared.d.ts" />
import uuid = require('uuid')
const uuidv4 = uuid.v4

type TaskString = AbsShared.TaskString

class Task {
  id: string | null
  action: string | null
  data: Record<string, unknown> | null
  title: string | null
  titleKey: string | null
  titleSubs: string[] | null
  description: string | null
  descriptionKey: string | null
  descriptionSubs: string[] | null
  error: string | null
  errorKey: string | null
  errorSubs: string[] | null
  showSuccess: boolean
  isFailed: boolean
  isFinished: boolean
  startedAt: number | null
  finishedAt: number | null
  /** Set by setFailed() only; not part of toJSON() */
  failedAt?: number

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

  toJSON(): AbsShared.TaskJSON {
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
   */
  setData(action: string, titleString: TaskString, descriptionString: TaskString | null, showSuccess: boolean, data: Record<string, unknown> = {}): void {
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
   */
  setFailed(messageString: TaskString): void {
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
   * @param newDescriptionString update description
   * @param clearDescription clear description
   */
  setFinished(newDescriptionString: TaskString | null = null, clearDescription = false): void {
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
