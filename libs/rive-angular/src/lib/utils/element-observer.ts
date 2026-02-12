/**
 * Fake IntersectionObserver for environments where it's not available (e.g., SSR)
 */
class FakeIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];

  observe(): void {
    // Intentionally empty for SSR compatibility
  }
  unobserve(): void {
    // Intentionally empty for SSR compatibility
  }
  disconnect(): void {
    // Intentionally empty for SSR compatibility
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

const MyIntersectionObserver =
  (typeof globalThis !== 'undefined' && globalThis.IntersectionObserver) ||
  FakeIntersectionObserver;

/**
 * Singleton IntersectionObserver wrapper for observing multiple elements
 * with individual callbacks. This avoids creating multiple IntersectionObserver
 * instances which is more efficient.
 */
export class ElementObserver {
  private observer: IntersectionObserver;
  private elementsMap: Map<Element, (entry: IntersectionObserverEntry) => void> = new Map();

  constructor() {
    this.observer = new MyIntersectionObserver(
      this.onObserved,
    ) as IntersectionObserver;
  }

  private onObserved = (entries: IntersectionObserverEntry[]): void => {
    entries.forEach((entry) => {
      const elementCallback = this.elementsMap.get(entry.target as Element);
      if (elementCallback) {
        elementCallback(entry);
      }
    });
  };

  public registerCallback(element: Element, callback: (entry: IntersectionObserverEntry) => void): void {
    this.observer.observe(element);
    this.elementsMap.set(element, callback);
  }

  public removeCallback(element: Element): void {
    this.observer.unobserve(element);
    this.elementsMap.delete(element);
  }
}

// Singleton instance
let observerInstance: ElementObserver | null = null;

/**
 * Get the singleton ElementObserver instance
 */
export function getElementObserver(): ElementObserver {
  if (!observerInstance) {
    observerInstance = new ElementObserver();
  }
  return observerInstance;
}
