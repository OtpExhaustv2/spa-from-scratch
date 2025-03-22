import { renderVNode, VNode } from './vdom';

/**
 * Component registry to store component factories
 * This stores the mapping between tag names and component constructors/factories
 */
type TComponentFactory = (props: Record<string, any>) => Component;
const componentRegistry = new Map<string, TComponentFactory>();

/**
 * Component instance cache to preserve instances between renders
 * This helps maintain component state during re-renders
 */
type TComponentKey = string;
const componentCache = new Map<TComponentKey, Component>();

/**
 * Generate a unique key for a component instance based on its tag and position
 */
let componentCounter = 0;
const getComponentKey = (tagName: string, position: string): TComponentKey => {
	return `${tagName}-${position}`;
};

/**
 * Export the getComponentKey function for use in other modules
 */
export { getComponentKey };

/**
 * Clear the component cache
 * Call this when navigating to a different page
 */
export const clearComponentCache = (): void => {
	// Destroy all cached components first
	for (const component of componentCache.values()) {
		component.destroy();
	}

	componentCache.clear();
	componentCounter = 0;
};

/**
 * Get the component registry for use in other modules
 */
export const getComponentRegistry = (): Map<string, TComponentFactory> => {
	return componentRegistry;
};

/**
 * Get the component cache for use in other modules
 */
export const getComponentCache = (): Map<TComponentKey, Component> => {
	return componentCache;
};

/**
 * Register a component factory with a custom tag name
 * @param tagName Custom tag name to use in templates
 * @param factory Function that creates component with props
 */
export const registerComponent = (
	tagName: string,
	factory: TComponentFactory | (new (...args: any[]) => Component)
): void => {
	const normalizedTag = tagName.toLowerCase();

	// If we got a constructor, wrap it in a factory
	if (typeof factory === 'function' && /^[A-Z]/.test(factory.name)) {
		const Constructor = factory as new (...args: any[]) => Component;
		componentRegistry.set(normalizedTag, (props) => new Constructor(props));
	} else {
		// Otherwise, use the factory directly
		componentRegistry.set(normalizedTag, factory as TComponentFactory);
	}
};

/**
 * Base Component class
 * All UI components should extend this class
 */
export abstract class Component {
	protected element: HTMLElement;
	protected props: Record<string, any> = {};
	protected isMounted: boolean = false;

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
	}

	/**
	 * Initialize the component - can be overridden by subclasses
	 */
	public init = (): void => {
		// Default implementation does nothing
	};

	/**
	 * Get the HTML element for this component
	 */
	public getElement = (): HTMLElement => {
		return this.element;
	};

	/**
	 * Update the component with new data
	 * Default implementation just re-renders
	 */
	public update = (data?: any): void => {
		// Subclasses should override this method
		this.render();
	};

	/**
	 * Update the component's props
	 * Can be called when the component is reused with new props
	 */
	public updateProps = (newProps: Record<string, any>): void => {
		this.props = { ...newProps };
		this.render();
	};

	/**
	 * Render the component content
	 * Must be implemented by subclasses
	 */
	protected abstract render(): void;

	/**
	 * Clean up component resources
	 * Should be overridden by subclasses if they need cleanup
	 */
	public destroy = (): void => {
		// Default implementation does nothing
	};

	/**
	 * Set text content of the component
	 */
	protected setTextContent = (text: string): void => {
		this.element.textContent = text;
	};

	/**
	 * Replace the component's contents with the specified HTML string
	 */
	protected setInnerHTML = (html: string): void => {
		this.element.innerHTML = html;
	};

	/**
	 * Replace the component's contents with the given VNode
	 * This uses our virtual DOM system for efficient updates
	 */
	protected replaceContents = (vnode: VNode): void => {
		// Clear the element first
		this.element.innerHTML = '';

		// Render the vnode to a real DOM node and append it
		const node = renderVNode(vnode);
		this.element.appendChild(node);
	};

	/**
	 * Mount this component to a parent element
	 */
	public mount = (parent: HTMLElement | string): void => {
		const container =
			typeof parent === 'string' ? document.querySelector(parent) : parent;

		if (!container) {
			console.error(`Cannot mount component: parent element not found`);
			return;
		}

		container.appendChild(this.element);
		this.isMounted = true;
	};

	/**
	 * Unmount this component from its parent
	 */
	public unmount = (): void => {
		if (this.element.parentElement) {
			this.element.parentElement.removeChild(this.element);
			this.isMounted = false;
		}
	};
}
