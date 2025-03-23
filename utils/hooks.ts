/**
 * Hook system for functional components
 * Uses a closure-based approach for better encapsulation
 */

// Import VDOM utilities
import { Component } from './component';
import { batchUpdates, cancelTask, scheduleTask } from './scheduler';
import { VNode } from './vdom';

// Define a context type for sharing data between components
type TContext<T> = {
	value: T;
	subscribers: Set<(value: T) => void>;
};

// Map to store all contexts
const contextMap = new Map<string, TContext<any>>();

/**
 * Create a new context that can be consumed by components
 */
export const createContext = <T>(
	defaultValue: T,
	name?: string
): TContext<T> => {
	const id = name || `context_${contextMap.size}`;
	if (contextMap.has(id)) {
		return contextMap.get(id) as TContext<T>;
	}

	const context: TContext<T> = {
		value: defaultValue,
		subscribers: new Set(),
	};

	contextMap.set(id, context);
	return context;
};

/**
 * Update a context value and notify all subscribers
 */
export const setContextValue = <T>(context: TContext<T>, newValue: T): void => {
	if (context.value === newValue) return;

	context.value = newValue;

	// Create a copy of subscribers to avoid issues if a subscriber removes itself during notification
	const subscribers = [...context.subscribers];

	for (const subscriber of subscribers) {
		try {
			// Call the subscriber with the new value
			subscriber(newValue);
		} catch (error) {
			console.error('Error notifying context subscriber:', error);
			// If there's an error, remove the subscriber
			context.subscribers.delete(subscriber);
		}
	}
};

/**
 * HookComponent class that adds hooks support to components
 * Each component instance has its own hook state
 */
export abstract class HookComponent extends Component {
	// Store hook state in the component instance
	protected hookStates: any[] = [];
	private hookIndex = 0;
	private initialRenderComplete = false;

	private isBatchingUpdates = false;
	private pendingStateUpdates: (() => void)[] = [];
	private updateTaskId: number | null = null;

	constructor(
		propsOrTagName: Record<string, any> | string = {},
		className: string = '',
		attributes: Record<string, string> = {}
	) {
		super(propsOrTagName, className, attributes);

		// Don't call updateUI here since it's called in the base class constructor
		// Just prevent the initial render from happening twice
		this.initialRenderComplete = true;

		// Defer initial render until component is in the DOM
		// to avoid timing issues with animations - now using RAF
		this.updateTaskId = scheduleTask(() => {
			if (this.initialRenderComplete) {
				this.renderWithHooks();
			}
			this.updateTaskId = null;
		});
	}

	/**
	 * Reset hook state for a new render cycle
	 */
	protected resetHookIndices(): void {
		this.hookIndex = 0;
	}

	/**
	 * Helper to render the component with hooks
	 */
	protected renderWithHooks(): VNode | void {
		// Reset hook index first to ensure hooks are called in the same order
		this.resetHookIndices();

		const prevHookStateLength = this.hookStates.length;

		const content = this.render();

		// Check if we have any hooks left over that weren't used in this render
		// This can happen if conditional hooks are used, and the conditions change
		if (this.hookIndex < prevHookStateLength) {
			console.log(
				`${this.constructor.name}: Trimming unused hook states from ${prevHookStateLength} to ${this.hookIndex}`
			);
			// Trim the hook states to match the number of hooks used
			this.hookStates.splice(this.hookIndex);
		}

		return content;
	}

	/**
	 * Process all batched updates at once
	 */
	private flushStateUpdates(): void {
		if (!this.isBatchingUpdates || this.pendingStateUpdates.length === 0) {
			return;
		}

		this.isBatchingUpdates = false;

		const updates = [...this.pendingStateUpdates];
		this.pendingStateUpdates = [];

		// Use batchUpdates from scheduler to run all updates in one frame
		batchUpdates(updates);

		// Then trigger a single re-render through the scheduler
		this.scheduleUpdate();
	}

	/**
	 * useState hook for managing component state
	 * @param initialState Initial state value or function that returns the initial state
	 * @returns [state, setState] tuple
	 */
	protected useState<T>(
		initialState: T | (() => T)
	): [T, (newState: T | ((prevState: T) => T)) => void] {
		const index = this.hookIndex++;

		// Initialize state if this hook hasn't been used before
		if (index >= this.hookStates.length) {
			const initialValue =
				typeof initialState === 'function'
					? (initialState as () => T)()
					: initialState;

			this.hookStates[index] = initialValue;
		}

		const state = this.hookStates[index] as T;

		const setState = (newState: T | ((prevState: T) => T)) => {
			const updateFn = () => {
				const nextState =
					typeof newState === 'function'
						? (newState as (prevState: T) => T)(this.hookStates[index] as T)
						: newState;

				if (this.hookStates[index] !== nextState) {
					this.hookStates[index] = nextState;
				}
			};

			this.pendingStateUpdates.push(updateFn);

			if (!this.isBatchingUpdates) {
				this.isBatchingUpdates = true;

				// Use the scheduler instead of setTimeout
				if (this.updateTaskId === null) {
					this.updateTaskId = scheduleTask(() => {
						this.flushStateUpdates();
						this.updateTaskId = null;
					});
				}
			}
		};

		return [state, setState];
	}

