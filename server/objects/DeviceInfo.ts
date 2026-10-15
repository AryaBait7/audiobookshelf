import uuid = require('uuid')
import htmlSanitizer = require('../utils/htmlSanitizer')

const uuidv4 = uuid.v4
const { stripAllTags } = htmlSanitizer

type DeviceInfoKey = 'id' | 'userId' | 'deviceId' | 'ipAddress' | 'browserName' | 'browserVersion' | 'osName' | 'osVersion' | 'deviceType' | 'clientVersion' | 'manufacturer' | 'model' | 'sdkVersion' | 'clientName' | 'deviceName'

/** toJSON() output: null/undefined fields are omitted */
type DeviceInfoJSON = Partial<Record<DeviceInfoKey, string | null>>

/** Parsed user agent (ua-parser-js result, see utils/parsers) */
interface UserAgentResult {
  browser: { name?: string; version?: string }
  os: { name?: string; version?: string }
  device: { type?: string }
}

/** Device info sent by a client (untrusted; string fields are sanitized in setData) */
interface ClientDeviceInfo {
  deviceId?: string
  clientVersion?: unknown
  manufacturer?: unknown
  model?: unknown
  sdkVersion?: unknown
  clientName?: unknown
}

class DeviceInfo {
  id: string | null
  userId: string | null
  deviceId: string | null
  ipAddress: string | null
  browserName: string | null
  browserVersion: string | null
  osName: string | null
  osVersion: string | null
  deviceType: string | null
  clientVersion: string | null
  manufacturer: string | null
  model: string | null
  sdkVersion: string | null
  clientName: string | null
  deviceName: string | null

  /** Fields to sanitize when loading from stored data */
  static stringFields: string[] = ['deviceId', 'clientVersion', 'manufacturer', 'model', 'sdkVersion', 'clientName', 'deviceName']

  constructor(deviceInfo: DeviceInfoJSON | null = null) {
    this.id = null
    this.userId = null
    this.deviceId = null
    this.ipAddress = null

    // From User Agent (see: https://www.npmjs.com/package/ua-parser-js)
    this.browserName = null
    this.browserVersion = null
    this.osName = null
    this.osVersion = null
    this.deviceType = null

    // From client
    this.clientVersion = null
    this.manufacturer = null
    this.model = null
    this.sdkVersion = null // Android Only

    this.clientName = null
    this.deviceName = null

    if (deviceInfo) {
      this.construct(deviceInfo)
    }
  }

  construct(deviceInfo: DeviceInfoJSON): void {
    // Writable view for the generic key loop; unknown keys are skipped by the !== undefined check
    const fields = this as Record<DeviceInfoKey, unknown>
    for (const key in deviceInfo) {
      const k = key as DeviceInfoKey
      if (deviceInfo[k] !== undefined && fields[k] !== undefined) {
        fields[k] = DeviceInfo.stringFields.includes(key) ? stripAllTags(deviceInfo[k]) : deviceInfo[k]
      }
    }
  }

  toJSON(): DeviceInfoJSON {
    const obj: DeviceInfoJSON = {
      id: this.id,
      userId: this.userId,
      deviceId: this.deviceId,
      ipAddress: this.ipAddress,
      browserName: this.browserName,
      browserVersion: this.browserVersion,
      osName: this.osName,
      osVersion: this.osVersion,
      deviceType: this.deviceType,
      clientVersion: this.clientVersion,
      manufacturer: this.manufacturer,
      model: this.model,
      sdkVersion: this.sdkVersion,
      clientName: this.clientName,
      deviceName: this.deviceName
    }
    for (const key in obj) {
      const k = key as DeviceInfoKey
      if (obj[k] === null || obj[k] === undefined) {
        delete obj[k]
      }
    }
    return obj
  }

  get deviceDescription(): string {
    if (this.model) {
      // Set from mobile apps
      if (this.sdkVersion) return `${this.model} SDK ${this.sdkVersion} / v${this.clientVersion}`
      return `${this.model} / v${this.clientVersion}`
    }
    return `${this.osName} ${this.osVersion} / ${this.browserName}`
  }

  // When client doesn't send a device id
  getTempDeviceId(): string {
    const keys = [this.userId, this.browserName, this.browserVersion, this.osName, this.osVersion, this.clientVersion, this.manufacturer, this.model, this.sdkVersion, this.ipAddress].map((k) => k || '')
    return 'temp-' + Buffer.from(keys.join('-'), 'utf-8').toString('base64')
  }

  setData(ip: string | null | undefined, ua: UserAgentResult | null | undefined, clientDeviceInfo: ClientDeviceInfo | null | undefined, serverVersion: string, userId: string): void {
    this.id = uuidv4()
    this.userId = userId
    this.deviceId = clientDeviceInfo?.deviceId || this.id
    this.ipAddress = ip || null

    this.browserName = ua?.browser.name || null
    this.browserVersion = ua?.browser.version || null
    this.osName = ua?.os.name || null
    this.osVersion = ua?.os.version || null
    this.deviceType = ua?.device.type || null

    this.clientVersion = stripAllTags(clientDeviceInfo?.clientVersion) || serverVersion
    this.manufacturer = stripAllTags(clientDeviceInfo?.manufacturer) || null
    this.model = stripAllTags(clientDeviceInfo?.model) || null

    if (typeof clientDeviceInfo?.sdkVersion === 'number') {
      this.sdkVersion = clientDeviceInfo.sdkVersion.toString()
    } else {
      this.sdkVersion = stripAllTags(clientDeviceInfo?.sdkVersion) || null
    }

    this.clientName = stripAllTags(clientDeviceInfo?.clientName) || null
    if (this.sdkVersion) {
      if (!this.clientName) this.clientName = 'Abs Android'
      this.deviceName = `${this.manufacturer || 'Unknown'} ${this.model || ''}`
    } else if (this.model) {
      if (!this.clientName) this.clientName = 'Abs iOS'
      this.deviceName = `${this.manufacturer || 'Unknown'} ${this.model || ''}`
    } else if (this.osName && this.browserName) {
      if (!this.clientName) this.clientName = 'Abs Web'
      this.deviceName = `${this.osName} ${this.osVersion || 'N/A'} ${this.browserName}`
    } else if (!this.clientName) {
      this.clientName = 'Unknown'
    }

    if (!this.deviceId) {
      this.deviceId = this.getTempDeviceId()
    }
  }

  update(deviceInfo: DeviceInfo | (DeviceInfoJSON & { toJSON?: undefined })): boolean {
    const deviceInfoJson = deviceInfo.toJSON ? deviceInfo.toJSON() : deviceInfo
    const existingDeviceInfoJson = this.toJSON()

    // Writable view for the generic key loops (keys are DeviceInfoJSON keys)
    const fields = this as Record<DeviceInfoKey, unknown>

    let hasUpdates = false
    for (const key in deviceInfoJson) {
      if (['id', 'deviceId'].includes(key)) continue

      const k = key as DeviceInfoKey
      if (deviceInfoJson[k] !== existingDeviceInfoJson[k]) {
        fields[k] = deviceInfoJson[k]
        hasUpdates = true
      }
    }

    for (const key in existingDeviceInfoJson) {
      if (['id', 'deviceId'].includes(key)) continue

      const k = key as DeviceInfoKey
      if (existingDeviceInfoJson[k] && !deviceInfoJson[k]) {
        fields[k] = null
        hasUpdates = true
      }
    }

    return hasUpdates
  }
}
export = DeviceInfo
