import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { RiveCanvasComponent, RiveEvent } from '@grandgular/rive-angular';

@Component({
  selector: 'app-feedback-stars',
  standalone: true,
  imports: [RiveCanvasComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rive-canvas
      class="animation"
      [class.visible]="riveLoaded()"
      [src]="'animations/stars.riv'"
      [stateMachines]="'Default'"
      [autoplay]="true"
      (loaded)="onRiveLoaded()"
      (stateChange)="onStateChange($event)"
    />
  `,
  styles: `
    :host {
      display: block;
      width: 300px;
      height: 100px;
    }

    .animation {
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .animation.visible {
      opacity: 1;
    }
  `,
})
export class FeedbackStarsComponent {
  protected readonly riveLoaded = signal(false);

  protected onRiveLoaded(): void {
    this.riveLoaded.set(true);
  }

  protected onStateChange(event: RiveEvent): void {
    // stateChange event comes in format:
    // { type: 'statechange', data: ['star 3'] }
    const riveEvent = event as unknown as {
      type: string;
      data: string[];
    };

    if (riveEvent.type === 'statechange' && Array.isArray(riveEvent.data)) {
      // Parse star number from string like 'star 3'
      const starNumber = riveEvent.data?.[0]
        ? +riveEvent.data[0].toString().replace('star ', '')
        : 0;

      console.log(starNumber);
    }
  }
}
