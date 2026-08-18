import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {Markdown} from 'tiptap-markdown';
import {BlankNode} from './extensions/BlankNode';
import styles from './index.module.scss';

/**
 * The editor's extension list.
 *
 * Kept out of the component so it can be checked without mounting anything.
 * The failure this guards against is silent at the type level: registering an
 * extension twice only shows up as a TipTap warning at runtime, and it took
 * down the course create page.
 *
 * StarterKit already bundles heading, bold, italic, underline, strike, the
 * list extensions, link, blockquote, code, code block and horizontal rule.
 * Configure those through StarterKit — importing them separately registers
 * each one a second time.
 */
export const createEditorExtensions = (options: {
  placeholder: string;
  disabled: boolean;
}) => [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
    link: {
      openOnClick: false,
      HTMLAttributes: {
        class: styles.link,
      },
    },
  }),
  Placeholder.configure({
    placeholder: options.placeholder,
    emptyEditorClass: styles.placeholder,
  }),
  Markdown.configure({
    html: false,
    tightLists: true,
    tightListClass: 'tight',
    bulletListMarker: '-',
    linkify: true,
    breaks: true,
  }),
  BlankNode.configure({
    mode: options.disabled ? 'student' : 'teacher',
  }),
];

/**
 * Every extension name the list registers, including those StarterKit pulls
 * in. Duplicates here are exactly what TipTap warns about.
 */
export const extensionNames = (
  extensions: ReturnType<typeof createEditorExtensions>
): string[] =>
  extensions.flatMap((extension) => {
    const addExtensions = (extension as {
      config?: {addExtensions?: () => {name: string}[]};
    }).config?.addExtensions;

    // Bound to the extension: a kit reads its own options to decide what to
    // include, so calling it detached throws on `this.options`.
    const nested = addExtensions ? addExtensions.call(extension) : [];
    return [extension.name, ...nested.map((child) => child.name)];
  });
