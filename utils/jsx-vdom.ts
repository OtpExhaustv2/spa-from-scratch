import { Component } from './component';
import { createElement, VNode } from './vdom';

// Component registry to store component factories
type ComponentFactory = (props: Record<string, any>) => Component;
const componentRegistry = new Map<string, ComponentFactory>();

// Component instance cache to preserve instances between renders
type ComponentKey = string;
const componentCache = new Map<ComponentKey, Component>();

/**
 * Generate a unique key for a component instance based on its tag and position
 */
let componentCounter = 0;
const getComponentKey = (tagName: string, position: string): ComponentKey => {
	return `${tagName}-${position}`;
};

/**
 * Clear the component cache
 * Call this when navigating to a different page
 */
export function clearComponentCache(): void {
	componentCache.clear();
	componentCounter = 0;
}

/**
 * Register a component factory with a custom tag name
 * @param tagName Custom tag name to use in templates
 * @param factory Function that creates component with props
 */
export function registerComponent(
	tagName: string,
	factory: ComponentFactory | (new (...args: any[]) => Component)
): void {
	const normalizedTag = tagName.toLowerCase();

	// If we got a constructor, wrap it in a factory
	if (typeof factory === 'function' && /^[A-Z]/.test(factory.name)) {
		const Constructor = factory as new (...args: any[]) => Component;
		componentRegistry.set(normalizedTag, (props) => new Constructor(props));
	} else {
		// Otherwise, use the factory directly
		componentRegistry.set(normalizedTag, factory as ComponentFactory);
	}
}

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
 * Special attribute handler to detect and preserve camelCase props in HTML
 * This works by encoding camelCase props in a special way in the HTML
 */
const preserveCamelCaseProps = (html: string): string => {
	// Process the HTML to preserve camelCase props
	let processedHtml = html;

	// Find all attribute patterns that might be camelCase using regex
	// This catches props like initialCount, maxLength, etc.
	processedHtml = processedHtml.replace(
		/\s([a-z]+[A-Z][a-zA-Z]*)(=["'][^"']*["'])/g,
		(match, propName, value) => {
			// Keep the original casing by encoding it in a data attribute
			return ` data-camel-${propName}${value}`;
		}
	);

	// Also handle potential event handlers (onclick -> onClick)
	processedHtml = processedHtml.replace(
		/\s(on)([a-z]+)(=["'][^"']*["'])/g,
		(match, prefix, eventName, value) => {
			// Convert first letter to uppercase for event name
			const camelEventName =
				eventName.charAt(0).toUpperCase() + eventName.slice(1);
			return ` data-camel-${prefix}${camelEventName}${value}`;
		}
	);

	return processedHtml;
};

/**
 * Parse an HTML string into a virtual DOM tree
 */
const parseHTML = (html: string): VNode => {
	// Preserve camelCase props before parsing
	const processedHtml = preserveCamelCaseProps(html.trim());

	// Create a temporary container
	const template = document.createElement('template');
	template.innerHTML = processedHtml;

	// Get the first child
	const firstChild = template.content.firstChild;

	// Convert the DOM node to a virtual DOM node
	return domToVNode(firstChild as Element);
};

/**
 * Universal solution for detecting and fixing camelCase prop names
 * HTML attributes are always lowercase, but JSX/React uses camelCase
 */
