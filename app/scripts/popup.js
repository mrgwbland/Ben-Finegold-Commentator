'use strict';

class PopupCtrl {
  constructor(options) {
    this.options = UserPrefs.defaults;
    this.sounds = {};
  }

  generateMiscList = () => {
    const s = this.sounds[this.options.commentator] || {};
    const list = (key) => Array.isArray(s[key]) ? s[key] : [];
    const soundFiles = [
      ...list('misc'),
      ...list('check'),
      ...list('checkmate'),
      ...list('stalemate'),
      ...list('draw'),
      ...list('resign'),
      ...list('start'),
      ...list('name'),
      ...list('check'),
      ...list('fill'),
      ...list('long'),
      ...list('signoff')
    ].filter(n => !!n); // Remove undefined entries (if sounds don't exist for one category)

    const soundboard = document.querySelector('#soundboard');
    const selectList = document.createElement('select');
    selectList.id = 'miscList';

    // @TODO: Remove trailing numbers at the end of files
    const toDisplayName = filename => filename
      .replace(/misc_|long_|\.ogg/g, '')
      .replace(/_/g, ' ');

    const createOption = filename => new Option(toDisplayName(filename), filename);

    selectList.add(new Option('', ''));
    soundFiles.forEach(sound => selectList.add(createOption(sound)));

    soundboard.appendChild(selectList);
  }

  addListeners = () => {
    let keyModifier = '';
    const {commentator, volume} = this.options;
    const squares = Array.from(document.querySelectorAll('#board .square'));

    const createSquareEventListener = event => {
      // @TODO: Provide a way to listen to O-O, O-O-O sounds
      const keys = ['N', 'B', 'R', 'Q', 'K'];
      let notation = event.target.id;

      if (event.shiftKey) { notation = 'x' + notation; }
      if (keys.includes(keyModifier.toUpperCase())) { notation = keyModifier + notation; }

      AudioUtils.play(this.sounds, notation, commentator, volume);
    };

    squares.forEach(square => square.addEventListener('click', createSquareEventListener));

    document.addEventListener('keydown', event => {
      keyModifier = String.fromCharCode(event.keyCode);
    });

    document.addEventListener('keyup', () => {
      keyModifier = '';
    });

    // "Play a random commentary" link
    document.getElementById('randomMisc').addEventListener('click', () => {
      AudioUtils.play(this.sounds, 'misc', this.options.commentator, this.options.volume);
    });

    // Full sound list dropdown
    document.getElementById('miscList').addEventListener('change', event => {
      AudioUtils.play(this.sounds, event.target.value, this.options.commentator, this.options.volume, false);
    });

    document.getElementById('enabled').addEventListener('change', event => {
      UserPrefs.saveOptions({ enabled: event.target.checked });
    });
  }

  init = async () => {
    try {
      this.options = await UserPrefs.getOptions();
      document.getElementById('enabled').checked = this.options.enabled;

      const url = chrome.runtime.getURL(`ogg/${this.options.commentator}/meta.json`);
      let commentatorSounds = {};

      try {
        const response = await fetch(url);
        if (response.ok) {
          const json = await response.json();
          commentatorSounds = json.sounds || {};
        }
      } catch (error) {
        commentatorSounds = {};
      }

      this.sounds[this.options.commentator] = commentatorSounds;

      this.generateMiscList();
      this.addListeners();
    } catch (error) {
      console.error('Error initializing PopupCtrl:', error);
    }
  };
}

window.popupCtrl = new PopupCtrl();
window.popupCtrl.init();
