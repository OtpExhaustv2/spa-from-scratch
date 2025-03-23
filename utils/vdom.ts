/**
 * Virtual DOM implementation for efficient rendering
 */

import { Component } from './component';

// Define VNode types
export type VNodeText = {
	type: 'text';
	text: string;
	el?: Node; // Reference to the actual DOM node
};

export type VNodeElement = {
	type: 'element';
	tagName: string;
	props: Record<string, any>;
	children: VNode[];
	el?: Node; // Reference to the actual DOM node
};

export type VNodeComponent = {
	type: 'component';
	component: Component;
	props: Record<string, any>;
	componentKey?: string; // Unique key for component caching
	el?: Node; // Reference to the actual DOM node
};

// Union type for all node types
export type VNode = VNodeText | VNodeElement | VNodeComponent;

/**
 * Create a virtual DOM element node
 */
export const createElement = (
	tagName: string,
	props: Record<string, any> = {},
	...children: any[]
): VNodeElement => {
	// Process children to handle primitive values
	const processedChildren: VNode[] = children
		.flat()
		.filter((child) => child !== null && child !== undefined)
		.map((child) => {
			// If child is already a VNode, return it
			if (typeof child === 'object' && 'type' in child) {
				return child;
			}

			// Otherwise, create a text node
			return {
				type: 'text',
				text: String(child),
			};
		});

	return {
		type: 'element',
		tagName,
		props,
		children: processedChildren,
	};
};

/**
 * Create a virtual DOM text node
 */
export const createTextNode = (text: string): VNode => {
	return {
		type: 'text',
		text,
	};
};

/**
 * Create a real DOM node from a virtual node
 */
export const createRealNode = (vnode: VNode): Node => {
	// Handle text nodes
	if (vnode.type === 'text') {
		vnode.el = document.createTextNode(vnode.text || '');
		return vnode.el;
	}

	// Handle component nodes
	if (vnode.type === 'component') {
		const componentEl = vnode.component.getElement();
		vnode.el = componentEl;
		return componentEl;
	}

	// At this point we know it's an element node
	const elementVNode = vnode as VNodeElement;
	let el: Node;

	// Special handling for fragments (used for array rendering)
	if (elementVNode.tagName === 'fragment') {
		// Create a document fragment
		el = document.createDocumentFragment();
	} else {
		// Create a regular element
		el = document.createElement(elementVNode.tagName || 'div');

		// Set properties/attributes (only for regular elements)
		setProps(el as HTMLElement, elementVNode.props || {});

		// Add event listeners (only for regular elements)
		addEventListeners(el as HTMLElement, elementVNode.props || {});
	}

	elementVNode.el = el;

	// Create and append children
	if (elementVNode.children) {
		for (const child of elementVNode.children) {
			const childNode = createRealNode(child);
			el.appendChild(childNode);
		}
	}

	return el;
};

// Utility to check if a key is a data attribute
const isDataAttribute = (key: string): boolean => {
	return key.startsWith('data-');
};

/**
 * Set properties/attributes on a DOM element
 */
const setProps = (el: HTMLElement, props: Record<string, any>): void => {
	for (const [key, value] of Object.entries(props)) {
		// Skip event listeners and special attributes
		if (key.startsWith('on') || key === 'key') {
			continue;
		}

		// Handle the style attribute
		if (key === 'style' && typeof value === 'object') {
			for (const [cssKey, cssValue] of Object.entries(value)) {
				(el.style as any)[cssKey] = cssValue;
			}
			continue;
		}

		// Handle className -> class
		if (key === 'className') {
			el.setAttribute('class', value);
			continue;
		}

		// Make sure data-* attributes are set correctly
		if (key.startsWith('data-')) {
			el.setAttribute(key, value);
			continue;
		}

		// Handle regular attributes
		if (typeof value === 'boolean') {
			if (value) {
				el.setAttribute(key, '');
			}
		} else if (value !== null && value !== undefined) {
			el.setAttribute(key, value.toString());
		}
	}
};

