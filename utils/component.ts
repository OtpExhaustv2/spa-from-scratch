import { renderVNode, VNode } from './vdom';

/**
 * Base Component class
 * All UI components should extend this class
 */
export abstract class Component {
	protected element: HTMLElement;
	protected props: Record<string, any> = {};
	protected isMounted: boolean = false;
	private lastVNode: VNode | null = null;

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
		setTimeout(() => {
			this.updateUI();
		}, 0);
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
		// Subclasses should override this method
		this.updateUI();
	}

	/**
	 * Update the component's props
	 * Can be called when the component is reused with new props
	 */
	public updateProps(newProps: Record<string, any>): void {
		// Check if props have actually changed before updating
		const hasChanged =
			!this.props ||
			Object.entries(newProps).some(
				([key, value]) => this.props[key] !== value
			);

		if (hasChanged) {
			this.props = { ...newProps };
			this.updateUI();
		}
	}

	/**
	 * Render the component content
	 * Must be implemented by subclasses
	 * Now can return VNode content directly, which will be applied to the element
	 */
	protected abstract render(): VNode | void;

	/**
	 * Internal method to update the UI based on render output
	 */
	protected updateUI(): void {
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
		// Default implementation does nothing
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
	 * Replace the component's contents with the given VNode
	 * This uses our virtual DOM system for efficient updates
	 */
	protected replaceContents(vnode: VNode): void {
		// Clear the element first
		this.element.innerHTML = '';

		// Store the VNode for potential future diffing
		this.lastVNode = vnode;

		// Render the vnode to a real DOM node and append it
		const node = renderVNode(vnode);
		this.element.appendChild(node);
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
