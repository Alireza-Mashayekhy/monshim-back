'use client';

import './editor.css';

import { type Editor, Extension, type Range } from '@tiptap/core';
import CharacterCount from '@tiptap/extension-character-count';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from '@tiptap/extension-table';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Plugin } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import {
  EditorContent,
  type JSONContent,
  useEditor,
  useEditorState,
} from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Suggestion, { exitSuggestion } from '@tiptap/suggestion';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { safeUrl } from '@/lib/blog/types';

import { customBlocks, Direction, FontSize } from './blog-extensions';

type Command = {
  label: string;
  search: string;
  run: (editor: Editor, range: Range) => void;
};
function insertBlock(editor: Editor, range: Range, type: string, attrs = {}) {
  editor
    .chain()
    .focus()
    .deleteRange(range)
    .insertContent([{ type, attrs }, { type: 'paragraph' }])
    .run();
}
const commands: Command[] = [
  ...([1, 2, 3, 4] as const).map(level => ({
    label: `تیتر ${level}`,
    search: `heading h${level} تیتر عنوان`,
    run: (editor: Editor, range: Range) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level }).run();
    },
  })),
  {
    label: 'لیست نقطه‌ای',
    search: 'bullet list فهرست لیست',
    run: (e, r) => {
      e.chain().focus().deleteRange(r).toggleBulletList().run();
    },
  },
  {
    label: 'لیست شماره‌دار',
    search: 'ordered list لیست شماره',
    run: (e, r) => {
      e.chain().focus().deleteRange(r).toggleOrderedList().run();
    },
  },
  {
    label: 'چک‌لیست',
    search: 'task checklist چک لیست',
    run: (e, r) => {
      e.chain().focus().deleteRange(r).toggleTaskList().run();
    },
  },
  {
    label: 'نقل‌قول',
    search: 'quote blockquote نقل قول',
    run: (e, r) => {
      e.chain().focus().deleteRange(r).toggleBlockquote().run();
    },
  },
  {
    label: 'کد',
    search: 'code کد',
    run: (e, r) => {
      e.chain().focus().deleteRange(r).toggleCodeBlock().run();
    },
  },
  {
    label: 'جداکننده',
    search: 'divider separator خط جداکننده',
    run: (e, r) => {
      e.chain().focus().deleteRange(r).setHorizontalRule().run();
    },
  },
  {
    label: 'جدول',
    search: 'table جدول',
    run: (e, r) => {
      e.chain()
        .focus()
        .deleteRange(r)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    },
  },
  {
    label: 'تصویر',
    search: 'image عکس تصویر',
    run: (e, r) => insertBlock(e, r, 'media', { kind: 'image' }),
  },
  {
    label: 'ویدیو',
    search: 'video ویدیو فیلم',
    run: (e, r) => insertBlock(e, r, 'media', { kind: 'video' }),
  },
  {
    label: 'گالری',
    search: 'gallery گالری',
    run: (e, r) => insertBlock(e, r, 'gallery'),
  },
  {
    label: 'اسلایدر آرایشگرها',
    search: 'barber slider اسلایدر آرایشگر',
    run: (e, r) => insertBlock(e, r, 'barberSlider'),
  },
  {
    label: 'سوالات متداول',
    search: 'faq questions سوال متداول',
    run: (e, r) => insertBlock(e, r, 'faq'),
  },
  {
    label: 'فهرست مطالب',
    search: 'toc contents فهرست مطالب',
    run: (e, r) => insertBlock(e, r, 'toc'),
  },
];
const Slash = Extension.create({
  name: 'slashCommands',
  addProseMirrorPlugins() {
    return [
      Suggestion<Command>({
        editor: this.editor,
        char: '/',
        allowSpaces: false,
        allowedPrefixes: [' '],
        allow: ({ state, range }) => {
          const $pos = state.doc.resolve(range.from);
          return (
            $pos.parent.type.name === 'paragraph' &&
            !$pos.parent.textBetween(0, $pos.parentOffset, '\n').includes('://')
          );
        },
        items: ({ query }) =>
          commands
            .filter(x =>
              `${x.label} ${x.search}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .slice(0, 12),
        command: ({ editor, range, props }) => props.run(editor, range),
        render: () => {
          let root: HTMLDivElement | null = null,
            selected = 0,
            items: Command[] = [],
            current: {
              command: (item: Command) => void;
              clientRect?: (() => DOMRect | null) | null;
            };
          const draw = () => {
            if (!root) return;
            root.replaceChildren();
            items.forEach((item, i) => {
              const b = document.createElement('button');
              b.type = 'button';
              b.textContent = item.label;
              b.className =
                i === selected ? 'slash-item selected' : 'slash-item';
              b.onmousedown = event => {
                event.preventDefault();
                current.command(item);
              };
              root!.appendChild(b);
            });
            const rect = current.clientRect?.();
            if (rect) {
              root.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 230))}px`;
              root.style.top = `${Math.min(rect.bottom + 4, window.innerHeight - 240)}px`;
            }
          };
          return {
            onStart: props => {
              current = props;
              items = props.items;
              selected = 0;
              root = document.createElement('div');
              root.className = 'slash-menu';
              root.dir = 'rtl';
              document.body.appendChild(root);
              draw();
            },
            onUpdate: props => {
              current = props;
              items = props.items;
              selected = 0;
              draw();
            },
            onKeyDown: ({ event, view }) => {
              if (event.key === 'Escape') {
                exitSuggestion(view);
                root?.remove();
                return true;
              }
              if (!items.length) return false;
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                selected =
                  (selected +
                    (event.key === 'ArrowDown' ? 1 : -1) +
                    items.length) %
                  items.length;
                draw();
                return true;
              }
              if (event.key === 'Enter' || event.key === 'Tab') {
                current.command(items[selected]);
                return true;
              }
              return false;
            },
            onExit: () => {
              root?.remove();
              root = null;
            },
          };
        },
      }),
    ];
  },
});