/**
 * Add event listeners to a DOM element
 */
const addEventListeners = (
	el: HTMLElement,
	props: Record<string, any>
): void => {
	for (const [key, value] of Object.entries(props)) {
		if (key.startsWith('on') && typeof value === 'function') {
			const eventType = key.toLowerCase().substring(2);
			el.addEventListener(eventType, value);
		}
	}
};

/**
 * Remove event listeners from a DOM element
 */
const removeEventListeners = (
	el: HTMLElement,
	props: Record<string, any>
): void => {
	for (const [key, value] of Object.entries(props)) {
		if (key.startsWith('on') && typeof value === 'function') {
			const eventType = key.toLowerCase().substring(2);
			el.removeEventListener(eventType, value);
		}
	}
};

/**
 * Update props on a DOM element
 */
const updateProps = (
	el: HTMLElement,
	oldProps: Record<string, any>,
	newProps: Record<string, any>
): void => {
	// Remove old props that are no longer present
	for (const [key, value] of Object.entries(oldProps)) {
		if (key.startsWith('on')) {
			// Handle event listeners separately
			if (!(key in newProps) || newProps[key] !== value) {
				const eventType = key.toLowerCase().substring(2);
				(el as HTMLElement).removeEventListener(eventType, value);
			}
			continue;
		}

		if (!(key in newProps)) {
			if (key === 'className') {
				el.removeAttribute('class');
			} else if (key === 'style') {
				el.removeAttribute('style');
			} else {
				el.removeAttribute(key);
			}
		}
	}

	// Set new props
	for (const [key, value] of Object.entries(newProps)) {
		// Skip event listeners, they're added separately
		if (key.startsWith('on')) {
			continue;
		}

		// Skip if the value hasn't changed
		if (oldProps[key] === value) {
			continue;
		}

		// Handle the style attribute
		if (key === 'style' && typeof value === 'object') {
			if (typeof oldProps.style === 'object') {
				// Update changed styles
				const oldStyle = oldProps.style || {};
				for (const [cssKey, cssValue] of Object.entries(value)) {
					if (oldStyle[cssKey] !== cssValue) {
						(el.style as any)[cssKey] = cssValue;
					}
				}

				// Remove old styles
				for (const cssKey of Object.keys(oldStyle)) {
					if (!(cssKey in value)) {
						(el.style as any)[cssKey] = '';
					}
				}
			} else {
				// Apply all styles
				for (const [cssKey, cssValue] of Object.entries(value)) {
					(el.style as any)[cssKey] = cssValue;
				}
			}
			continue;
		}

		// Handle className -> class
		if (key === 'className') {
			el.setAttribute('class', value);
			continue;
		}

		// Preserve data attributes exactly as they are
		if (isDataAttribute(key)) {
			el.setAttribute(key, value);
			continue;
		}

		// Handle regular attributes
		if (typeof value === 'boolean') {
			if (value) {
				el.setAttribute(key, '');
			} else {
				el.removeAttribute(key);
			}
		} else if (value === null || value === undefined) {
			el.removeAttribute(key);
		} else {
			el.setAttribute(key, value.toString());
		}
	}

	// Add new event listeners
	for (const [key, value] of Object.entries(newProps)) {
		if (key.startsWith('on') && typeof value === 'function') {
			// Only add if it's a new event handler
			if (oldProps[key] !== value) {
				const eventType = key.toLowerCase().substring(2);
				if (oldProps[key]) {
					el.removeEventListener(eventType, oldProps[key]);
				}
				el.addEventListener(eventType, value);
			}
		}
	}
};

/**
 * Diff and patch two virtual DOM nodes
 */
