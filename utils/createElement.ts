import { Component } from './component';

type TElementChild =
	| HTMLElement
	| string
	| number
	| Component
	| null
	| undefined;
type TElementChildren = TElementChild | TElementChild[];

type TElementProps = {
	className?: string;
	id?: string;
	type?: string;
	value?: string;
	checked?: boolean;
	placeholder?: string;
	disabled?: boolean;
	src?: string;
	href?: string;
	target?: string;
	[key: string]: any;
};

export const h = (
	tag: keyof HTMLElementTagNameMap,
	props: TElementProps | null = null,
	...children: TElementChildren[]
): HTMLElement => {
	const element = document.createElement(tag);

	if (props) {
		for (const [key, value] of Object.entries(props)) {
			if (value === undefined || value === null) continue;

			if (key === 'className') {
				element.className = value;
			} else if (key === 'style' && typeof value === 'object') {
				for (const [prop, val] of Object.entries(value)) {
					(element.style as any)[prop] = val;
				}
			} else if (key.startsWith('on') && typeof value === 'function') {
				const eventName = key.slice(2).toLowerCase();
				element.addEventListener(eventName, value);
			} else if (key === 'dataset' && typeof value === 'object') {
				for (const [dataKey, dataValue] of Object.entries(value)) {
					element.dataset[dataKey] = String(dataValue);
				}
			} else {
				element.setAttribute(key, String(value));
			}
		}
	}

	const appendChildren = (
		parent: HTMLElement,
		children: TElementChildren[]
	) => {
		for (const child of children.flat()) {
			if (child === null || child === undefined) continue;

			if (child instanceof Component) {
				parent.appendChild(child.getElement());
			} else if (child instanceof HTMLElement) {
				parent.appendChild(child);
			} else {
				parent.appendChild(document.createTextNode(String(child)));
			}
		}
	};

	appendChildren(element, children);

	return element;
};

export const text = (content: string): Text => document.createTextNode(content);

export const fragment = (...children: TElementChildren[]): DocumentFragment => {
	const frag = document.createDocumentFragment();

	for (const child of children.flat()) {
		if (child === null || child === undefined) continue;

		if (child instanceof Component) {
			frag.appendChild(child.getElement());
		} else if (child instanceof Node) {
			frag.appendChild(child);
		} else {
			frag.appendChild(document.createTextNode(String(child)));
		}
	}

	return frag;
};
