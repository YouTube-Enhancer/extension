import type { YouTubePlayerDiv } from "@/src/types";

import eventManager from "@/src/utils/EventManager";
import { browserColorLog } from "@/src/utils/utilities";

export const setupDoubleClickToLikeShorts = (playerContainer: YouTubePlayerDiv) => {
	let lastClickTime = 0;
	const doubleClickThreshold = 300;
	
	const findLikeButton = (): HTMLButtonElement | null => {
		const selectors = [
			'ytd-shorts[is-active] ytd-reel-video-renderer #actions button[aria-label*="like" i]:not([aria-label*="dislike" i])',
			'ytd-shorts[is-active] #actions button[aria-label*="like" i]:not([aria-label*="dislike" i])',
			'#shorts-player + div button[aria-label*="like" i]:not([aria-label*="dislike" i])',
			'#like-button button',
			'ytd-shorts[is-active] button:has(svg path[d*="M18.77,11h-4.23l1"])',
			'button[aria-label*="like" i]:not([aria-label*="dislike" i])'
		];
		
		for (const selector of selectors) {
			const button = document.querySelector<HTMLButtonElement>(selector);
			if (button) return button;
		}
		
		return null;
	};

	const handleDoubleClick = (event: MouseEvent) => {
		const currentTime = new Date().getTime();
		const timeDiff = currentTime - lastClickTime;

		if (timeDiff < doubleClickThreshold && timeDiff > 0) {
			event.preventDefault();
			event.stopPropagation();
			
			const likeButton = findLikeButton();

			if (likeButton) {
				const isAlreadyLiked = likeButton.getAttribute('aria-pressed') === 'true' || 
				                       likeButton.classList.contains('yt-spec-button-shape-next--filled');
				
				if (!isAlreadyLiked) {
					likeButton.click();
					createHeartAnimation(event.clientX, event.clientY);
				}
			}
		}

		lastClickTime = currentTime;
	};
	const createHeartAnimation = (x: number, y: number) => {
		const heart = document.createElement('div');
		heart.innerHTML = '❤️';
		heart.style.position = 'fixed';
		heart.style.left = `${x}px`;
		heart.style.top = `${y}px`;
		heart.style.fontSize = '50px';
		heart.style.pointerEvents = 'none';
		heart.style.zIndex = '9999';
		heart.style.opacity = '1';
		heart.style.transition = 'all 0.8s ease-in-out';
		
		document.body.appendChild(heart);
		
		setTimeout(() => {
			heart.style.opacity = '0';
			heart.style.transform = 'translateY(-100px) scale(1.5)';
		}, 10);
		
		setTimeout(() => {
			document.body.removeChild(heart);
		}, 800);
	};
	
	const setupEventHandlers = () => {
		const videoElement = playerContainer.querySelector('video');
		const videoOverlays = playerContainer.querySelectorAll('.html5-video-container, .html5-video-overlay');
		
		eventManager.addEventListener(playerContainer, "click", handleDoubleClick as EventListener, "doubleClickToLikeShorts");
		
		if (videoElement) {
			eventManager.addEventListener(videoElement, "click", handleDoubleClick as EventListener, "doubleClickToLikeShorts");
		}
		
		videoOverlays.forEach((overlay: Element) => {
			eventManager.addEventListener(overlay as HTMLElement, "click", handleDoubleClick as EventListener, "doubleClickToLikeShorts");
		});
	};
	
	setupEventHandlers();
	
	const setupMutationObserver = () => {
		const shortsObserver = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
					setupEventHandlers();
				}
			}
		});
		
		const shortsContainer = document.querySelector('ytd-shorts, #shorts-container');
		if (shortsContainer) {
			shortsObserver.observe(shortsContainer, { childList: true, subtree: true });
		}
		
		(window as any).__shortsObserver = shortsObserver;
	};
	
	setupMutationObserver();
};