export const patch = (
	oldVNode: VNode | null,
	newVNode: VNode | null,
	parentEl: Node,
	index = 0
): Node | null => {
	// If there's no old node, create a new one
	if (!oldVNode) {
		if (newVNode) {
			const newNode = createRealNode(newVNode);
			parentEl.appendChild(newNode);
			return newNode;
		}
		return null;
	}

	// If there's no new node, remove the old one
	if (!newVNode) {
		if (oldVNode.el) {
			parentEl.removeChild(oldVNode.el);
		}
		return null;
	}

	// If node types differ, replace the old node
	if (oldVNode.type !== newVNode.type) {
		const newNode = createRealNode(newVNode);
		if (oldVNode.el && oldVNode.el.parentNode) {
			oldVNode.el.parentNode.replaceChild(newNode, oldVNode.el);
		}
		return newNode;
	}

	// Check if element tagNames differ (except for fragments)
	if (
		oldVNode.type === 'element' &&
		newVNode.type === 'element' &&
		oldVNode.tagName !== newVNode.tagName &&
		// Allow fragment to match with any element for better array handling
		oldVNode.tagName !== 'fragment' &&
		newVNode.tagName !== 'fragment'
	) {
		const newNode = createRealNode(newVNode);
		if (oldVNode.el && oldVNode.el.parentNode) {
			oldVNode.el.parentNode.replaceChild(newNode, oldVNode.el);
		}
		return newNode;
	}

	// Handle component nodes
	if (oldVNode.type === 'component' && newVNode.type === 'component') {
		// If it's the same component instance, don't recreate it
		if (oldVNode.componentKey === newVNode.componentKey) {
			// Just update props if needed
			if (newVNode.component.updateProps && newVNode.props) {
				newVNode.component.updateProps(newVNode.props);
			}
			// Keep the old element reference
			newVNode.el = oldVNode.el;
			return oldVNode.el as Node;
		} else {
			// If it's a different component, replace it
			const newNode = createRealNode(newVNode);
			if (oldVNode.el && oldVNode.el.parentNode) {
				oldVNode.el.parentNode.replaceChild(newNode, oldVNode.el);
			}
			return newNode;
		}
	}

	// Handle text nodes
	if (newVNode.type === 'text' && oldVNode.type === 'text') {
		if (newVNode.text !== oldVNode.text && oldVNode.el) {
			(oldVNode.el as Text).nodeValue = newVNode.text || '';
		}
		newVNode.el = oldVNode.el;
		return oldVNode.el as Node;
	}

	// Update element node
	if (
		newVNode.type === 'element' &&
		oldVNode.type === 'element' &&
		oldVNode.el
	) {
		// Update reference to the DOM node
		newVNode.el = oldVNode.el;

		// For non-fragment elements, update properties
		if (oldVNode.tagName !== 'fragment' && newVNode.tagName !== 'fragment') {
			// Update properties
			updateProps(
				oldVNode.el as HTMLElement,
				oldVNode.props || {},
				newVNode.props || {}
			);
		}

		// Handle children
		patchChildren(
			oldVNode.children || [],
			newVNode.children || [],
			oldVNode.el as HTMLElement
		);

		return oldVNode.el;
	}

	return null;
};

/**
 * Patch children of a node
 */
const patchChildren = (
	oldChildren: VNode[],
	newChildren: VNode[],
	parentEl: HTMLElement
): void => {
	const maxLength = Math.max(oldChildren.length, newChildren.length);

	for (let i = 0; i < maxLength; i++) {
		const oldChild = i < oldChildren.length ? oldChildren[i] : null;
		const newChild = i < newChildren.length ? newChildren[i] : null;

		patch(oldChild, newChild, parentEl, i);
	}
};

/**
 * Mount a virtual node to a DOM element
 */
export const mount = (vnode: VNode, container: HTMLElement): void => {
	const realNode = createRealNode(vnode);
	container.innerHTML = '';
	container.appendChild(realNode);
};

/**
 * Mount and then update a virtual node
 */
export const render = (
	oldVNode: VNode | null,
	newVNode: VNode,
	container: HTMLElement
): VNode => {
	if (!oldVNode) {
		mount(newVNode, container);
	} else {
		patch(oldVNode, newVNode, container);
	}
	return newVNode;
};

