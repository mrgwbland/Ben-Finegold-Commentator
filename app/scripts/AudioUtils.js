'use strict';

const throwIfMissing = () => { throw new Error('Missing parameter'); };

class AudioUtils {
  static create(file = throwIfMissing, commentator = UserPrefs.defaults.commentator, volume = UserPrefs.defaults.volume) {
    const path = browser.runtime.getURL(`ogg/${commentator}/${file}`);
    const audio = new Audio(path);
    audio.volume = volume;

    return audio;
  }

  static getRandom(sounds = throwIfMissing, key = throwIfMissing, commentator = UserPrefs.defaults.commentator) {
    const files = sounds[commentator][key];

    return files && files[Math.floor(Math.random()*files.length)];
  }

  static getGeneric(sounds = throwIfMissing, key = throwIfMissing, commentator = UserPrefs.defaults.commentator) {
    // Generic capture fallback (after exact key lookup in AudioQueue.push):
    // Qxf7 -> xf7 -> Qx -> x
    // N8xd7 / Nbxd7 -> xd7 -> Nxd7 -> Nx -> x
    if (key.includes('x')) {
      const xIndex = key.indexOf('x');
      const targetMatch = key.match(/x([a-h][1-8])/i);
      const targetSquare = targetMatch && targetMatch[1] ? targetMatch[1].toLowerCase() : null;
      const pieceMatch = key.match(/^([KQRBN])/);
      const piece = pieceMatch && pieceMatch[1] ? pieceMatch[1] : null;
      const disambiguatedPieceCaptureMatch = key.match(/^([KQRBN])[a-h1-8]x([a-h][1-8])$/);

      const fallbacks = [];
      if (disambiguatedPieceCaptureMatch) {
        fallbacks.push(`${disambiguatedPieceCaptureMatch[1]}x${disambiguatedPieceCaptureMatch[2].toLowerCase()}`);
      }
      if (targetSquare) { fallbacks.push(`x${targetSquare}`); }
      if (piece && xIndex > 0) { fallbacks.push(`${piece}x`); }
      fallbacks.push('x');

      console.log('[Dmitlichess][AudioUtils.getGeneric][capture]', {
        key,
        commentator,
        fallbacks
      });

      for (const fallbackKey of fallbacks) {
        const file = this.getRandom(sounds, fallbackKey, commentator);
        console.log('[Dmitlichess][AudioUtils.getGeneric][captureTry]', {
          key,
          fallbackKey,
          hit: !!file,
          file: file || null
        });
        if (file) { return file; }
      }

      console.log('[Dmitlichess][AudioUtils.getGeneric][captureMiss]', {
        key,
        commentator
      });
    }

    // Disambiguated piece move fallback (non-capture):
    // N8d7 / Nbd7 -> Nd7
    const disambiguatedPieceMoveMatch = key.match(/^([KQRBN])[a-h1-8]([a-h][1-8])$/);
    if (disambiguatedPieceMoveMatch) {
      const fallbackKey = `${disambiguatedPieceMoveMatch[1]}${disambiguatedPieceMoveMatch[2]}`;
      const file = this.getRandom(sounds, fallbackKey, commentator);

      console.log('[Dmitlichess][AudioUtils.getGeneric][pieceMoveTry]', {
        key,
        fallbackKey,
        hit: !!file,
        file: file || null
      });

      if (file) { return file; }
    }

    // @TODO: Also handle other fallback notation:
    //   - Nd2 if Nbd2 sound doesn't exist
    //   - Bx if Bxf4 doesn't exist
    //   - h1 if Kh1 doesn't exist

    // Translate some game end states
    // @TODO: Individual sounds for white/black resigned?
    /*
    if (key.includes('white resigned')) { return this.getRandom(sounds, 'resign', commentator); }
    if (key.includes('black resigned')) { return this.getRandom(sounds, 'resign', commentator); }
    */
    if (key.includes('resigned')) {
      const file = this.getRandom(sounds, 'resign', commentator);
      console.log('[Dmitlichess][AudioUtils.getGeneric][state]', {
        key,
        mappedTo: 'resign',
        hit: !!file,
        file: file || null
      });
      return file;
    }
    if (key.includes('time out')) {
      const file = this.getRandom(sounds, 'flag', commentator);
      console.log('[Dmitlichess][AudioUtils.getGeneric][state]', {
        key,
        mappedTo: 'flag',
        hit: !!file,
        file: file || null
      });
      return file;
    }

    console.log('[Dmitlichess][AudioUtils.getGeneric][noGenericMatch]', {
      key,
      commentator
    });
  }

  static play(sounds, key, commentator = UserPrefs.defaults.commentator, volume = UserPrefs.defaults.volume, isRandom = true) {
    const file = isRandom ? this.getRandom(sounds, key, commentator) : key;

    // No sound for the notation :(
    if (!file) { return; }

    const audio = this.create(file, commentator, volume / 100);
    audio.play();
  }
}
