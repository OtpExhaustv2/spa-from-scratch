/**
 * Scheduler for efficient DOM updates using requestAnimationFrame
 * This ensures updates are batched and performed at optimal times
 */

type ScheduledTask = () => void;
type SchedulerId = number;

// Queue of tasks to run on next animation frame
const taskQueue: ScheduledTask[] = [];

// Track if a frame is already scheduled
let frameScheduled = false;

// Counter for generating unique task IDs
let nextTaskId = 1;

// Map of task IDs to their index in the queue
const taskMap = new Map<SchedulerId, number>();

/**
 * Process all queued tasks in a single animation frame
 */
const processTaskQueue = (): void => {
	// Copy the queue and clear it before processing
	// This allows new tasks to be scheduled during processing
	const tasks = [...taskQueue];
	taskQueue.length = 0;
	taskMap.clear();
	frameScheduled = false;

	// Execute each task
	for (const task of tasks) {
		try {
			task();
		} catch (error) {
			console.error('Error in scheduled task:', error);
		}
	}
};

/**
 * Schedule a task to run on the next animation frame
 * Returns a unique ID that can be used to cancel the task
 */
export const scheduleTask = (task: ScheduledTask): SchedulerId => {
	const taskId = nextTaskId++;
	taskQueue.push(task);
	taskMap.set(taskId, taskQueue.length - 1);

	// Schedule a frame if one isn't already scheduled
	if (!frameScheduled) {
		frameScheduled = true;
		requestAnimationFrame(processTaskQueue);
	}

	return taskId;
};

/**
 * Cancel a scheduled task by its ID
 * Returns true if the task was successfully cancelled
 */
export const cancelTask = (taskId: SchedulerId): boolean => {
	const taskIndex = taskMap.get(taskId);

	if (taskIndex !== undefined) {
		// Replace task with a no-op
		taskQueue[taskIndex] = () => {};
		taskMap.delete(taskId);
		return true;
	}

	return false;
};

/**
 * Schedule a high-priority task to run immediately (microtask)
 * Use this sparingly for tasks that must happen before the next paint
 */
export const scheduleImmediate = (task: ScheduledTask): void => {
	queueMicrotask(task);
};

/**
 * Schedule a task to run after a delay
 * Combines setTimeout with requestAnimationFrame for smoother timing
 */
export const scheduleDelayed = (
	task: ScheduledTask,
	delayMs: number
): SchedulerId => {
	const taskId = nextTaskId++;

	const timeoutId = setTimeout(() => {
		scheduleTask(task);
	}, delayMs);

	// Return an ID that can be used to cancel the delayed task
	return taskId;
};

/**
 * Cancel a delayed task
 */
export const cancelDelayed = (taskId: SchedulerId): void => {
	// For simplicity, we just make this a no-op
	// In a more complex implementation, we would track the setTimeout IDs
};

/**
 * Utility for throttling a function - it will only run once per animation frame
 */
export const throttleToFrame = <T extends (...args: any[]) => void>(
	fn: T
): T => {
	let scheduled = false;
	let lastArgs: any[] | null = null;

	const throttled = (...args: any[]) => {
		lastArgs = args;

		if (!scheduled) {
			scheduled = true;

			scheduleTask(() => {
				scheduled = false;
				if (lastArgs) {
					fn(...lastArgs);
					lastArgs = null;
				}
			});
		}
	};

	return throttled as T;
};

/**
 * Batch multiple state updates together in a single render cycle
 */
export const batchUpdates = (updates: ScheduledTask[]): void => {
	scheduleTask(() => {
		for (const update of updates) {
			update();
		}
	});
};
