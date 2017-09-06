import * as kue from 'kue-scheduler'
import { Scheduler } from './types'
import { Configuration } from './types'

export default (config: Configuration): Scheduler => {
  const redis = config.scheduler.broker.redis
  const queue: kue.Queue = kue.createQueue({
    redis,
  })

  // get schedules from config
  let schedules: Array<Array<string>> = []
  try {
    schedules = config.scheduler.schedules
  } catch (e) {
    schedules = []
  }
  schedules = schedules || []

  // make scheduler
  const scheduler: Scheduler = {
    register(name: string, callback: (args?: any) => void) {
      return queue.process(name, 10, callback)
    },
    now(name: string, options: object) {
      return queue.createJob(name, options)
        .removeOnComplete(true)
        .delay(0)
        .save()
    },
  }

  // initialize
  queue.clear((err: Error) => {
    schedules.forEach((sche) => {
      const job: kue.Job = (
        <kue.Job>(queue.createJob(sche[1], {}).removeOnComplete(true))
      )
        .unique(sche[1])
      queue.every(sche[0], job)
    })
  })

  return scheduler
}