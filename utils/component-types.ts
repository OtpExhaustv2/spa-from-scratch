import { Component } from './component';
import { HookComponent } from './hooks';

// Base component props interface
export type TComponentProps = Record<string, any>;

// Component constructor type (similar to React.FC)
export type TComponentConstructor<P = {}> = new (
	props?: P & TComponentProps
) => Component;

// HookComponent constructor type (for hook-based components)
export type THookComponentConstructor<P = {}> = new (
	props?: P & TComponentProps
) => HookComponent;
