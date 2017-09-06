declare module 'kue-scheduler' {
    import * as kue from 'kue'
    export function createQueue(options?: Object): kue.Queue;
    export interface Queue extends kue.Queue {
        clear?: (callback: ((err: Error) => void)) => void
        every?: (cronline: string, job: kue.Job) => void
    }
    export interface Job extends kue.Job {
        unique?: (name: string) => kue.Job
    }
}