import { Component } from './component';
import { createElement, VNode, VNodeComponent } from './vdom';

// Component instance cache to preserve instances between renders
type ComponentKey = string;
const componentCache = new Map<ComponentKey, Component>();

// Track component counter for unique keys
let componentCounter = 0;

/**
 * Clear the component cache
 * Call this when navigating to a different page
 * Components with explicit keys are preserved
 */
export const clearComponentCache = (): void => {
	// Find components to keep (those with explicit keys)
	const componentsToKeep = new Map<ComponentKey, Component>();

	// Identify components with explicit keys (not auto-generated)
	for (const [key, component] of componentCache.entries()) {
		// Keep components with keys that don't match the auto-generated pattern
		if (!key.match(/^[A-Za-z]+-\d+$/)) {
			console.log(`Preserving component with key: ${key}`);
			componentsToKeep.set(key, component);
		} else {
			// Destroy components we're removing
			if (typeof component.destroy === 'function') {
				component.destroy();
			}
		}
	}

	// Clear the cache but restore the kept components
	componentCache.clear();

	// Restore the kept components
	for (const [key, component] of componentsToKeep.entries()) {
		componentCache.set(key, component);
	}

	// Reset component counter
	componentCounter = 0;
};

/**
 * JSX factory function that creates virtual DOM nodes
 * This is a drop-in replacement for the old JSX implementation
 * but instead of creating real DOM nodes directly, it creates
 * virtual DOM nodes that can be efficiently diffed and patched
 */
export const jsx = (
	tagName: string,
	props: Record<string, any> | null,
	...children: any[]
): VNode => {
	return createElement(tagName, props || {}, ...children);
};

/**
 * Tagged template literal function for JSX-like syntax
 * This is a more ergonomic way to create virtual DOM nodes
 * using template literals instead of JSX
 */
export const html = (
	strings: TemplateStringsArray,
	...values: any[]
): VNode => {
	// Combine the template strings and values into a single HTML string
	let combinedString = '';
	const valuesWithPlaceholders: any[] = [];

	// Replace values with placeholders to parse as HTML
	for (let i = 0; i < strings.length; i++) {
		combinedString += strings[i];

		if (i < values.length) {
			// If the value is a function or object, or an array, add a placeholder and store the value
			if (
				typeof values[i] === 'function' ||
				Array.isArray(values[i]) ||
				(typeof values[i] === 'object' && values[i] !== null)
			) {
				// Special handling for Component instances
				if (values[i] instanceof Component) {
					// Use a special placeholder for components
					combinedString += `<component-placeholder data-index="${valuesWithPlaceholders.length}"></component-placeholder>`;
					valuesWithPlaceholders.push(values[i]);
				} else {
					combinedString += `__VDOM_PLACEHOLDER_${valuesWithPlaceholders.length}__`;
					valuesWithPlaceholders.push(values[i]);
				}
			} else {
				// For primitives, we can inline them directly
				combinedString += values[i];
			}
		}
	}

	// Parse the HTML string into a virtual DOM tree
	const vdom = parseHTML(combinedString);
	// Replace placeholders with actual values
	return replacePlaceholders(vdom, valuesWithPlaceholders);
};

/**
 * Parse an HTML string into a virtual DOM tree
 */
const parseHTML = (html: string): VNode => {
	// Create a temporary container
	const template = document.createElement('template');
	template.innerHTML = html.trim();

	// Get the first child
	const firstChild = template.content.firstChild;

	// Convert the DOM node to a virtual DOM node
	return domToVNode(firstChild as Element);
};

/**
 * Convert a DOM node to a virtual DOM node
 */
const domToVNode = (node: Node, path: string = '0'): VNode => {
	// Handle text nodes
	if (node.nodeType === Node.TEXT_NODE) {
		return {
			type: 'text',
			text: node.textContent || '',
		};
	}

	// Handle element nodes
	if (node.nodeType === Node.ELEMENT_NODE) {
		const el = node as Element;
		const tagName = el.tagName.toLowerCase();

		// Get attributes as props
		const props: Record<string, any> = {};

		for (const attr of Array.from(el.attributes)) {
			// Preserve all attributes as they are in the DOM
			props[attr.name] = attr.value;
		}

		// Check for component placeholder
		if (tagName === 'component-placeholder') {
			// Return element as is, it will be processed in replacePlaceholders
			return {
				type: 'element',
				tagName,
				props,
				children: [],
			};
		}

		// Get children with path information
		const children: VNode[] = Array.from(el.childNodes).map(
			(childNode, index) => domToVNode(childNode, `${path}-${index}`)
		);

		return {
			type: 'element',
			tagName,
			props,
			children,
		};
	}

	// Default fallback (should not happen)
	return {
		type: 'text',
		text: '',
	};
};

/**
 * Replace placeholders in the virtual DOM tree with actual values
 */
