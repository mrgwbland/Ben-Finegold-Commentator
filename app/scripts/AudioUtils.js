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
    // Piece capture fallback (uppercase):
    //   Bbxd4 -> Bxd4 -> xd4 -> Bx -> x
    // Pawn capture fallback (lowercase):
    //   bxd4 -> xd4 -> bx -> px -> x
    if (key.includes('x')) {
      const xIndex = key.indexOf('x');
      const targetMatch = key.match(/x([a-h][1-8])/i);
      const targetSquare = targetMatch && targetMatch[1] ? targetMatch[1].toLowerCase() : null;
      const pieceMatch = key.match(/^([KQRBN])/);
      const piece = pieceMatch && pieceMatch[1] ? pieceMatch[1] : null;
      const disambiguatedPieceCaptureMatch = key.match(/^([KQRBN])[a-h1-8]x([a-h][1-8])$/);
      const pawnCaptureMatch = key.match(/^([a-h])x([a-h][1-8])$/);

      const fallbacks = [];
      if (pawnCaptureMatch) {
        if (targetSquare) { fallbacks.push(`x${targetSquare}`); }
        fallbacks.push(`${pawnCaptureMatch[1]}x`);
        fallbacks.push('px');
      } else {
        if (disambiguatedPieceCaptureMatch) {
          fallbacks.push(`${disambiguatedPieceCaptureMatch[1]}x${disambiguatedPieceCaptureMatch[2].toLowerCase()}`);
        }
        if (targetSquare) { fallbacks.push(`x${targetSquare}`); }
        if (piece && xIndex > 0) { fallbacks.push(`${piece}x`); }
      }

      fallbacks.push('x');

      console.log('[finegoldlichess][AudioUtils.getGeneric][capture]', {
        key,
        commentator,
        fallbacks
      });

      for (const fallbackKey of fallbacks) {
        const file = this.getRandom(sounds, fallbackKey, commentator);
        console.log('[finegoldlichess][AudioUtils.getGeneric][captureTry]', {
          key,
          fallbackKey,
          hit: !!file,
          file: file || null
        });
        if (file) { return file; }
      }

      console.log('[finegoldlichess][AudioUtils.getGeneric][captureMiss]', {
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

      console.log('[finegoldlichess][AudioUtils.getGeneric][pieceMoveTry]', {
        key,
        fallbackKey,
        hit: !!file,
        file: file || null
      });

      if (file) { return file; }
    }

    // Final piece fallback:
    // Ref8 -> Rf8 -> R
    // Qxf7 -> ... -> Q
    const pieceNameMatch = key.match(/^([KQRBN])/);
    if (pieceNameMatch) {
      const fallbackKey = pieceNameMatch[1];
      const file = this.getRandom(sounds, fallbackKey, commentator);

      console.log('[finegoldlichess][AudioUtils.getGeneric][pieceNameTry]', {
        key,
        fallbackKey,
        hit: !!file,
        file: file || null
      });

      if (file) { return file; }
    }

    // Final pawn fallback:
    // h3 -> h
    const pawnFileMatch = key.match(/^([a-h])/);
    if (pawnFileMatch) {
      const fallbackKey = pawnFileMatch[1];
      const file = this.getRandom(sounds, fallbackKey, commentator);

      console.log('[finegoldlichess][AudioUtils.getGeneric][pawnFileTry]', {
        key,
        fallbackKey,
        hit: !!file,
        file: file || null
      });

      if (file) { return file; }
    }

    // Translate some game end states
    // @TODO: Individual sounds for white/black resigned?
    /*
    if (key.includes('white resigned')) { return this.getRandom(sounds, 'resign', commentator); }
    if (key.includes('black resigned')) { return this.getRandom(sounds, 'resign', commentator); }
    */
    if (key.includes('resigned')) {
      const file = this.getRandom(sounds, 'resign', commentator);
      console.log('[finegoldlichess][AudioUtils.getGeneric][state]', {
        key,
        mappedTo: 'resign',
        hit: !!file,
        file: file || null
      });
      return file;
    }
    if (key.includes('time out')) {
      const file = this.getRandom(sounds, 'flag', commentator);
      console.log('[finegoldlichess][AudioUtils.getGeneric][state]', {
        key,
        mappedTo: 'flag',
        hit: !!file,
        file: file || null
      });
      return file;
    }

    console.log('[finegoldlichess][AudioUtils.getGeneric][noGenericMatch]', {
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
