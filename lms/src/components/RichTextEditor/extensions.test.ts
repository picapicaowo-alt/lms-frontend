import {describe, expect, it} from 'vitest';
import {createEditorExtensions, extensionNames} from './extensions';

/**
 * The course create page mounts this editor and was reported as crashing on
 * "an editor/plugin conflict". The cause was importing extensions that
 * StarterKit already bundles, which TipTap reports as:
 *
 *   Duplicate extension names found: ['link', 'heading', 'bold', ...]
 *
 * Checked here rather than by rendering: the names are the invariant, and
 * mounting the editor in a test races TipTap's teardown for no extra signal.
 */
describe('editor extensions', () => {
  const names = extensionNames(
    createEditorExtensions({placeholder: 'test', disabled: false})
  );

  it('registers no extension twice', () => {
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    expect(duplicates).toEqual([]);
  });

  it('still provides the formatting the toolbar exposes', () => {
    // The toolbar offers these, so dropping one while removing duplicates
    // would quietly disable a button.
    ['bold', 'italic', 'underline', 'strike', 'heading', 'bulletList', 'orderedList', 'link']
      .forEach((required) => expect(names).toContain(required));
  });
});
