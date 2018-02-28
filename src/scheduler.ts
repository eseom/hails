import * as kueOriginal from 'kue'
import * as kue from 'kue-scheduler'
import * as winston from 'winston'
import { Settings, Scheduler } from './interfaces'

export default (config: Settings, logger: winston.LoggerInstance): Scheduler => {
  const queue = kue.createQueue({
    ...config.scheduler.broker,
  })
  queue.setMaxListeners(1000)

  // get schedules from config
  const schedules = config.scheduler.schedules || []

  // make scheduler
  const scheduler = {
    queue,
    register(name: string, callback: (job: kueOriginal.Job, done: kueOriginal.DoneCallback) => void) {
      return queue.process(name, 10, callback)
    },
    now(name: string, options: object) {
      return queue.createJob(name, options)
        .removeOnComplete(true)
        .delay(0)
        .save()
    },
    stop() {
      return new Promise((resolve, reject) => {
        const timer = setInterval(() => {
          if (!queue.shuttingDown)
            queue.shutdown(10000, (err: Error) => {
              clearInterval(timer)
              resolve(true)
            })
        }, 500)
      })
    },
  }

  // initialize
  logger.info('periodic schedules: %d', schedules.length)
  schedules.forEach((sche: string[]) => {
    logger.silly(sche.toString())
    const job = (
      queue.createJob(sche[1], {}).removeOnComplete(true)
    )
      .unique(sche[1])
    queue.every(sche[0], job)
  })

  return scheduler
}
