import { Component } from '../utils/component';
import { html } from '../utils/jsx-vdom';
import { appStore } from '../utils/store';

type Particle = {
	x: number;
	y: number;
	size: number;
	speedX: number;
	speedY: number;
	color: string;
	opacity: number;
};

export class Particles extends Component {
	private particles: Particle[] = [];
	private canvas: HTMLCanvasElement | null = null;
	private ctx: CanvasRenderingContext2D | null = null;
	private animationId: number = 0;
	private mousePosition = { x: 0, y: 0 };
	private isMouseOver = false;
	private unsubscribe: (() => void) | null = null;
	private theme: 'light' | 'dark' = 'light';

	constructor(count: number = 50) {
		super('div', 'particles-container');

		// Subscribe to theme changes
		this.unsubscribe = appStore.subscribe((state) => {
			if (this.theme !== state.theme) {
				this.theme = state.theme;
				this.updateParticleColors();
			}
		});
		this.theme = appStore.getState().theme;

		// Initial render with virtual DOM
		this.render();

		// Initialize once the canvas is in the DOM
		setTimeout(() => {
			this.initCanvas();
			this.initParticles(count);
			this.setupEventListeners();
			this.startAnimation();
			this.applyStyles();
		}, 0);
	}

	private initCanvas = (): void => {
		// Get the canvas from the DOM after render
		this.canvas = this.element.querySelector(
			'.particles-canvas'
		) as HTMLCanvasElement;
		if (!this.canvas) return;

		// Get context
		const ctx = this.canvas.getContext('2d');
		if (!ctx) throw new Error('Could not get canvas context');
		this.ctx = ctx;
	};

	private applyStyles = (): void => {
		if (!this.canvas) return;

		// Style container
		this.element.style.position = 'fixed';
		this.element.style.top = '0';
		this.element.style.left = '0';
		this.element.style.width = '100%';
		this.element.style.height = '100%';
		this.element.style.zIndex = '-10';
		this.element.style.pointerEvents = 'none';

		// Style canvas
		this.canvas.style.width = '100%';
		this.canvas.style.height = '100%';
		this.canvas.style.opacity = '0.6';
	};

	private initParticles = (count: number): void => {
		this.particles = [];

		for (let i = 0; i < count; i++) {
			this.particles.push(this.createParticle());
		}
	};

	private createParticle = (x?: number, y?: number): Particle => {
		if (!this.canvas) {
			return {
				x: 0,
				y: 0,
				size: 0,
				speedX: 0,
				speedY: 0,
				color: '#000',
				opacity: 0,
			};
		}

		const size = Math.random() * 4 + 2;
		const colors =
			this.theme === 'light'
				? ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6']
				: ['#6ab0de', '#e27c79', '#66d9a2', '#f6bc60', '#b88ed6'];

		return {
			x: x ?? Math.random() * this.canvas.width,
			y: y ?? Math.random() * this.canvas.height,
			size,
			speedX: Math.random() * 1.5 - 0.75,
			speedY: Math.random() * 1.5 - 0.75,
			color: colors[Math.floor(Math.random() * colors.length)],
			opacity: Math.random() * 0.5 + 0.5,
		};
	};

	private updateParticleColors = (): void => {
		for (const particle of this.particles) {
			const colors =
				this.theme === 'light'
					? ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6']
					: ['#6ab0de', '#e27c79', '#66d9a2', '#f6bc60', '#b88ed6'];

			particle.color = colors[Math.floor(Math.random() * colors.length)];
		}
	};

	private setupEventListeners = (): void => {
		if (!this.canvas) return;

		// Resize handler
		window.addEventListener('resize', this.handleResize);

		// Mouse movement tracking
		this.canvas.addEventListener('mousemove', this.handleMouseMove);
		this.canvas.addEventListener('mouseenter', () => {
			this.isMouseOver = true;
		});
		this.canvas.addEventListener('mouseleave', () => {
			this.isMouseOver = false;
		});

		// Allow pointer events on canvas only
		this.canvas.style.pointerEvents = 'auto';
	};

	private handleResize = (): void => {
		this.resizeCanvas();
	};

