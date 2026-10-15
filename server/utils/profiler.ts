import perfHooks = require('perf_hooks')
import util = require('util')
import Logger = require('../Logger')
import type { FindOptions } from 'sequelize'

const { performance, createHistogram } = perfHooks

/** Node histogram plus the raw values recorded here */
type ProfiledHistogram = perfHooks.RecordableHistogram & { values: number[] }

const histograms = new Map<string, ProfiledHistogram>()

function profile<A extends unknown[], R>(asyncFunc: (...args: A) => Promise<R>, isFindQuery = true, funcName = asyncFunc.name): (...args: A) => Promise<R> {
  if (!histograms.has(funcName)) {
    // `values` is attached on the next line
    const histogram = createHistogram() as ProfiledHistogram
    histogram.values = []
    histograms.set(funcName, histogram)
  }
  const histogram = histograms.get(funcName) as ProfiledHistogram

  return async (...args: A) => {
    if (isFindQuery) {
      // Profiled find queries take Sequelize FindOptions as their first argument
      const findOptions = args[0] as FindOptions
      Logger.info(`[${funcName}] findOptions:`, util.inspect(findOptions, { depth: null }))
      findOptions.logging = (query: string, time?: number) => Logger.info(`[${funcName}] ${query} Elapsed time: ${time}ms`)
      findOptions.benchmark = true
    }
    const start = performance.now()
    try {
      const result = await asyncFunc(...args)
      return result
    } catch (error) {
      Logger.error(`[${funcName}] failed`)
      throw error
    } finally {
      const end = performance.now()
      const duration = Math.round(end - start)
      histogram.record(duration)
      histogram.values.push(duration)
      Logger.info(`[${funcName}] duration: ${duration}ms`)
      Logger.info(`[${funcName}] histogram values:`, histogram.values)
      Logger.info(`[${funcName}] histogram:`, histogram)
    }
  }
}

export = { profile }