	/**
	 * useRef hook for creating a mutable reference object
	 * @param initialValue Initial value
	 * @returns A ref object with a current property
	 */
	protected useRef<T>(initialValue: T): { current: T } {
		const index = this.hookIndex++;

		// Initialize ref if this is the first render
		if (index >= this.hookStates.length) {
			this.hookStates.push({ current: initialValue });
		}

		return this.hookStates[index];
	}

	/**
	 * useMemo hook for memoizing expensive calculations
	 * @param factory Function that returns the computed value
	 * @param deps Dependencies array that determines when to recompute
	 * @returns The memoized value
	 */
	protected useMemo<T>(factory: () => T, deps: any[]): T {
		const index = this.hookIndex++;

		// Initialize memo state if needed
		if (index >= this.hookStates.length) {
			const value = factory();
			this.hookStates.push({ value, deps });
			return value;
		}

		const memo = this.hookStates[index];
		const oldDeps = memo.deps;

		// Check if dependencies changed
		const depsChanged =
			!oldDeps ||
			oldDeps.length !== deps.length ||
			deps.some((dep, i) => dep !== oldDeps[i]);

		if (depsChanged) {
			const value = factory();
			this.hookStates[index] = { value, deps };
			return value;
		}

		return memo.value;
	}

	/**
	 * useCallback hook for memoizing functions
	 * @param callback The function to memoize
	 * @param deps Dependencies array that determines when to recreate the function
	 * @returns The memoized callback function
	 */
	protected useCallback<T extends Function>(callback: T, deps: any[]): T {
		return this.useMemo(() => callback, deps);
	}

	/**
	 * useContext hook for consuming context values
	 * @param context The context object created with createContext
	 * @returns The current context value
	 */
	protected useContext<T>(context: TContext<T>): T {
		const index = this.hookIndex++;

		// Initialize context subscription if needed
		if (index >= this.hookStates.length) {
			// Create a stable update function
			const updateFromContext = (newValue: T) => {
				// Only trigger update if component is still in DOM
				if (this.getElement().isConnected) {
					// Just re-render the component when context changes
					this.renderWithHooks();
				} else {
					// If component is no longer in DOM, remove the subscription
					context.subscribers.delete(updateFromContext);
				}
			};

			context.subscribers.add(updateFromContext);

			// Store cleanup function and current context in state
			this.hookStates.push({
				cleanup: () => context.subscribers.delete(updateFromContext),
			});
		}

		return context.value;
	}

	/**
	 * useEffect hook for side effects
	 * @param callback Function to run
	 * @param deps Dependency array
	 */
	protected useEffect(callback: () => void | (() => void), deps?: any[]): void {
		const index = this.hookIndex++;

		// Initialize effect data if needed
		if (index >= this.hookStates.length) {
			this.hookStates.push({ deps: undefined, cleanup: undefined });
		}

		const prevEffectData = this.hookStates[index];

		// More strict comparison of dependencies
		const shouldRun =
			!deps ||
			!prevEffectData.deps ||
			deps.length !== prevEffectData.deps.length ||
			// Use JSON.stringify for deep comparison or implement a better comparison function
			JSON.stringify(deps) !== JSON.stringify(prevEffectData.deps);

		if (shouldRun) {
			// Run cleanup from previous effect
			if (typeof prevEffectData.cleanup === 'function') {
				prevEffectData.cleanup();
			}

			// Run effect and capture cleanup
			const cleanup = callback();

			// Store new effect data
			this.hookStates[index] = {
				deps: deps ? [...deps] : deps, // Create a copy of deps to prevent reference issues
				cleanup,
			};
		}
	}

	/**
	 * Override the updateUI method from Component to use our hook system
	 */
	protected override updateUI(): void {
		// Run the render method with hooks
		const content = this.renderWithHooks();

		// If render returns content directly, apply it
		if (content) {
			this.replaceContents(content);
		}
	}

	/**
	 * Override update to reset hook indices before performing update
	 */
	public override update(data?: any): void {
		// Call the parent update method
		super.update(data);
	}

	/**
	 * Override abstract render method to allow returning VNode
	 */
	protected abstract override render(): VNode | void;

	/**
	 * Override destroy method to clean up effects and cancel scheduled tasks
	 */
	public override destroy(): void {
		// Cancel any pending update tasks
		if (this.updateTaskId !== null) {
			cancelTask(this.updateTaskId);
			this.updateTaskId = null;
		}

		// Run cleanup for effects
		for (const state of this.hookStates) {
			if (state && typeof state.cleanup === 'function') {
				try {
					state.cleanup();
				} catch (error) {
					console.error('Error in hook cleanup during destroy:', error);
				}
			}
		}

		// Clear hook states
		this.hookStates = [];

		// Call parent destroy method
		super.destroy();
	}
}

export { TContext as Context };
