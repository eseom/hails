import * as kue from 'kue-scheduler'

export default (config, logger) => {
  const redis = config.scheduler.broker.redis
  const queue = kue.createQueue({
	...config.scheduler.broker,
  })
  queue.setMaxListeners(1000)

  // get schedules from config
  let schedules = []
  try {
    schedules = config.scheduler.schedules
  } catch (e) {
    schedules = []
  }
  schedules = schedules || []

  // make scheduler
  const scheduler = {
	queue,
    register(name, callback) {
      return queue.process(name, 10, callback)
    },
    now(name, options) {
      return queue.createJob(name, options)
        .removeOnComplete(true)
        .delay(0)
        .save()
    },
    stop() {
      return new Promise((resolve) => {
        try {
          queue.shutdown(10000, () => {
            resolve(true)
          })
        } catch (e) {
          console.error(e)
          //
        }
      })
    },
  }

  // initialize
  logger.info('periodic schedules: %d', schedules.length)
  schedules.forEach((sche) => {
    logger.silly(sche)
    const job = (
      queue.createJob(sche[1], {}).removeOnComplete(true)
    )
      .unique(sche[1])
    queue.every(sche[0], job)
  })
  return scheduler
}
