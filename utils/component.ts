import { cancelTask, scheduleTask } from './scheduler';
import { VNode, createRealNode, patch } from './vdom';

// Function for shallowEqual comparison
const shallowEqual = (objA: any, objB: any): boolean => {
	if (objA === objB) {
		return true;
	}

	if (
		typeof objA !== 'object' ||
		objA === null ||
		typeof objB !== 'object' ||
		objB === null
	) {
		return false;
	}

	const keysA = Object.keys(objA);
	const keysB = Object.keys(objB);

	if (keysA.length !== keysB.length) {
		return false;
	}

	// Test for A's keys different from B.
	for (const key of keysA) {
		if (
			!Object.prototype.hasOwnProperty.call(objB, key) ||
			objA[key] !== objB[key]
		) {
			return false;
		}
	}

	return true;
};

/**
 * Base Component class
 * All UI components should extend this class
 */
export abstract class Component {
	protected element: HTMLElement;
	protected props: Record<string, any> = {};
	protected isMounted: boolean = false;
	private lastVNode: VNode | null = null;
	private lastRenderResult: VNode | null = null;
	private shouldUpdate: boolean = true;
	private updateScheduled: number | null = null;

	constructor(
		propsOrTagName: Record<string, any> | string = {},
		className: string = '',
		attributes: Record<string, string> = {}
	) {
		let tagName = 'div';

		// Check if first parameter is props or tagName
		if (typeof propsOrTagName === 'string') {
			tagName = propsOrTagName;
		} else {
			// If it's props, store them
			this.props = { ...propsOrTagName };
		}

		// Create DOM element
		this.element = document.createElement(tagName);

		// Add classes if provided
		if (className) {
			this.element.className = className;
		}

		// Set attributes if provided
		for (const [key, value] of Object.entries(attributes)) {
			this.element.setAttribute(key, value);
		}

		// Defer initial render to next tick to ensure
		// component is fully constructed before rendering
		// Now using RAF scheduler
		this.updateScheduled = scheduleTask(() => {
			this.updateUI();
			this.updateScheduled = null;
		});
	}

	/**
	 * Initialize the component - can be overridden by subclasses
	 */
	public init(): void {
		// Default implementation does nothing
	}

	/**
	 * Get the HTML element for this component
	 */
	public getElement(): HTMLElement {
		return this.element;
	}

	/**
	 * Update the component with new data
	 * Default implementation just re-renders
	 */
	public update(data?: any): void {
		// Mark component for update
		this.shouldUpdate = true;
		// Schedule update using rAF for better performance
		this.scheduleUpdate();
	}

	/**
	 * Schedule an update using requestAnimationFrame
	 */
	protected scheduleUpdate(): void {
		// Avoid scheduling multiple updates
		if (this.updateScheduled !== null) {
			return;
		}

		// Schedule update for next animation frame
		this.updateScheduled = scheduleTask(() => {
			this.updateUI();
			this.updateScheduled = null;
		});
	}

	/**
	 * Check if component should update based on props comparison
	 * Can be overridden by subclasses for custom logic
	 */
	protected shouldComponentUpdate(newProps: Record<string, any>): boolean {
		// Default implementation does a shallow comparison of props
		return !shallowEqual(this.props, newProps);
	}

	/**
	 * Update the component's props
	 * Can be called when the component is reused with new props
	 */
	public updateProps(newProps: Record<string, any>): void {
		// Check if props have actually changed using shouldComponentUpdate
		if (this.shouldComponentUpdate(newProps)) {
			this.props = { ...newProps };
			this.shouldUpdate = true;
			this.scheduleUpdate();
		}
	}

	/**
	 * Render the component content
	 * Must be implemented by subclasses
	 * Now can return VNode content directly, which will be applied to the element
	 */
	protected abstract render(): VNode | void;

	/**
	 * Memoize render result to avoid unnecessary DOM updates
	 */
	protected memoizeRender(): VNode | void {
		// If we shouldn't update, return last result
		if (!this.shouldUpdate && this.lastRenderResult) {
			return this.lastRenderResult;
		}

		let content;

		if (typeof this.render === 'function') {
			content = this.render();
		}
		// Skip render if it's not implemented yet (happens during base class construction)
		else if (this.render === undefined) {
			return;
		}
		// Treat as a method accessed via prototype
		else {
			const renderMethod = Object.getPrototypeOf(this).render;
			if (typeof renderMethod === 'function') {
				content = renderMethod.call(this);
			} else {
				console.warn('Component has no render method implemented:', this);
				return;
			}
		}

		// Store the render result for memoization
		this.lastRenderResult = content;
		this.shouldUpdate = false;

		return content;
	}

	/**
	 * Internal method to update the UI based on render output
	 */
	protected updateUI(): void {
		// Use memoization to avoid unnecessary rendering
		const content = this.memoizeRender();

		// If render returns content directly, apply it
		if (content) {
			this.replaceContents(content);
		}
	}

	/**
	 * Clean up component resources
	 * Should be overridden by subclasses if they need cleanup
	 */
	public destroy(): void {
		// Cancel any pending updates
		if (this.updateScheduled !== null) {
			cancelTask(this.updateScheduled);
			this.updateScheduled = null;
		}

		// Default implementation does nothing else
	}

	/**
	 * Set text content of the component
	 */
	protected setTextContent(text: string): void {
		this.element.textContent = text;
	}

	/**
	 * Replace the component's contents with the specified HTML string
	 */
	protected setInnerHTML(html: string): void {
		this.element.innerHTML = html;
	}

	/**
	 * Update the component's rendered content
	 * @param content HTML or DOM node to set as content
	 */
	protected replaceContents(content: Node | VNode | string): void {
		// Store the last VNode for efficient diffing
		let newVNode: VNode;

		if (typeof content === 'string') {
			// Parse HTML string into VNode
			newVNode = {
				type: 'text',
				text: content,
			};
		} else if ('nodeType' in content) {
			// Convert real DOM node to VNode
			// Not ideal, but we'll use it as a text node for now
			newVNode = {
				type: 'text',
				text: content.textContent || '',
			};
		} else {
			// Already a VNode
			newVNode = content;
		}

		// If we have a previous VNode, do a proper diff+patch
		if (this.lastVNode) {
			// Apply patch to update only what changed
			patch(this.lastVNode, newVNode, this.element);
		} else {
			// First render, just clear the element and append
			// Clear existing content
			while (this.element.firstChild) {
				this.element.removeChild(this.element.firstChild);
			}

			// Create and append new content
			if (typeof content === 'string') {
				this.element.innerHTML = content;
			} else if ('nodeType' in content) {
				this.element.appendChild(content);
			} else {
				// Create real DOM from VNode and append
				const newNode = createRealNode(newVNode);
				this.element.appendChild(newNode);
			}
		}

		// Update the reference to the last VNode
		this.lastVNode = newVNode;
	}

	/**
	 * Mount this component to a parent element
	 */
	public mount(parent: HTMLElement | string): void {
		const container =
			typeof parent === 'string' ? document.querySelector(parent) : parent;

		if (!container) {
			console.error(`Cannot mount component: parent element not found`);
			return;
		}

		container.appendChild(this.element);
		this.isMounted = true;
	}

	/**
	 * Unmount this component from its parent
	 */
	public unmount(): void {
		if (this.element.parentElement) {
			this.element.parentElement.removeChild(this.element);
			this.isMounted = false;
		}
	}
}
