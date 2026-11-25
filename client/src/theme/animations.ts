import { createAnimation, Animation } from '@ionic/react';

//Staggered entrance animation for service items
export const staggerListAnimation = (baseEl: HTMLElement, count: number): Animation => {
  const root = createAnimation();
  const items = Array.from(baseEl.querySelectorAll('.animated-list-item'));

  items.forEach((item, index) => {
    const itemAni = createAnimation()
      .addElement(item)
      .duration(350)
      .delay(Math.min(index * 60, 600)) // staggered entry capped at 600ms
      .easing('cubic-bezier(0.2, 0.8, 0.2, 1)')
      .fromTo('opacity', '0', '1')
      .fromTo('transform', 'translateY(16px)', 'translateY(0px)');

    root.addAnimation(itemAni);
  });

  return root;
};

// Pulsing badge animation for offline "Pending Sync" items
export const pulseAnimation = (element: HTMLElement): Animation => {
  return createAnimation()
    .addElement(element)
    .duration(1400)
    .iterations(Infinity)
    .keyframes([
      { offset: 0, opacity: '1', transform: 'scale(1)' },
      { offset: 0.5, opacity: '0.6', transform: 'scale(1.08)' },
      { offset: 1, opacity: '1', transform: 'scale(1)' }
    ]);
};

// Custom Page Transition for IonRouterOutlet
export const pitstopPageTransition = (baseEl: HTMLElement, opts: any): Animation => {
  const enteringEl = opts.enteringEl as HTMLElement;
  const leavingEl = opts.leavingEl as HTMLElement;

  const rootAnimation = createAnimation().duration(320).easing('cubic-bezier(0.36,0.66,0.04,1)');

  if (opts.direction === 'forward') {
    const enteringPage = createAnimation()
      .addElement(enteringEl)
      .fromTo('transform', 'translateX(100%)', 'translateX(0%)')
      .fromTo('opacity', '0.8', '1');

    const leavingPage = createAnimation()
      .addElement(leavingEl)
      .fromTo('transform', 'translateX(0%)', 'translateX(-25%)')
      .fromTo('opacity', '1', '0.6');

    rootAnimation.addAnimation([enteringPage, leavingPage]);
  } else {
    // Back navigation
    const enteringPage = createAnimation()
      .addElement(enteringEl)
      .fromTo('transform', 'translateX(-25%)', 'translateX(0%)')
      .fromTo('opacity', '0.6', '1');

    const leavingPage = createAnimation()
      .addElement(leavingEl)
      .fromTo('transform', 'translateX(0%)', 'translateX(100%)')
      .fromTo('opacity', '1', '0.8');

    rootAnimation.addAnimation([enteringPage, leavingPage]);
  }

  return rootAnimation;
};

// Custom Spring / Zoom Modal animations for IonModal
export const modalSpringEnter = (baseEl: HTMLElement): Animation => {
  const root = createAnimation();
  const backdropAnimation = createAnimation();
  const wrapperAnimation = createAnimation();

  const rootEl = baseEl.shadowRoot || baseEl;
  const backdropEl = rootEl.querySelector('ion-backdrop');
  const wrapperEl = rootEl.querySelector('.modal-wrapper');

  if (backdropEl) {
    backdropAnimation
      .addElement(backdropEl)
      .fromTo('opacity', '0.01', 'var(--backdrop-opacity, 0.4)');
  }

  if (wrapperEl) {
    wrapperAnimation
      .addElement(wrapperEl)
      .keyframes([
        { offset: 0, opacity: '0.01', transform: 'scale(0.85) translateY(40px)' },
        { offset: 0.7, opacity: '1', transform: 'scale(1.02) translateY(-4px)' },
        { offset: 1, opacity: '1', transform: 'scale(1) translateY(0)' }
      ]);
  }

  return root
    .addElement(baseEl)
    .easing('cubic-bezier(0.175, 0.885, 0.32, 1.275)')
    .duration(380)
    .addAnimation([backdropAnimation, wrapperAnimation]);
};

export const modalSpringLeave = (baseEl: HTMLElement): Animation => {
  const root = createAnimation();
  const backdropAnimation = createAnimation();
  const wrapperAnimation = createAnimation();

  const rootEl = baseEl.shadowRoot || baseEl;
  const backdropEl = rootEl.querySelector('ion-backdrop');
  const wrapperEl = rootEl.querySelector('.modal-wrapper');

  if (backdropEl) {
    backdropAnimation.addElement(backdropEl).fromTo('opacity', 'var(--backdrop-opacity, 0.4)', '0');
  }

  if (wrapperEl) {
    wrapperAnimation
      .addElement(wrapperEl)
      .fromTo('opacity', '1', '0')
      .fromTo('transform', 'scale(1)', 'scale(0.9) translateY(20px)');
  }

  return root
    .addElement(baseEl)
    .easing('ease-out')
    .duration(250)
    .addAnimation([backdropAnimation, wrapperAnimation]);
};

// Aliases
export const staggerFadeInUp = staggerListAnimation;
export const receiptZoomEnter = modalSpringEnter;
export const receiptZoomLeave = modalSpringLeave;