/**
 * Render a virtual DOM node to a real DOM node
 */
export const renderVNode = (vnode: VNode): Node => {
	if (vnode.type === 'text') {
		return document.createTextNode(vnode.text);
	}

	if (vnode.type === 'component') {
		// For component nodes, simply return the component's element
		return vnode.component.getElement();
	}

	const element = document.createElement(vnode.tagName);

	// Set attributes and event handlers
	for (const [key, value] of Object.entries(vnode.props)) {
		// Skip null/undefined values
		if (value === null || value === undefined) continue;

		// Handle event handlers (props starting with 'on')
		if (key.startsWith('on') && typeof value === 'function') {
			const eventName = key.slice(2).toLowerCase();
			element.addEventListener(eventName, value);
		} else {
			// Set attribute
			if (key === 'className') {
				// Handle className -> class conversion
				element.setAttribute('class', String(value));
			} else if (key.startsWith('data-')) {
				// Handle data attributes
				element.setAttribute(key, String(value));
			} else {
				element.setAttribute(key, String(value));
			}
		}
	}

	// Append children
	for (const child of vnode.children) {
		element.appendChild(renderVNode(child));
	}

	return element;
};

/**
 * Patch an existing DOM node with a virtual DOM node
 * This is a simple implementation for now, not a full diff algorithm
 */
export const patchDOM = (oldNode: Node, vnode: VNode): Node => {
	// If we're dealing with a component node, just replace with the component's element
	if (vnode.type === 'component') {
		const newNode = vnode.component.getElement();
		oldNode.parentNode?.replaceChild(newNode, oldNode);
		return newNode;
	}

	// If types don't match or element types differ, replace the node
	if (
		(vnode.type === 'text' && oldNode.nodeType !== Node.TEXT_NODE) ||
		(vnode.type === 'element' &&
			(oldNode.nodeType !== Node.ELEMENT_NODE ||
				(oldNode as HTMLElement).tagName.toLowerCase() !== vnode.tagName))
	) {
		const newNode = renderVNode(vnode);
		oldNode.parentNode?.replaceChild(newNode, oldNode);
		return newNode;
	}

	// Text nodes just need to update content
	if (vnode.type === 'text') {
		if (oldNode.textContent !== vnode.text) {
			oldNode.textContent = vnode.text;
		}
		return oldNode;
	}

	// For element nodes, update attributes and children
	const element = oldNode as HTMLElement;

	// Update attributes
	// Get current attribute names
	const oldAttrs = Array.from(element.attributes).map((attr) => attr.name);

	// Add/update new attributes
	for (const [key, value] of Object.entries(vnode.props)) {
		// Skip event handlers for now
		if (key.startsWith('on') && typeof value === 'function') continue;

		// Set attribute if it has changed
		const attrName = key === 'className' ? 'class' : key;
		if (element.getAttribute(attrName) !== String(value)) {
			element.setAttribute(attrName, String(value));
		}
	}

	// Remove old attributes that are no longer needed
	for (const attrName of oldAttrs) {
		if (
			!(attrName in vnode.props) &&
			attrName !== 'class' && // Handle className special case
			!(attrName === 'class' && 'className' in vnode.props)
		) {
			element.removeAttribute(attrName);
		}
	}

	// Update event handlers
	// (This is simplified - a real implementation would track and update handlers)

	// Update children
	// This is a simplified approach - a more efficient approach would be to use a key-based diff
	const childNodes = Array.from(element.childNodes);

	// Add new children or update existing ones
	for (let i = 0; i < vnode.children.length; i++) {
		const childVNode = vnode.children[i];

		if (i < childNodes.length) {
			// Update existing child
			patchDOM(childNodes[i], childVNode);
		} else {
			// Add new child
			element.appendChild(renderVNode(childVNode));
		}
	}

	// Remove extra children
	while (element.childNodes.length > vnode.children.length) {
		element.removeChild(element.lastChild!);
	}

	return element;
};
