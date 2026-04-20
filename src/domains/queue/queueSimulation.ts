import type { OpdQueueToken } from './opdQueueTypes'

/** Simulation may start only when at least one token is waiting (not empty / not “all done”). */
export function canStartQueueSimulation(queue: OpdQueueToken[]): boolean {
  return queue.some((t) => t.status === 'waiting')
}

/** No automatic “call next” work left: nobody waiting and nobody currently in progress. */
export function shouldStopQueueSimulation(queue: OpdQueueToken[]): boolean {
  if (queue.length === 0) return true
  return !queue.some((t) => t.status === 'waiting' || t.status === 'in-progress')
}

/** “Call next” can do something: someone is waiting or in consultation (to complete and advance). */
export function canCallNext(queue: OpdQueueToken[]): boolean {
  if (queue.length === 0) return false
  return queue.some((t) => t.status === 'waiting' || t.status === 'in-progress')
}
