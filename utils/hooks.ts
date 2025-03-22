/**
 * Hook system for functional components
 * Uses a closure-based approach for better encapsulation
 */

// Import VDOM utilities
import { Component } from './component';

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

	for (const subscriber of context.subscribers) {
		try {
			subscriber(newValue);
		} catch (error) {
			console.error('Error notifying context subscriber:', error);
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

	constructor(
		propsOrTagName: Record<string, any> | string = {},
		className: string = '',
		attributes: Record<string, string> = {}
	) {
		super(propsOrTagName, className, attributes);

		// Defer initial render until component is in the DOM
		// to avoid timing issues with animations
		setTimeout(() => {
			if (!this.initialRenderComplete) {
				this.renderWithHooks();
				this.initialRenderComplete = true;
			}
		}, 0);
	}

	/**
	 * useState hook for managing component state
	 * @param initialState Initial state value
	 * @returns [state, setState] tuple
	 */
	protected useState = <T>(initialState: T): [T, (newState: T) => void] => {
		const index = this.hookIndex++;

		// Initialize state if this is the first render
		if (index >= this.hookStates.length) {
			this.hookStates.push(initialState);
		}

		const state = this.hookStates[index];

		// Create setter function
		const setState = (newState: T) => {
			// Only update and re-render if state actually changed
			if (this.hookStates[index] !== newState) {
				this.hookStates[index] = newState;
				this.update();
			}
		};

		return [state, setState];
	};

	/**
	 * useRef hook for creating a mutable reference object
	 * @param initialValue Initial value
	 * @returns A ref object with a current property
	 */
	protected useRef = <T>(initialValue: T): { current: T } => {
		const index = this.hookIndex++;

		// Initialize ref if this is the first render
		if (index >= this.hookStates.length) {
			this.hookStates.push({ current: initialValue });
		}

		return this.hookStates[index];
	};

	/**
	 * useMemo hook for memoizing expensive calculations
	 * @param factory Function that returns the computed value
	 * @param deps Dependencies array that determines when to recompute
	 * @returns The memoized value
	 */
	protected useMemo = <T>(factory: () => T, deps: any[]): T => {
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
	};

	/**
	 * useCallback hook for memoizing functions
	 * @param callback The function to memoize
	 * @param deps Dependencies array that determines when to recreate the function
	 * @returns The memoized callback function
	 */
	protected useCallback = <T extends Function>(callback: T, deps: any[]): T => {
		return this.useMemo(() => callback, deps);
	};

	/**
	 * useContext hook for consuming context values
	 * @param context The context object created with createContext
	 * @returns The current context value
	 */
	protected useContext = <T>(context: TContext<T>): T => {
		const index = this.hookIndex++;

		// Initialize context subscription if needed
		if (index >= this.hookStates.length) {
			// Store the subscribe function in hook state
			const updateFromContext = (newValue: T) => {
				this.update(newValue);
			};

			context.subscribers.add(updateFromContext);

			// Store cleanup function and current context in state
			this.hookStates.push({
				cleanup: () => context.subscribers.delete(updateFromContext),
			});
		}

		return context.value;
	};

	/**
	 * useEffect hook for side effects
	 * @param callback Function to run
	 * @param deps Dependency array
	 */
	protected useEffect = (
		callback: () => void | (() => void),
		deps?: any[]
	): void => {
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
	};

	/**
	 * Override update method
	 */
	public override update = (_data?: any): void => {
		this.renderWithHooks();
		this.initialRenderComplete = true;
	};

	/**
	 * Render with hooks
	 */
	private renderWithHooks = (): void => {
		// Reset hook index before rendering
		this.hookIndex = 0;

		// Call the render method that uses hooks
		this.render();
	};

	/**
	 * Override destroy method to clean up effects
	 */
	public override destroy = (): void => {
		// Run cleanup for effects
		for (const state of this.hookStates) {
			if (state && typeof state.cleanup === 'function') {
				state.cleanup();
			}
		}

		// Clear hook states
		this.hookStates = [];
	};
}

export { TContext as Context };
