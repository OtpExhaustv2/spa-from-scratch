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
	key?: string | number; // Unique key for reconciliation
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
	// Extract key from props if present
	const key = props.key;

	// Create normalized children nodes
	const normalizedChildren: VNode[] = children
		.flat(Infinity)
		.filter((child) => child !== null && child !== undefined)
		.map((child) => {
			if (typeof child === 'string' || typeof child === 'number') {
				return {
					type: 'text',
					text: String(child),
				};
			}
			return child;
		});

	return {
		type: 'element',
		tagName,
		props,
		children: normalizedChildren,
		key,
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
		// Store reference to the DOM node
		vnode.el = componentEl;
		// Ensure we have the latest rendered output without directly calling protected methods
		vnode.component.update();
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
 * Patch children of a node with efficient key-based reconciliation
 */
const patchChildren = (
	oldChildren: VNode[],
	newChildren: VNode[],
	parentEl: HTMLElement
): void => {
	// Step 1: Create a map of old children by key
	const oldKeyToIndexMap = new Map<string | number, number>();
	const oldKeyToNodeMap = new Map<string | number, VNode>();

	// Helper to get a unique key for a VNode
	const getVNodeKey = (vnode: VNode, index: number): string | number => {
		if (vnode.type === 'element' && vnode.key !== undefined) {
			return vnode.key;
		}
		if (vnode.type === 'component' && vnode.componentKey) {
			return vnode.componentKey;
		}
		// Fallback to position-based key if no explicit key
		return `position-${index}`;
	};

	// Index old children by their keys
	for (let i = 0; i < oldChildren.length; i++) {
		const child = oldChildren[i];
		const key = getVNodeKey(child, i);
		oldKeyToIndexMap.set(key, i);
		oldKeyToNodeMap.set(key, child);
	}

	// Initialize variables for tracking DOM operations
	let lastIndex = 0;
	const moves: Array<{ node: Node; refNode: Node | null }> = [];

	// Track which old nodes are used
	const usedKeys = new Set<string | number>();

	// First, handle all new children
	for (let i = 0; i < newChildren.length; i++) {
		const newChild = newChildren[i];
		const newKey = getVNodeKey(newChild, i);

		let oldIndex = -1;
		let oldChild: VNode | null = null;

		// Try to find old child with matching key
		if (oldKeyToNodeMap.has(newKey)) {
			oldIndex = oldKeyToIndexMap.get(newKey) || -1;
			oldChild = oldKeyToNodeMap.get(newKey) || null;
			usedKeys.add(newKey);
		}

		// If we found a matching old node
		if (oldChild) {
			// Patch the old node with the new data
			patch(oldChild, newChild, parentEl);

			// Transfer reference to DOM node
			newChild.el = oldChild.el;

			// Check if we need to move this node
			if (oldIndex < lastIndex) {
				// Node needs to be moved to a later position
				if (oldChild.el) {
					// Queue move operation to be performed after all patches
					const refNode =
						i + 1 < newChildren.length ? newChildren[i + 1].el || null : null;
					moves.push({ node: oldChild.el, refNode });
				}
			} else {
				// Update lastIndex if this node doesn't need to be moved
				lastIndex = oldIndex;
			}
		} else {
			// No matching old node, create a new one
			const newNode = createRealNode(newChild);

			// Figure out where to insert
			// This is a bit complex because we need to consider both existing nodes and future nodes
			let insertPosition = i;
			// Look ahead to find if any following nodes have already been processed
			for (let j = i + 1; j < newChildren.length; j++) {
				const nextKey = getVNodeKey(newChildren[j], j);
				if (oldKeyToNodeMap.has(nextKey) && newChildren[j].el) {
					insertPosition = j;
					break;
				}
			}

			// Insert at the correct position
			if (insertPosition > i) {
				// Insert before a node we found ahead
				parentEl.insertBefore(newNode, newChildren[insertPosition].el || null);
			} else {
				// Insert at current index
				const refNode = parentEl.childNodes[i] || null;
				parentEl.insertBefore(newNode, refNode);
			}
		}
	}

	// Now perform all queued move operations
	for (const { node, refNode } of moves) {
		parentEl.insertBefore(node, refNode);
	}

	// Remove old nodes that aren't in the new children list
	for (let i = 0; i < oldChildren.length; i++) {
		const child = oldChildren[i];
		const key = getVNodeKey(child, i);
		if (!usedKeys.has(key) && child.el) {
			parentEl.removeChild(child.el);
		}
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
