'use strict';

class MoveEmitter {
  constructor(movesElement, dispatchTarget) {
    this.movesElement = movesElement;
    this.dispatchTarget = dispatchTarget;
    this.observers = [];
    this.lastEmittedNotation = null;
  }

  handleMutations = (mutations) => {
    const isCapture = notation => notation.includes('x');
    const isCastle = notation => notation.includes('0-0');
    const isCheck = notation => notation.includes('+');
    const trimSymbols = notation => notation.replace(/#|\+|@/g, '');

    mutations.forEach(mutation => {
      if (!MutationUtils.hasAddedNodes(mutation)) { return; }

      let added = mutation.addedNodes[0];
      if (added.nodeName === 'TURN') {
        added = added.querySelector('MOVE.active') || added.querySelector('MOVE:last-child') || added;
      } else if (added.nodeName !== 'MOVE' && typeof added.querySelector === 'function') {
        added = added.querySelector('MOVE.active') || added.querySelector('MOVE:last-child') || added;
      }

      const notation = (added.textContent || '').trim();
      if (!notation) { return; }

      const notationType = isCapture(notation) ? 'capture' : 'move';
      const eventDetail = {
        detail: { notation: trimSymbols(notation) }
      };

      if (eventDetail.detail.notation === this.lastEmittedNotation) {
        console.log('[Dmitlichess][MoveEmitter][dedupe]', {
          rawNotation: notation,
          normalizedNotation: eventDetail.detail.notation,
          notationType
        });
        return;
      }

      this.lastEmittedNotation = eventDetail.detail.notation;

      console.log('[Dmitlichess][MoveEmitter]', {
        rawNotation: notation,
        normalizedNotation: eventDetail.detail.notation,
        notationType
      });

      this.dispatchTarget.dispatchEvent(new CustomEvent(notationType, eventDetail));

      if (isCheck(notation)) {
        this.dispatchTarget.dispatchEvent(new CustomEvent('check'));
      }
    });
  };

  createObserver = () => {
    const el = this.movesElement;
    const observer = new MutationObserver(mutations => this.handleMutations(mutations));
    const config = { childList: true, subtree: true };

    if (el) { observer.observe(el, config); }

    return observer;
  };

  disconnect = () => {
    this.observers.map(o => o.disconnect());
  };

  init = () => {
    this.observers = [];
    this.observers.push(this.createObserver());
  };
}