const normalizePropKeys = (props: Record<string, any>): Record<string, any> => {
	const result: Record<string, any> = {};

	// First, handle special cases
	if ('class' in props) {
		result.className = props.class;
	} else if ('className' in props) {
		result.className = props.className;
	}

	if ('for' in props) {
		result.htmlFor = props.for;
	} else if ('htmlFor' in props) {
		result.htmlFor = props.htmlFor;
	}

	// Create a map of lowercase keys to their original versions (for all camelCase props)
	const originalKeys: Record<string, string> = {};

	// Fill originalKeys with all existing props
	Object.keys(props).forEach((key) => {
		// Only map camelCase keys (keys with lowercase start + uppercase character in middle)
		if (/^[a-z].*[A-Z].*$/.test(key)) {
			originalKeys[key.toLowerCase()] = key;
		}
	});

	// Process all props
	Object.entries(props).forEach(([key, value]) => {
		// Skip special cases we already handled
		if (key === 'class' || key === 'for') return;

		// Convert kebab-case to camelCase
		if (key.includes('-')) {
			const camelKey = key.replace(/-([a-z])/g, (_, letter) =>
				letter.toUpperCase()
			);
			result[camelKey] = value;
		}
		// Check if this might be a lowercased version of a camelCase prop
		else if (key.toLowerCase() === key && originalKeys[key]) {
			// If we find a match, use the original camelCase version
			result[originalKeys[key]] = value;
		}
		// For event handlers that might be lowercased (onclick -> onClick)
		else if (key.startsWith('on') && key.length > 2) {
			const eventName = key.substring(2);
			const camelEventName =
				eventName.charAt(0).toUpperCase() + eventName.slice(1);
			result[`on${camelEventName}`] = value;
		}
		// Otherwise keep the key as is
		else {
			result[key] = value;
		}
	});

	return result;
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

		// Process attributes to handle encoded camelCase properties
		const camelCaseProps: Record<string, string> = {};

		for (const attr of Array.from(el.attributes)) {
			// Check for encoded camelCase props (data-camel-propName)
			if (attr.name.startsWith('data-camel-')) {
				const actualPropName = attr.name.substring('data-camel-'.length);
				camelCaseProps[actualPropName] = attr.value;
			} else {
				// Add attribute to props - we'll normalize them later
				props[attr.name] = attr.value;
			}
		}

		// Add all camelCase props
		Object.assign(props, camelCaseProps);

		// Check if this is a registered component
		if (componentRegistry.has(tagName)) {
			// Generate a unique key for this component instance
			const componentKey = getComponentKey(tagName, path);
			let instance: Component;

			// Process props before creating the component
			const processedProps: Record<string, any> = { ...props };

			// Normalize common React prop names
			const normalizedProps = normalizePropKeys(processedProps);

			// Reuse existing component if available
			if (componentCache.has(componentKey)) {
				instance = componentCache.get(componentKey)!;
				// Here we would update props if we had a method for that
			} else {
				// Create a new component with the processed props
				const factory = componentRegistry.get(tagName)!;

				// Create the component with the processed props
				instance = factory(normalizedProps);
				componentCache.set(componentKey, instance);
			}

			return {
				type: 'component',
				component: instance,
				props: normalizedProps,
				componentKey,
			} as any;
		}

		// Get children with path information
		const children: VNode[] = Array.from(el.childNodes).map(
			(childNode, index) => domToVNode(childNode, `${path}-${index}`)
		);

		// For regular elements, normalize the props
		const normalizedProps = normalizePropKeys(props);

		return {
			type: 'element',
			tagName,
			props: normalizedProps,
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
		const component = values[index] as Component;

		if (component instanceof Component) {
			// Generate a component key for this explicit component instance
			const componentKey = `explicit-component-${componentCounter++}`;

			// Create a special node that will be replaced with the component's element
			return {
				type: 'component',
				component,
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
		// Check if this is a custom component
		if (componentRegistry.has(vnode.tagName)) {
			// Generate a unique key for this component instance
			const componentKey = getComponentKey(vnode.tagName, path);
			let instance: Component;

			// Process props before creating the component
			const processedProps: Record<string, any> = { ...vnode.props };

			// Replace placeholder values in props
			for (const [key, value] of Object.entries(processedProps)) {
				if (typeof value === 'string') {
					const placeholderRegex = /__VDOM_PLACEHOLDER_(\d+)__/g;
					let match;

					if ((match = placeholderRegex.exec(value)) !== null) {
						const index = parseInt(match[1], 10);
						processedProps[key] = values[index];
					}
				}
			}

			// Normalize props (fix casing issues)
			const normalizedProps = normalizePropKeys(processedProps);

			// Reuse existing component if available
			if (componentCache.has(componentKey)) {
				instance = componentCache.get(componentKey)!;
				// Here we would update props if we had a method for that
			} else {
				// Create a new component with normalized props
				const factory = componentRegistry.get(vnode.tagName)!;
				instance = factory(normalizedProps);
				componentCache.set(componentKey, instance);
			}

			// Return a component node
			return {
				type: 'component',
				component: instance,
				props: normalizedProps,
				componentKey,
			} as any;
		}

		// Check for placeholders in attributes
		const newProps: Record<string, any> = { ...vnode.props };

		for (const [key, value] of Object.entries(vnode.props || {})) {
			if (typeof value === 'string') {
				const placeholderRegex = /__VDOM_PLACEHOLDER_(\d+)__/g;
				let match;

				if ((match = placeholderRegex.exec(value)) !== null) {
					const index = parseInt(match[1], 10);
					newProps[key] = values[index];
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