const replacePlaceholders = (
	vnode: VNode,
	values: any[],
	path: string = '0'
): VNode => {
	// Special handling for component placeholders
	if (
		vnode.type === 'element' &&
		vnode.tagName === 'component-placeholder' &&
		vnode.props &&
		'data-index' in vnode.props
	) {
		const index = parseInt(vnode.props['data-index'] as string, 10);
		const value = values[index];

		// Handle Component instances
		if (value instanceof Component) {
			// Generate a stable component key based on the component's position in the tree
			const componentKey = `explicit-component-${path}`;

			// Use the component directly
			return {
				type: 'component',
				component: value,
				props: vnode.props,
				componentKey,
			} as any;
		}
	}

	if (vnode.type === 'text' && vnode.text) {
		// Check if the text contains a placeholder
		const placeholderRegex = /__VDOM_PLACEHOLDER_(\d+)__/g;
		let match;
		let newText = vnode.text;

		while ((match = placeholderRegex.exec(vnode.text)) !== null) {
			const index = parseInt(match[1], 10);
			const value = values[index];

			// Check if this is a VNodeComponent from useComponent
			if (value && typeof value === 'object' && value.type === 'component') {
				// Return the component node directly
				return value;
			}

			// If we find a placeholder that represents an array of VNodes,
			// we'll return a special wrapper element containing those nodes
			if (Array.isArray(value)) {
				// If the array contains VNodes, return a fragment
				if (
					value.length > 0 &&
					value.every((item) => typeof item === 'object' && item.type)
				) {
					return {
						type: 'element',
						tagName: 'fragment',
						props: {},
						children: value,
					};
				}
				// Otherwise, it's an array of strings/primitives, join them
				return {
					type: 'text',
					text: value.join(''),
				};
			}

			// For regular values
			// Replace the placeholder with the value
			newText = newText.replace(match[0], '');

			// If the value is a string, we can inline it
			if (typeof value === 'string') {
				newText = value;
			}

			// If the value is a VNode, we return it directly
			if (value && typeof value === 'object' && value.type) {
				return value;
			}
		}

		// If the text changed, return a new text node
		if (newText !== vnode.text) {
			return {
				type: 'text',
				text: newText,
			};
		}
	}

	// Handle element nodes
	if (vnode.type === 'element') {
		// Check for placeholders in attributes
		const newProps: Record<string, any> = { ...vnode.props };

		for (const [key, value] of Object.entries(vnode.props || {})) {
			if (typeof value === 'string') {
				const placeholderRegex = /__VDOM_PLACEHOLDER_(\d+)__/g;
				let match;

				if ((match = placeholderRegex.exec(value)) !== null) {
					const index = parseInt(match[1], 10);
					const placeholderValue = values[index];

					// Special handling for components used in attribute values
					if (
						placeholderValue &&
						typeof placeholderValue === 'object' &&
						placeholderValue.type === 'component'
					) {
						// Extract the actual component instance for attribute values
						newProps[key] = placeholderValue.component;
					} else {
						newProps[key] = placeholderValue;
					}
				}
			}
		}

		// Check for placeholders in children
		let newChildren: VNode[] = [];

		if (vnode.children) {
			for (let i = 0; i < vnode.children.length; i++) {
				const child = vnode.children[i];
				const childPath = `${path}-${i}`;
				const replacedChild = replacePlaceholders(child, values, childPath);

				// Handle fragment nodes (arrays of VNodes)
				if (
					replacedChild.type === 'element' &&
					replacedChild.tagName === 'fragment'
				) {
					// Add all fragment children instead of the fragment itself
					if (replacedChild.children) {
						newChildren = newChildren.concat(replacedChild.children);
					}
				} else {
					newChildren.push(replacedChild);
				}
			}
		}

		return {
			type: 'element',
			tagName: vnode.tagName,
			props: newProps,
			children: newChildren,
		};
	}

	return vnode;
};

/**
 * Create a component VNode with proper typing
 * Props are optional if the component doesn't require them
 */
export const useComponent = <P extends Record<string, any> = {}>(
	ComponentClass: new (props?: P) => Component,
	props?: P,
	key?: string
): VNodeComponent => {
	// Generate a unique key for this component instance
	// Use provided key or component name + counter
	const cacheKey = key || `${ComponentClass.name}-${componentCounter++}`;

	let instance: Component;

	// Check if we already have an instance with this key
	if (componentCache.has(cacheKey)) {
		// Reuse existing instance
		instance = componentCache.get(cacheKey) as Component;

		// Update props on existing instance
		if (instance.updateProps && props) {
			instance.updateProps(props as Record<string, any>);
		}
	} else {
		// Create new instance if not found in cache
		instance = new ComponentClass(props);

		// Store in cache for future reference
		componentCache.set(cacheKey, instance);
	}

	return {
		type: 'component',
		component: instance,
		props: (props || {}) as Record<string, any>,
		componentKey: cacheKey,
	};
};