const EmptyParagraphPlus = Extension.create({
  name: 'emptyParagraphPlus',
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        props: {
          decorations(state) {
            const { selection } = state;
            if (
              !editor.isEditable ||
              !selection.empty ||
              selection.$from.parent.type.name !== 'paragraph' ||
              selection.$from.parent.content.size !== 0
            )
              return DecorationSet.empty;
            return DecorationSet.create(state.doc, [
              Decoration.widget(
                selection.from,
                () => {
                  const button = document.createElement('button');
                  button.type = 'button';
                  button.textContent = '+';
                  button.contentEditable = 'false';
                  button.className = 'editor-plus';
                  button.setAttribute('aria-label', 'درج بلوک');
                  button.title = 'درج بلوک';
                  button.addEventListener('mousedown', event =>
                    event.preventDefault(),
                  );
                  button.addEventListener('click', () =>
                    editor.chain().focus().insertContent('/').run(),
                  );
                  return button;
                },
                { side: -1 },
              ),
            ]);
          },
        },
      }),
    ];
  },
});

function Tool({
  label,
  active,
  onClick,
  children,
  disabled,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      className={`editor-tool ${active ? 'active' : ''}`}
    >
      {children}
    </button>
  );
}

export default function BlogEditor({
  value,
  onChange,
  readOnly = false,
}: {
  value: JSONContent;
  onChange: (v: JSONContent) => void;
  readOnly?: boolean;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const [htmlOpen, setHtmlOpen] = useState(false),
    [html, setHtml] = useState('');
  const [linkOpen, setLinkOpen] = useState(false),
    [link, setLink] = useState(''),
    [linkText, setLinkText] = useState(''),
    [newTab, setNewTab] = useState(false),
    [linkError, setLinkError] = useState('');
  const [selection, setSelection] = useState<Range>({ from: 0, to: 0 });
  const lastSent = useRef(value);
  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        link: { openOnClick: false, autolink: false },
      }),
      TextStyle,
      Color,
      FontSize,
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      Direction,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CharacterCount,
      ...customBlocks,
      Slash,
      EmptyParagraphPlus,
    ],
    content: value,
    onUpdate: ({ editor: e }) => {
      const next = e.getJSON();
      lastSent.current = next;
      onChange(next);
    },
    editorProps: {
      attributes: {
        class: 'blog-prose editor-body',
        dir: 'auto',
        'aria-label': 'محتوای مقاله',
      },
    },
  });
  useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            from: e.state.selection.from,
            to: e.state.selection.to,
            doc: e.state.doc,
          }
        : null,
  });
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !htmlOpen && !linkOpen) setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen, htmlOpen, linkOpen]);
  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);
  useEffect(() => {
    if (editor && value !== lastSent.current) {
      lastSent.current = value;
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);
  if (!editor)
    return (
      <div
        className="min-h-[440px] rounded-lg border bg-white"
        aria-busy="true"
      />
    );
  const linkDialog = () => {
    if (editor.state.selection.empty && editor.isActive('link'))
      editor.chain().focus().extendMarkRange('link').run();
    const { from, to } = editor.state.selection;
    setSelection({ from, to });
    const attrs = editor.getAttributes('link');
    setLink(attrs.href || '');
    setLinkText(editor.state.doc.textBetween(from, to, ' ') || '');
    setNewTab(attrs.target === '_blank');
    setLinkError('');
    setLinkOpen(true);
  };
  const applyLink = () => {
    const url = safeUrl(link);
    if (!url) {
      setLinkError('آدرس باید مسیر داخلی، HTTPS، ایمیل یا تلفن معتبر باشد');
      return;
    }
    if (!linkText.trim()) {
      setLinkError('متن پیوند را وارد کنید');
      return;
    }
    const chain = editor.chain().focus().setTextSelection(selection);
    const selectedText = editor.state.doc.textBetween(
      selection.from,
      selection.to,
      ' ',
    );
    if (selection.from === selection.to || selectedText !== linkText)
      chain
        .insertContent({
          type: 'text',
          text: linkText,
          marks: [
            {
              type: 'link',
              attrs: {
                href: url,
                target: newTab ? '_blank' : null,
                rel: newTab ? 'noopener noreferrer' : null,
              },
            },
          ],
        })
        .run();
    else
      chain
        .extendMarkRange('link')
        .setLink({
          href: url,
          target: newTab ? '_blank' : null,
          rel: newTab ? 'noopener noreferrer' : null,
        })
        .run();
    setLinkOpen(false);
  };
  const blockAction = (action: 'up' | 'down' | 'copy' | 'delete') => {
    const state = editor.state;
    const $from = state.selection.$from;
    const index = $from.index(0);
    const doc = state.doc;
    if (index >= doc.childCount) return;
    const node = doc.child(index);
    let pos = 0;
    for (let i = 0; i < index; i++) pos += doc.child(i).nodeSize;
    let tr = state.tr;
    if (action === 'copy')
      tr = tr.insert(pos + node.nodeSize, node.copy(node.content));
    if (action === 'delete') {
      if (doc.childCount === 1)
        tr = tr.replaceWith(
          pos,
          pos + node.nodeSize,
          state.schema.nodes.paragraph.create(),
        );
      else tr = tr.delete(pos, pos + node.nodeSize);
    }
    if (action === 'up' && index > 0) {
      const before = doc.child(index - 1);
      tr = tr.replaceWith(pos - before.nodeSize, pos + node.nodeSize, [
        node,
        before,
      ]);
    }
    if (action === 'down' && index + 1 < doc.childCount) {
      const after = doc.child(index + 1);
      tr = tr.replaceWith(pos, pos + node.nodeSize + after.nodeSize, [
        after,
        node,
      ]);
    }
    if (tr.docChanged) {
      editor.view.dispatch(tr);
      editor.commands.focus();
    }
  };
  const basic = (
    <>
      <Tool
        label="بولد"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <b>B</b>
      </Tool>
      <Tool
        label="ایتالیک"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <i>I</i>
      </Tool>
      <Tool
        label="زیرخط"
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <u>U</u>
      </Tool>
      <Tool
        label="خط‌خورده"
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <s>S</s>
      </Tool>
      <Tool
        label="کد درون‌خطی"
        active={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        &lt;/&gt;
      </Tool>
      <Tool label="پیوند" active={editor.isActive('link')} onClick={linkDialog}>
        🔗
      </Tool>
    </>
  );
  return (
    <fieldset
      disabled={readOnly}
      className={`blog-editor rounded-xl border bg-white ${fullscreen ? 'blog-editor-fullscreen' : ''}`}
    >
      <div
        className="editor-toolbar"
        role="toolbar"
        aria-label="ابزارهای ویرایش مقاله"
      >
        <Tool
          label="واگرد"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          ↶
        </Tool>
        <Tool
          label="بازگردانی"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          ↷
        </Tool>
        <select
          aria-label="نوع متن"
          className="editor-select"
          value={
            editor.isActive('heading')
              ? String(editor.getAttributes('heading').level)
              : 'p'
          }
          onChange={e => {
            const v = e.target.value;
            if (v === 'p') editor.chain().focus().setParagraph().run();
            else
              editor
                .chain()
                .focus()
                .toggleHeading({ level: Number(v) as 1 | 2 | 3 | 4 | 5 | 6 })
                .run();
          }}
        >
          <option value="p">پاراگراف</option>
          {[1, 2, 3, 4, 5, 6].map(x => (
            <option key={x} value={x}>
              تیتر H{x}
            </option>
          ))}
        </select>
        {basic}
        <Tool
          label="زیرنویس"
          active={editor.isActive('subscript')}
          onClick={() => editor.chain().focus().toggleSubscript().run()}
        >
          X₂
        </Tool>
        <Tool
          label="بالانویس"
          active={editor.isActive('superscript')}
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
        >
          X²
        </Tool>
        <Tool
          label="حذف قالب‌بندی"
          onClick={() =>
            editor.chain().focus().unsetAllMarks().clearNodes().run()
          }
        >
          پاک
        </Tool>
        <select
          aria-label="اندازه متن"
          className="editor-select"
          value={editor.getAttributes('textStyle').fontSize || ''}
          onChange={e => {
            if (e.target.value)
              editor
                .chain()
                .focus()
                .setMark('textStyle', { fontSize: e.target.value })
                .run();
            else
              editor
                .chain()
                .focus()
                .setMark('textStyle', { fontSize: null })
                .removeEmptyTextStyle()
                .run();
          }}
        >
          <option value="">اندازه</option>
          {[12, 14, 16, 18, 22, 28, 34].map(n => (
            <option key={n} value={`${n}px`}>
              {n}
            </option>
          ))}
        </select>
        <select
          aria-label="رنگ متن"
          className="editor-select"
          value={editor.getAttributes('textStyle').color || ''}
          onChange={e =>
            e.target.value
              ? editor.chain().focus().setColor(e.target.value).run()
              : editor.chain().focus().unsetColor().run()
          }
        >
          <option value="">رنگ</option>
          {[
            '#0b7285',
            '#1f2937',
            '#dc2626',
            '#d97706',
            '#15803d',
            '#2563eb',
            '#9333ea',
          ].map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          aria-label="هایلایت"
          className="editor-select"
          value={editor.getAttributes('highlight').color || ''}
          onChange={e =>
            e.target.value
              ? editor
                  .chain()
                  .focus()
                  .setHighlight({ color: e.target.value })
                  .run()
              : editor.chain().focus().unsetHighlight().run()
          }
        >
          <option value="">هایلایت</option>
          {['#fef08a', '#bbf7d0', '#bae6fd'].map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {(['right', 'center', 'left', 'justify'] as const).map((align, i) => (
          <Tool
            key={align}
            label={['چینش راست', 'چینش وسط', 'چینش چپ', 'تراز دو طرف'][i]}
            active={editor.isActive({ textAlign: align })}
            onClick={() => editor.chain().focus().setTextAlign(align).run()}
          >
            {['≡→', '≡', '←≡', '☰'][i]}
          </Tool>
        ))}
        <Tool
          label="جهت راست به چپ"
          onClick={() =>
            editor
              .chain()
              .focus()
              .updateAttributes(
                editor.isActive('heading') ? 'heading' : 'paragraph',
                { dir: 'rtl' },
              )
              .run()
          }
        >
          RTL
        </Tool>
        <Tool
          label="جهت چپ به راست"
          onClick={() =>
            editor
              .chain()
              .focus()
              .updateAttributes(
                editor.isActive('heading') ? 'heading' : 'paragraph',
                { dir: 'ltr' },
              )
              .run()
          }
        >
          LTR
        </Tool>
        <Tool
          label="لیست نقطه‌ای"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • لیست
        </Tool>
        <Tool
          label="لیست شماره‌دار"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          ۱. لیست
        </Tool>
        <Tool
          label="چک‌لیست"
          active={editor.isActive('taskList')}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          ☑
        </Tool>
        <Tool
          label="افزایش تورفتگی"
          onClick={() =>
            editor
              .chain()
              .focus()
              .sinkListItem(
                editor.isActive('taskItem') ? 'taskItem' : 'listItem',
              )
              .run()
          }
        >
          →|
        </Tool>
        <Tool
          label="کاهش تورفتگی"
          onClick={() =>
            editor
              .chain()
              .focus()
              .liftListItem(
                editor.isActive('taskItem') ? 'taskItem' : 'listItem',
              )
              .run()
          }
        >
          |←
        </Tool>
        <Tool
          label="نقل‌قول"
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          ❝
        </Tool>
        <Tool
          label="بلوک کد"
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          کد
        </Tool>
        <Tool
          label="خط جداکننده"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          ―
        </Tool>
        <Tool
          label="انتقال بلوک فعلی به بالا"
          onClick={() => blockAction('up')}
        >
          ↑ بلوک
        </Tool>
        <Tool
          label="انتقال بلوک فعلی به پایین"
          onClick={() => blockAction('down')}
        >
          ↓ بلوک
        </Tool>
        <Tool label="کپی بلوک فعلی" onClick={() => blockAction('copy')}>
          کپی بلوک
        </Tool>
        <Tool label="حذف بلوک فعلی" onClick={() => blockAction('delete')}>
          حذف بلوک
        </Tool>
        <select
          aria-label="درج بلوک"
          className="editor-select"
          value=""
          onChange={e => {
            const cmd = commands.find(x => x.label === e.target.value);
            if (cmd) cmd.run(editor, editor.state.selection);
            e.target.value = '';
          }}
        >
          <option value="">+ درج بلوک</option>
          {commands.map(c => (
            <option key={c.label} value={c.label}>
              {c.label}
            </option>
          ))}
        </select>
        <Tool
          label="HTML"
          onClick={() => {
            setHtml(editor.getHTML());
            setHtmlOpen(true);
          }}
        >
          HTML
        </Tool>
        <Tool
          label={fullscreen ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه'}
          onClick={() => setFullscreen(!fullscreen)}
        >
          {fullscreen ? '↙' : '⛶'}
        </Tool>
      </div>
      {editor.isActive('table') && (
        <div className="editor-toolbar border-t">
          {[
            ['سطر بالا', () => editor.chain().focus().addRowBefore().run()],
            ['سطر پایین', () => editor.chain().focus().addRowAfter().run()],
            ['حذف سطر', () => editor.chain().focus().deleteRow().run()],
            ['ستون قبل', () => editor.chain().focus().addColumnBefore().run()],
            ['ستون بعد', () => editor.chain().focus().addColumnAfter().run()],
            ['حذف ستون', () => editor.chain().focus().deleteColumn().run()],
            [
              'عنوان جدول',
              () => editor.chain().focus().toggleHeaderRow().run(),
            ],
            ['ادغام', () => editor.chain().focus().mergeCells().run()],
            ['تقسیم', () => editor.chain().focus().splitCell().run()],
            ['حذف جدول', () => editor.chain().focus().deleteTable().run()],
          ].map(([label, action]) => (
            <Tool
              key={label as string}
              label={label as string}
              onClick={action as () => void}
            >
              {label as string}
            </Tool>
          ))}
        </div>
      )}
      <BubbleMenu
        editor={editor}
        shouldShow={({ editor: e, state }) =>
          !state.selection.empty &&
          !e.isActive('codeBlock') &&
          !e.isActive('media') &&
          !e.isActive('gallery') &&
          !e.isActive('faq') &&
          !e.isActive('barberSlider') &&
          !e.isActive('toc')
        }
      >
        <div className="editor-bubble">
          {basic}
          <Tool
            label="تیتر ۲"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            H2
          </Tool>
          <Tool
            label="تیتر ۳"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
          >
            H3
          </Tool>
          <Tool
            label="نقل قول"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            ❝
          </Tool>
          <Tool
            label="حذف قالب"
            onClick={() => editor.chain().focus().unsetAllMarks().run()}
          >
            پاک
          </Tool>
        </div>
      </BubbleMenu>
      <EditorContent editor={editor} className="editor-scroll" />
      <div className="border-t px-4 py-2 text-xs text-muted-foreground">
        {editor.storage.characterCount.words()} کلمه ·{' '}
        {editor.storage.characterCount.characters()} نویسه
      </div>
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent dir="rtl">
          <DialogTitle>درج یا ویرایش پیوند</DialogTitle>
          <DialogDescription>
            مسیر داخلی، HTTPS، mailto و tel مجاز است.
          </DialogDescription>
          <label className="text-sm">
            آدرس
            <Input
              dir="ltr"
              value={link}
              onChange={e => setLink(e.target.value)}
            />
          </label>
          <label className="text-sm">
            متن پیوند
            <Input
              value={linkText}
              onChange={e => setLinkText(e.target.value)}
            />
          </label>
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={newTab}
              onChange={e => setNewTab(e.target.checked)}
            />
            باز شدن در تب جدید
          </label>
          {linkError && (
            <p role="alert" className="text-red-600">
              {linkError}
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={applyLink}>اعمال</Button>
            <Button
              variant="outline"
              onClick={() => {
                editor
                  .chain()
                  .focus()
                  .setTextSelection(selection)
                  .extendMarkRange('link')
                  .unsetLink()
                  .run();
                setLinkOpen(false);
              }}
            >
              حذف پیوند
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={htmlOpen} onOpenChange={setHtmlOpen}>
        <DialogContent dir="rtl" className="sm:max-w-3xl">
          <DialogTitle>ویرایش HTML</DialogTitle>
          <DialogDescription>
            فقط ساختارهای پشتیبانی‌شده حفظ می‌شوند؛ اسکریپت و Embed دلخواه
            پشتیبانی نمی‌شوند.
          </DialogDescription>
          <textarea
            dir="ltr"
            className="min-h-72 w-full rounded border p-3 font-mono text-xs"
            value={html}
            onChange={e => setHtml(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              onClick={() => {
                editor.commands.setContent(html);
                setHtmlOpen(false);
              }}
            >
              اعمال
            </Button>
            <Button
              variant="outline"
              onClick={() => navigator.clipboard.writeText(html)}
            >
              کپی
            </Button>
            <Button variant="ghost" onClick={() => setHtmlOpen(false)}>
              انصراف
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </fieldset>
  );
}
