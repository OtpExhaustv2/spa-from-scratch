import { Component } from './component';

type TElementOrString =
	| HTMLElement
	| DocumentFragment
	| Component
	| string
	| null;

/**
 * A minimal JSX-like parser using tagged template literals
 * Usage: html`<div class="container"><h1>${title}</h1><p>${content}</p></div>`
 */
export const html = (
	strings: TemplateStringsArray,
	...values: any[]
): TElementOrString => {
	// Combine the string parts and values
	let combinedString = '';
	for (let i = 0; i < strings.length; i++) {
		combinedString += strings[i];
		if (i < values.length) {
			combinedString += `__PLACEHOLDER_${i}__`;
		}
	}

	// temp container
	const template = document.createElement('template');
	template.innerHTML = combinedString.trim();

	const content = template.content.cloneNode(true) as DocumentFragment;

	const elements = content.querySelectorAll('*');

	replaceAttributePlaceholders(elements, values);

	processNode(content, values);

	if (content.childNodes.length === 1) {
		return content.firstChild as HTMLElement;
	}

	return content;
};

// Process a node and all its children to find and replace placeholders
const processNode = (node: Node, values: any[]): void => {
	if (node.nodeType === Node.TEXT_NODE) {
		const textNode = node as Text;
		replaceTextNodePlaceholders(textNode, values);
		return;
	}

	if (
		node.nodeType !== Node.ELEMENT_NODE &&
		node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE
	) {
		return;
	}

	const childNodes = Array.from(node.childNodes);

	for (const child of childNodes) {
		processNode(child, values);
	}
};

// Replace placeholders in element attributes
const replaceAttributePlaceholders = (
	elements: NodeListOf<Element>,
	values: any[]
): void => {
	for (const element of Array.from(elements)) {
		// First collect all attributes we need to process
		const attributesToProcess: {
			name: string;
			value: string;
			index: number;
			replacement: any;
		}[] = [];

		for (const attr of Array.from(element.attributes)) {
			const value = attr.value;
			const placeholderRegex = /__PLACEHOLDER_(\d+)__/g;

			if (placeholderRegex.test(value)) {
				placeholderRegex.lastIndex = 0;

				// Extract placeholder index
				const match = placeholderRegex.exec(value);
				if (!match) continue;

				const index = parseInt(match[1], 10);
				const replacement = values[index];

				attributesToProcess.push({
					name: attr.name,
					value: attr.value,
					index,
					replacement,
				});
			}
		}

		for (const attr of attributesToProcess) {
			if (
				attr.name.startsWith('on') &&
				typeof attr.replacement === 'function'
			) {
				const eventName = attr.name.slice(2).toLowerCase();

				element.removeAttribute(attr.name);

				element.addEventListener(eventName, (event: Event) => {
					attr.replacement(event);
				});
			} else if (
				attr.name === 'style' &&
				typeof attr.replacement === 'object'
			) {
				element.removeAttribute(attr.name);

				for (const [prop, val] of Object.entries(attr.replacement)) {
					(element as HTMLElement).style[prop as any] = val as string;
				}
			} else {
				let updatedValue = attr.value;
				const placeholderRegex = /__PLACEHOLDER_(\d+)__/g;

				let matchResult;
				while ((matchResult = placeholderRegex.exec(attr.value)) !== null) {
					const idx = parseInt(matchResult[1], 10);
					const val = values[idx];
					updatedValue = updatedValue.replace(
						`__PLACEHOLDER_${idx}__`,
						String(val ?? '')
					);
				}

				if (attr.name === 'class') {
					element.className = updatedValue;
				} else {
					element.setAttribute(attr.name, updatedValue);
				}
			}
		}
	}
};

// replace placeholders in text nodes
const replaceTextNodePlaceholders = (node: Text, values: any[]): void => {
	const text = node.nodeValue || '';
	const placeholderRegex = /__PLACEHOLDER_(\d+)__/g;

	if (!text.trim()) return;

	if (!placeholderRegex.test(text)) return;

	placeholderRegex.lastIndex = 0;

	const matches: { index: number; value: any }[] = [];
	let match;
	while ((match = placeholderRegex.exec(text)) !== null) {
		const index = parseInt(match[1], 10);
		matches.push({
			index,
			value: values[index],
		});
	}

	if (matches.length === 0) return;

	const parent = node.parentNode;
	if (!parent) return;

	const hasComplexReplacements = matches.some(
		(m) =>
			m.value instanceof Component ||
			m.value instanceof HTMLElement ||
			m.value instanceof DocumentFragment
	);

	if (hasComplexReplacements) {
		const parts = text.split(/__PLACEHOLDER_\d+__/);

		// create a document fragment to hold our replacements
		const fragment = document.createDocumentFragment();

		if (parts[0]) {
			fragment.appendChild(document.createTextNode(parts[0]));
		}

		for (let i = 0; i < matches.length; i++) {
			const match = matches[i];
			const value = match.value;

			// Add the component or element
			if (value instanceof Component) {
				fragment.appendChild(value.getElement());
			} else if (
				value instanceof HTMLElement ||
				value instanceof DocumentFragment
			) {
				fragment.appendChild(value);
			} else {
				fragment.appendChild(document.createTextNode(String(value ?? '')));
			}

			if (parts[i + 1]) {
				fragment.appendChild(document.createTextNode(parts[i + 1]));
			}
		}

		parent.replaceChild(fragment, node);
	} else {
		let newValue = text;
		for (const match of matches) {
			const placeholder = `__PLACEHOLDER_${match.index}__`;
			newValue = newValue.replace(placeholder, String(match.value ?? ''));
		}

		node.nodeValue = newValue;
	}
};
