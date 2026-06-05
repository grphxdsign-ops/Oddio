describe('OddioAI source-reference tutor', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: {
        microphone: 'YES',
      },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('starts on a reference-only guitar source', async () => {
    await expect(element(by.id('oddio-root'))).toBeVisible();
    await expect(element(by.id('brand-title'))).toHaveText('OddioAI');
    await expect(element(by.id('source-reference-panel'))).toBeVisible();
    await expect(element(by.id('source-reference-title'))).toHaveText('Reference on Songsterr');
    await expect(element(by.id('license-status'))).toHaveText('reference-only');
  });

  it('runs a MIDI practice pass and shows coach feedback', async () => {
    await element(by.id('input-midi')).tap();
    await element(by.id('run-practice-pass')).tap();

    await waitFor(element(by.id('coach-advice')))
      .toBeVisible()
      .withTimeout(2000);
    await expect(element(by.id('coach-advice'))).toBeVisible();
    await expect(element(by.id('native-audio-status'))).toBeVisible();
  });

  it('switches to piano and creates external source-search cards', async () => {
    await element(by.id('instrument-piano')).tap();
    await element(by.id('song-search-input')).replaceText('very specific oddio search');

    await waitFor(element(by.id('selected-arrangement-title')))
      .toHaveText('very specific oddio search')
      .withTimeout(2000);
    await expect(element(by.id('license-status'))).toHaveText('reference-only');
    await expect(element(by.id('source-reference-panel'))).toBeVisible();
  });

  it('runs a mock push-to-talk voice turn', async () => {
    await waitFor(element(by.id('voice-coach-panel')))
      .toBeVisible()
      .whileElement(by.id('oddio-scroll'))
      .scroll(450, 'down');

    await expect(element(by.id('voice-disclosure'))).toBeVisible();
    await element(by.id('voice-talk-button')).tap();
    await expect(element(by.id('voice-status-label'))).toHaveText('Mock voice lane / Listening');
    await element(by.id('voice-talk-button')).tap();

    await waitFor(element(by.id('voice-transcript')))
      .toBeVisible()
      .withTimeout(2500);
    await expect(element(by.id('voice-assistant-text'))).toBeVisible();
    await expect(element(by.id('voice-replay-button'))).toBeVisible();
  });

  it('disables voice recording while a practice mic pass is recording', async () => {
    await element(by.id('run-practice-pass')).tap();

    await waitFor(element(by.id('voice-coach-panel')))
      .toBeVisible()
      .whileElement(by.id('oddio-scroll'))
      .scroll(450, 'down');
    await waitFor(element(by.id('voice-talk-button')))
      .toBeDisabled()
      .withTimeout(2500);
  });

  it('shows a mock voice backend error state', async () => {
    await element(by.id('song-search-input')).replaceText('voice mock fail');

    await waitFor(element(by.id('voice-coach-panel')))
      .toBeVisible()
      .whileElement(by.id('oddio-scroll'))
      .scroll(450, 'down');
    await element(by.id('voice-talk-button')).tap();
    await element(by.id('voice-talk-button')).tap();

    await waitFor(element(by.id('voice-error')))
      .toBeVisible()
      .withTimeout(2500);
  });
});