	private handleMouseMove = (e: MouseEvent): void => {
		if (!this.canvas) return;

		const rect = this.canvas.getBoundingClientRect();
		this.mousePosition = {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top,
		};

		// Create new particle at mouse position occasionally
		if (Math.random() < 0.1) {
			this.particles.push(
				this.createParticle(this.mousePosition.x, this.mousePosition.y)
			);

			// Keep particle count reasonable
			if (this.particles.length > 100) {
				this.particles.shift();
			}
		}
	};

	private resizeCanvas = (): void => {
		if (!this.canvas) return;

		// Set canvas size to match window dimensions
		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;

		// Re-initialize particles after resize to distribute them correctly
		this.initParticles(this.particles.length);
	};

	private startAnimation = (): void => {
		if (!this.canvas || !this.ctx) return;

		// Initial resize
		this.resizeCanvas();

		// Force another resize after a short delay to ensure proper dimensions
		setTimeout(() => this.resizeCanvas(), 100);

		// Animation loop
		const animate = () => {
			if (!this.canvas || !this.ctx) return;

			this.animationId = requestAnimationFrame(animate);
			this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

			// Draw a semi-transparent background for better visibility of particles
			if (this.theme === 'dark') {
				this.ctx.fillStyle = 'rgba(0, 0, 0, 0.01)';
			} else {
				this.ctx.fillStyle = 'rgba(255, 255, 255, 0.01)';
			}
			this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

			for (const particle of this.particles) {
				// Update position
				particle.x += particle.speedX;
				particle.y += particle.speedY;

				// Bounce off edges with a bit of randomness
				if (particle.x < 0 || particle.x > this.canvas.width) {
					particle.speedX = -particle.speedX * (0.9 + Math.random() * 0.2);
				}

				if (particle.y < 0 || particle.y > this.canvas.height) {
					particle.speedY = -particle.speedY * (0.9 + Math.random() * 0.2);
				}

				// Draw particle
				this.ctx.beginPath();
				this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
				this.ctx.fillStyle = particle.color;
				this.ctx.globalAlpha = particle.opacity;
				this.ctx.fill();

				// Draw connections to nearby particles
				this.drawConnections(particle);

				// Apply mouse interaction if mouse is over
				if (this.isMouseOver) {
					this.applyMouseForce(particle);
				}
			}
		};

		animate();
	};

	private drawConnections = (particle: Particle): void => {
		if (!this.ctx) return;

		for (const other of this.particles) {
			if (particle === other) continue;

			const distance = Math.sqrt(
				Math.pow(particle.x - other.x, 2) + Math.pow(particle.y - other.y, 2)
			);

			if (distance < 100) {
				this.ctx.beginPath();
				this.ctx.strokeStyle = particle.color;
				this.ctx.globalAlpha = 0.2 * (1 - distance / 100);
				this.ctx.lineWidth = 0.5;
				this.ctx.moveTo(particle.x, particle.y);
				this.ctx.lineTo(other.x, other.y);
				this.ctx.stroke();
			}
		}
	};

	private applyMouseForce = (particle: Particle): void => {
		const dx = particle.x - this.mousePosition.x;
		const dy = particle.y - this.mousePosition.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance < 100) {
			// Push particles away from mouse
			const forceX = (dx / distance) * 0.5;
			const forceY = (dy / distance) * 0.5;

			particle.speedX += forceX;
			particle.speedY += forceY;

			// Limit speed
			const maxSpeed = 3;
			const speed = Math.sqrt(
				particle.speedX * particle.speedX + particle.speedY * particle.speedY
			);

			if (speed > maxSpeed) {
				particle.speedX = (particle.speedX / speed) * maxSpeed;
				particle.speedY = (particle.speedY / speed) * maxSpeed;
			}
		}
	};

	protected render = (): void => {
		const content = html` <canvas class="particles-canvas"></canvas> `;
		this.replaceContents(content);
	};

	public destroy = (): void => {
		if (this.animationId) {
			cancelAnimationFrame(this.animationId);
		}

		window.removeEventListener('resize', this.handleResize);

		if (this.canvas) {
			this.canvas.removeEventListener('mousemove', this.handleMouseMove);
		}

		if (this.unsubscribe) {
			this.unsubscribe();
		}
	};
}
