'use client';

import { Extension, mergeAttributes, Node } from '@tiptap/core';
import { TextStyle } from '@tiptap/extension-text-style';
import { ReactNodeViewRenderer } from '@tiptap/react';

import { BlogBlockView } from './blog-block-view';

/** Block attrs are encoded as escaped HTML attributes for HTML round-trips. */
function block(name: string, defaults: Record<string, unknown>) {
  return Node.create({
    name,
    group: 'block',
    atom: true,
    draggable: true,
    addAttributes() {
      return Object.fromEntries(
        Object.entries(defaults).map(([key, value]) => [
          key,
          {
            default: value,
            parseHTML: (el: HTMLElement) => {
              try {
                const raw = el.getAttribute(`data-${key.toLowerCase()}`);
                return raw === null ? value : JSON.parse(raw);
              } catch {
                return value;
              }
            },
            renderHTML: (attrs: Record<string, unknown>) => ({
              [`data-${key.toLowerCase()}`]: JSON.stringify(
                attrs[key] ?? value,
              ),
            }),
          },
        ]),
      );
    },
    parseHTML() {
      return [{ tag: `div[data-blog-block="${name}"]` }];
    },
    renderHTML({ HTMLAttributes }) {
      return [
        'div',
        mergeAttributes(HTMLAttributes, { 'data-blog-block': name }),
      ];
    },
    addNodeView() {
      return ReactNodeViewRenderer(BlogBlockView);
    },
  });
}
export const customBlocks = [
  block('media', {
    kind: 'image',
    src: '',
    alt: '',
    title: '',
    caption: '',
    href: '',
    poster: '',
    width: 100,
    align: 'center',
    controls: true,
    autoplay: false,
    muted: false,
    loop: false,
  }),
  block('gallery', { title: '', items: [] }),
  block('faq', { title: '', items: [] }),
  block('toc', { title: '' }),
  block('barberSlider', { title: '', ids: [], autoplay: false }),
];
export const Direction = Extension.create({
  name: 'blogTextDirection',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          dir: {
            default: null,
            parseHTML: el => el.getAttribute('dir'),
            renderHTML: attrs => (attrs.dir ? { dir: attrs.dir } : {}),
          },
        },
      },
    ];
  },
});
export const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [
      {
        types: [TextStyle.name],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: el => el.style.fontSize,
            renderHTML: attrs =>
              attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
          },
        },
      },
    ];
  },
});
